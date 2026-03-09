var DropApp = window.DropApp || (window.DropApp = {});

DropApp.createTransferManager = function createTransferManager(options) {
  var chunkSize = options.chunkSize || 64 * 1024;
  var transferStorageDir = options.transferStorageDir || 'drop-transfers';
  var showToast = options.showToast;
  var setTransfers = options.setTransfers;
  var setSendProgress = options.setSendProgress;
  var setReceiveProgress = options.setReceiveProgress;
  var setIsDownloading = options.setIsDownloading;
  var setDownloadProgress = options.setDownloadProgress;
  var incomingTransfersRef = options.incomingTransfersRef;
  var outgoingTransfersRef = options.outgoingTransfersRef;
  var transfersRef = options.transfersRef;
  var currentSendFileIdRef = options.currentSendFileIdRef;
  var currentReceiveFileIdRef = options.currentReceiveFileIdRef;
  var storageRootRef = options.storageRootRef;
  var storageWarningShownRef = options.storageWarningShownRef;

  function percentFromBytes(bytes, total) {
    if (!total || total <= 0) return 100;
    return Math.min(100, Math.round((bytes / total) * 100));
  }

  function updateReceiveUi(fileBuild) {
    var percent = percentFromBytes(fileBuild.receivedBytes, fileBuild.size);
    var eta = formatEta(fileBuild.startTime, percent);

    setReceiveProgress({ name: fileBuild.name, percent: percent, eta: eta });

    if (fileBuild.mode === 'download') {
      setDownloadProgress(
        'Receiving: ' +
          fileBuild.name +
          ' (' +
          percent +
          '%' +
          (eta ? ' · ' + eta + ' left' : '') +
          ')'
      );
    }
  }

  function clearReceiveUi(fileBuild) {
    if (currentReceiveFileIdRef.current === fileBuild.id) {
      currentReceiveFileIdRef.current = null;
      setReceiveProgress(null);
    }

    if (fileBuild.mode === 'download') {
      setIsDownloading(false);
      setDownloadProgress(null);
    }
  }

  function clearTransferHistory() {
    var transfers = transfersRef.current || [];

    for (var i = 0; i < transfers.length; i++) {
      if (transfers[i] && transfers[i].url) {
        try {
          URL.revokeObjectURL(transfers[i].url);
        } catch (err) {}
      }
    }

    transfersRef.current = [];
    setTransfers([]);
  }

  async function getTransferDirectory(createIfMissing) {
    if (!navigator.storage || !navigator.storage.getDirectory) return null;

    if (!storageRootRef.current) {
      storageRootRef.current = navigator.storage.getDirectory();
    }

    var root = await storageRootRef.current;
    return root.getDirectoryHandle(transferStorageDir, { create: createIfMissing !== false });
  }

  async function createIncomingStore(fileId, name) {
    if (!navigator.storage || !navigator.storage.getDirectory) {
      if (!storageWarningShownRef.current) {
        storageWarningShownRef.current = true;
        showToast('Disk-backed receive is unavailable in this browser. Falling back to memory.', 'info');
      }
      return { mode: 'memory', chunks: [] };
    }

    try {
      var dir = await getTransferDirectory(true);
      var tempName = fileId + '-' + sanitizeFileName(name);
      var fileHandle = await dir.getFileHandle(tempName, { create: true });
      var writable = await fileHandle.createWritable();

      return {
        mode: 'disk',
        dir: dir,
        tempName: tempName,
        fileHandle: fileHandle,
        writable: writable
      };
    } catch (err) {
      console.error('Failed to create disk-backed store:', err);
      if (!storageWarningShownRef.current) {
        storageWarningShownRef.current = true;
        showToast('Disk-backed receive failed. Falling back to memory.', 'info');
      }
      return { mode: 'memory', chunks: [] };
    }
  }

  async function discardIncomingStore(fileBuild) {
    if (!fileBuild || fileBuild.storageMode !== 'disk') return;

    var writable = fileBuild.writable;
    fileBuild.writable = null;

    try {
      if (writable) {
        await writable.abort();
      }
    } catch (err) {}

    try {
      var dir = fileBuild.dir || (await getTransferDirectory(false));
      if (dir) {
        await dir.removeEntry(fileBuild.tempName);
      }
    } catch (err) {}
  }

  async function cleanupConnectionTransfers(conn) {
    var incomingIds = Object.keys(incomingTransfersRef.current);
    for (var i = 0; i < incomingIds.length; i++) {
      var incoming = incomingTransfersRef.current[incomingIds[i]];
      if (incoming && incoming.conn === conn && !incoming.completed) {
        await cancelIncomingTransfer(incoming.id, null);
      }
    }

    var outgoingIds = Object.keys(outgoingTransfersRef.current);
    for (var j = 0; j < outgoingIds.length; j++) {
      var outgoing = outgoingTransfersRef.current[outgoingIds[j]];
      if (outgoing && outgoing.conn === conn && !outgoing.completed) {
        cancelOutgoingTransfer(outgoing.id, null);
      }
    }
  }

  async function prepareIncomingTransfer(conn, data, mode) {
    if (incomingTransfersRef.current[data.id]) {
      await cancelIncomingTransfer(data.id, null);
    }

    var store = await createIncomingStore(data.id, data.name);
    var fileBuild = {
      id: data.id,
      conn: conn,
      mode: mode,
      name: data.name,
      size: data.size || 0,
      totalChunks: data.totalChunks || 0,
      mimeType: data.mimeType || 'application/octet-stream',
      startTime: Date.now(),
      receivedBytes: 0,
      receivedChunks: 0,
      storageMode: store.mode,
      chunks: store.chunks || [],
      dir: store.dir || null,
      tempName: store.tempName || null,
      fileHandle: store.fileHandle || null,
      writable: store.writable || null,
      completed: false
    };

    incomingTransfersRef.current[data.id] = fileBuild;
    currentReceiveFileIdRef.current = data.id;
    setReceiveProgress({ name: data.name, percent: 0, eta: '' });

    if (mode === 'download') {
      setIsDownloading(true);
      setDownloadProgress('Preparing receive: ' + data.name);
    }

    conn.send({ type: 'file-ready', id: data.id });
  }

  async function appendIncomingChunk(conn, data) {
    var fileBuild = incomingTransfersRef.current[data.id];
    if (!fileBuild) return;

    try {
      if (fileBuild.storageMode === 'disk' && fileBuild.writable) {
        await fileBuild.writable.write(data.chunk);
      } else {
        fileBuild.chunks.push(data.chunk);
      }

      var chunkBytes =
        data.chunk && typeof data.chunk.byteLength === 'number'
          ? data.chunk.byteLength
          : data.chunk && typeof data.chunk.size === 'number'
            ? data.chunk.size
            : 0;

      fileBuild.receivedBytes = Math.min(fileBuild.size, fileBuild.receivedBytes + chunkBytes);
      fileBuild.receivedChunks += 1;
      updateReceiveUi(fileBuild);

      conn.send({
        type: 'file-ack',
        id: data.id,
        receivedBytes: fileBuild.receivedBytes,
        receivedChunks: fileBuild.receivedChunks
      });
    } catch (err) {
      console.error('Failed to write incoming chunk:', err);
      await cancelIncomingTransfer(data.id, 'Failed to write the incoming file.');
      try {
        conn.send({ type: 'file-cancel', id: data.id });
      } catch (sendErr) {}
    }
  }

  async function finalizeIncomingTransfer(fileId) {
    var fileBuild = incomingTransfersRef.current[fileId];
    if (!fileBuild || fileBuild.completed) return;

    fileBuild.completed = true;

    try {
      var transferRecord;

      if (fileBuild.storageMode === 'disk' && fileBuild.fileHandle) {
        if (fileBuild.writable) {
          await fileBuild.writable.close();
          fileBuild.writable = null;
        }

        transferRecord = {
          name: fileBuild.name,
          size: fileBuild.size,
          fileHandle: fileBuild.fileHandle,
          direction: 'received'
        };
      } else {
        var blob = new Blob(fileBuild.chunks, { type: fileBuild.mimeType });
        transferRecord = {
          name: fileBuild.name,
          size: fileBuild.size,
          url: URL.createObjectURL(blob),
          direction: 'received'
        };
      }

      setTransfers(function(prev) { return prev.concat([transferRecord]); });
      clearReceiveUi(fileBuild);

      if (fileBuild.mode === 'download') {
        await downloadTransferFile(transferRecord);
        history.replaceState(null, '', window.location.pathname + window.location.search);
        showToast('Downloaded: ' + fileBuild.name, 'success');
      } else {
        showToast('Received: ' + fileBuild.name, 'success');
      }
    } catch (err) {
      console.error('Failed to finalize incoming transfer:', err);
      clearReceiveUi(fileBuild);
      showToast('Failed to finalize the file.', 'error');
      await discardIncomingStore(fileBuild);
    }

    delete incomingTransfersRef.current[fileId];
  }

  async function cancelIncomingTransfer(fileId, message) {
    var fileBuild = incomingTransfersRef.current[fileId];
    if (!fileBuild) return;
    if (fileBuild.completed) return;

    delete incomingTransfersRef.current[fileId];
    clearReceiveUi(fileBuild);
    await discardIncomingStore(fileBuild);

    if (message) {
      showToast(message, 'error');
    }
  }

  function startOutgoingTransfer(conn, file, optionsArg) {
    var options = optionsArg || {};
    var fileId = Date.now().toString(36) + Math.random().toString(36).slice(2);
    var totalChunks = Math.ceil(file.size / chunkSize);

    outgoingTransfersRef.current[fileId] = {
      id: fileId,
      conn: conn,
      file: file,
      name: file.name,
      size: file.size,
      mimeType: file.type || 'application/octet-stream',
      totalChunks: totalChunks,
      nextIndex: 0,
      confirmedBytes: 0,
      startTime: Date.now(),
      awaitingAck: false,
      sending: false,
      completed: false,
      cancelled: false,
      trackProgress: !!options.trackProgress
    };

    if (options.trackProgress) {
      currentSendFileIdRef.current = fileId;
      setSendProgress({ name: file.name, percent: 0, eta: '' });
    }

    conn.send({
      type: 'file-meta',
      id: fileId,
      name: file.name,
      size: file.size,
      totalChunks: totalChunks,
      mimeType: file.type || 'application/octet-stream'
    });

    return fileId;
  }

  async function sendNextOutgoingChunk(fileId) {
    var transfer = outgoingTransfersRef.current[fileId];
    if (!transfer || transfer.cancelled || transfer.sending || transfer.awaitingAck) return;

    if (transfer.nextIndex >= transfer.totalChunks) {
      completeOutgoingTransfer(fileId);
      return;
    }

    transfer.sending = true;

    try {
      var start = transfer.nextIndex * chunkSize;
      var end = Math.min(start + chunkSize, transfer.size);
      var chunk = await transfer.file.slice(start, end).arrayBuffer();

      var freshTransfer = outgoingTransfersRef.current[fileId];
      if (!freshTransfer || freshTransfer.cancelled) return;

      freshTransfer.conn.send({
        type: 'file-chunk',
        id: fileId,
        index: freshTransfer.nextIndex,
        chunk: chunk
      });

      freshTransfer.nextIndex += 1;
      freshTransfer.awaitingAck = true;
    } catch (err) {
      console.error('Failed to send chunk:', err);
      cancelOutgoingTransfer(fileId, 'Failed to read the file for sending.');
      try {
        transfer.conn.send({ type: 'file-cancel', id: fileId });
      } catch (sendErr) {}
    } finally {
      var current = outgoingTransfersRef.current[fileId];
      if (current) {
        current.sending = false;
      }
    }
  }

  function completeOutgoingTransfer(fileId) {
    var transfer = outgoingTransfersRef.current[fileId];
    if (!transfer || transfer.completed || transfer.cancelled) return;

    transfer.completed = true;
    transfer.conn.send({ type: 'file-complete', id: fileId });

    if (transfer.trackProgress) {
      setSendProgress(null);
      currentSendFileIdRef.current = null;
      setTransfers(function(prev) {
        return prev.concat([{ name: transfer.name, size: transfer.size, direction: 'sent' }]);
      });
      showToast('Sent: ' + transfer.name, 'success');
    }

    delete outgoingTransfersRef.current[fileId];
  }

  function handleOutgoingAck(data) {
    var transfer = outgoingTransfersRef.current[data.id];
    if (!transfer || transfer.cancelled) return;

    transfer.awaitingAck = false;
    transfer.confirmedBytes = typeof data.receivedBytes === 'number' ? data.receivedBytes : transfer.confirmedBytes;

    if (transfer.trackProgress) {
      var percent = percentFromBytes(transfer.confirmedBytes, transfer.size);
      setSendProgress({
        name: transfer.name,
        percent: percent,
        eta: formatEta(transfer.startTime, percent)
      });
    }

    if (transfer.nextIndex >= transfer.totalChunks) {
      completeOutgoingTransfer(data.id);
      return;
    }

    sendNextOutgoingChunk(data.id);
  }

  function cancelOutgoingTransfer(fileId, message) {
    var transfer = outgoingTransfersRef.current[fileId];
    if (!transfer) return;
    if (transfer.completed) return;

    delete outgoingTransfersRef.current[fileId];

    if (currentSendFileIdRef.current === fileId) {
      currentSendFileIdRef.current = null;
      setSendProgress(null);
    }

    if (message) {
      showToast(message, 'error');
    }
  }

  async function handleData(conn, data, mode) {
    if (data.type === 'file-meta') {
      await prepareIncomingTransfer(conn, data, mode);
      return;
    }

    if (data.type === 'file-ready') {
      sendNextOutgoingChunk(data.id);
      return;
    }

    if (data.type === 'file-chunk') {
      await appendIncomingChunk(conn, data);
      return;
    }

    if (data.type === 'file-ack') {
      handleOutgoingAck(data);
      return;
    }

    if (data.type === 'file-complete') {
      await finalizeIncomingTransfer(data.id);
      return;
    }

    if (data.type === 'file-cancel') {
      if (incomingTransfersRef.current[data.id]) {
        await cancelIncomingTransfer(data.id, 'Transfer cancelled by peer.');
      }
      if (outgoingTransfersRef.current[data.id]) {
        cancelOutgoingTransfer(data.id, 'Transfer cancelled by peer.');
      }
    }
  }

  return {
    cancelIncomingTransfer: cancelIncomingTransfer,
    cancelOutgoingTransfer: cancelOutgoingTransfer,
    cleanupConnectionTransfers: cleanupConnectionTransfers,
    clearTransferHistory: clearTransferHistory,
    getTransferDirectory: getTransferDirectory,
    handleData: handleData,
    startOutgoingTransfer: startOutgoingTransfer
  };
};
