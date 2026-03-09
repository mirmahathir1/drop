/* Main App */
function App() {
  const [launchAction, setLaunchAction] = useState(function() {
    return parseDropLink(window.location.hash);
  });
  const [mode, setMode] = useState(function() {
    return launchAction ? 'receive' : 'home';
  });
  const [myId, setMyId] = useState('');
  const [peerId, setPeerId] = useState('');
  const [status, setStatus] = useState('idle');
  const [toast, setToast] = useState(null);
  const [transfers, setTransfers] = useState([]);
  const [dragging, setDragging] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sendProgress, setSendProgress] = useState(null);
  const [receiveProgress, setReceiveProgress] = useState(null);
  const [zipProgress, setZipProgress] = useState(null);
  const [preparedSend, setPreparedSend] = useState(null);
  const [receiveUiHidden, setReceiveUiHidden] = useState(function() {
    return !!launchAction;
  });

  const [hostedFiles, setHostedFiles] = useState([]);
  const [linkDragging, setLinkDragging] = useState(false);
  const [linkCopied, setLinkCopied] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDownloadSession, setIsDownloadSession] = useState(function() {
    return !!(launchAction && launchAction.type === 'download');
  });
  const [downloadProgress, setDownloadProgress] = useState(null);
  const [qrModal, setQrModal] = useState(null);
  const [scannerOpen, setScannerOpen] = useState(false);

  const peerRef = useRef(null);
  const connRef = useRef(null);
  const incomingTransfersRef = useRef({});
  const outgoingTransfersRef = useRef({});
  const transfersRef = useRef([]);
  const currentSendFileIdRef = useRef(null);
  const currentReceiveFileIdRef = useRef(null);
  const hostedFilesRef = useRef([]);
  const storageRootRef = useRef(null);
  const storageWarningShownRef = useRef(false);
  const zipTaskIdRef = useRef(0);
  const zipBusyRef = useRef(false);
  const prepareSendTaskIdRef = useRef(0);
  const statusRef = useRef(status);
  const isDownloadingRef = useRef(isDownloading);
  const qrModalRef = useRef(qrModal);
  const modeRef = useRef(mode);
  const preparedSendRef = useRef(preparedSend);

  const CHUNK_SIZE = 64 * 1024;
  const TRANSFER_STORAGE_DIR = 'drop-transfers';

  transfersRef.current = transfers;
  hostedFilesRef.current = hostedFiles;
  statusRef.current = status;
  isDownloadingRef.current = isDownloading;
  qrModalRef.current = qrModal;
  modeRef.current = mode;
  preparedSendRef.current = preparedSend;

  function showToast(message, type) {
    setToast({ message: message, type: type || 'info', key: Date.now() });
  }

  function stopActiveScannerStreams() {
    var scannerVideos = document.querySelectorAll('video[data-drop-scanner="true"]');

    Array.prototype.forEach.call(scannerVideos, function(video) {
      var stream = video && video.srcObject;
      var tracks = stream && typeof stream.getTracks === 'function'
        ? stream.getTracks()
        : [];

      for (var i = 0; i < tracks.length; i++) {
        tracks[i].stop();
      }

      if (video) {
        video.srcObject = null;
      }
    });
  }

  var selectionController = DropApp.createSelectionController({
    showToast: showToast,
    setZipProgress: setZipProgress,
    zipTaskIdRef: zipTaskIdRef,
    zipBusyRef: zipBusyRef
  });

  var transferController = DropApp.createTransferManager({
    chunkSize: CHUNK_SIZE,
    transferStorageDir: TRANSFER_STORAGE_DIR,
    showToast: showToast,
    setTransfers: setTransfers,
    setSendProgress: setSendProgress,
    setReceiveProgress: setReceiveProgress,
    setIsDownloading: setIsDownloading,
    setDownloadProgress: setDownloadProgress,
    incomingTransfersRef: incomingTransfersRef,
    outgoingTransfersRef: outgoingTransfersRef,
    transfersRef: transfersRef,
    currentSendFileIdRef: currentSendFileIdRef,
    currentReceiveFileIdRef: currentReceiveFileIdRef,
    storageRootRef: storageRootRef,
    storageWarningShownRef: storageWarningShownRef
  });

  var peerController = DropApp.createPeerController({
    getMyId: function() { return myId; },
    getStatus: function() { return statusRef.current; },
    getIsDownloading: function() { return isDownloadingRef.current; },
    getQrModal: function() { return qrModalRef.current; },
    showToast: showToast,
    setMyId: setMyId,
    setPeerId: setPeerId,
    setStatus: setStatus,
    setReceiveProgress: setReceiveProgress,
    setIsDownloading: setIsDownloading,
    setIsDownloadSession: setIsDownloadSession,
    setDownloadProgress: setDownloadProgress,
    setQrModal: setQrModal,
    setScannerOpen: setScannerOpen,
    peerRef: peerRef,
    connRef: connRef,
    hostedFilesRef: hostedFilesRef,
    currentReceiveFileIdRef: currentReceiveFileIdRef,
    cleanupConnectionTransfers: transferController.cleanupConnectionTransfers,
    handleData: transferController.handleData,
    startOutgoingTransfer: transferController.startOutgoingTransfer,
    onDirectConnectionOpen: function(conn, connectionMode) {
      var pending = preparedSendRef.current;

      if (connectionMode !== 'direct' || modeRef.current !== 'send') {
        return;
      }

      if (!pending || !pending.file) {
        showToast('Connected, but no file is ready to send yet.', 'info');
        return;
      }

      transferController.startOutgoingTransfer(conn, pending.file, { trackProgress: true });
    }
  });

  useEffect(function() {
    var cancelled = false;

    (async function() {
      try {
        var dir = await transferController.getTransferDirectory(false);
        if (!dir || typeof dir.values !== 'function') return;

        for await (var entry of dir.values()) {
          if (cancelled) return;
          try {
            await dir.removeEntry(entry.name, { recursive: entry.kind === 'directory' });
          } catch (err) {}
        }
      } catch (err) {}
    })();

    return function() {
      cancelled = true;
    };
  }, []);

  useEffect(function() {
    return peerController.initializePeer();
  }, []);

  useEffect(function() {
    function syncLaunchAction() {
      var nextAction = parseDropLink(window.location.hash);

      setLaunchAction(nextAction);
      if (nextAction) {
        stopActiveScannerStreams();
        setScannerOpen(false);
        setMode('receive');
        setReceiveUiHidden(true);
        setIsDownloadSession(nextAction.type === 'download');

        if (nextAction.type === 'connect') {
          peerController.startDirectConnection(nextAction.id);
        } else if (nextAction.type === 'download') {
          peerController.startHostedDownload(nextAction.id, { downloadSession: false, fileId: nextAction.fileId });
        }

        history.replaceState(null, '', window.location.pathname + window.location.search);
      } else {
        setIsDownloadSession(false);
      }
    }

    window.addEventListener('hashchange', syncLaunchAction);
    return function() {
      window.removeEventListener('hashchange', syncLaunchAction);
    };
  }, []);

  useEffect(function() {
    if (mode === 'receive' && (isDownloading || !!receiveProgress)) {
      setReceiveUiHidden(true);
    }
  }, [mode, isDownloading, receiveProgress]);

  useEffect(function() {
    if (mode === 'receive' && status === 'idle' && !isDownloading && !receiveProgress) {
      setReceiveUiHidden(false);
    }
  }, [mode, status, isDownloading, receiveProgress]);

  function requestConnection() {
    peerController.startDirectConnection(peerId);
  }

  function sendFile(file) {
    var conn = connRef.current;
    if (!conn || !conn.open) {
      showToast('Not connected to a peer.', 'error');
      return;
    }
    transferController.startOutgoingTransfer(conn, file, { trackProgress: true });
  }

  function resetPreparedSend() {
    prepareSendTaskIdRef.current += 1;
    setDragging(false);
    setPreparedSend(null);

    if (zipBusyRef.current) {
      zipTaskIdRef.current += 1;
      zipBusyRef.current = false;
      setZipProgress(null);
    }
  }

  async function prepareSendSelection(selection) {
    if (currentSendFileIdRef.current) {
      showToast('Wait for the current send to finish before preparing another file.', 'info');
      return;
    }

    var requestId = ++prepareSendTaskIdRef.current;
    var normalized = selection && selection.entries ? selection : selectionController.buildSelectionFromFileList(selection);
    var selectionFile = await selectionController.buildSelectionFile(normalized, 'send');
    if (prepareSendTaskIdRef.current !== requestId) return;
    if (!selectionFile || !selectionFile.file) return;

    setPreparedSend({
      file: selectionFile.file,
      sourceCount: selectionFile.sourceCount,
      folderCount: selectionFile.folderCount,
      createdAt: Date.now()
    });
    setMode('send');

    if (connRef.current && connRef.current.open) {
      sendFile(selectionFile.file);
      return;
    }

    showToast('Send link ready. Open it on the receiving device.', 'success');
  }

  async function prepareSelectedFiles(fileList) {
    await prepareSendSelection(selectionController.buildSelectionFromFileList(fileList));
  }

  async function prepareSelectedFolder(fileList) {
    await prepareSendSelection(selectionController.buildSelectionFromFileList(fileList));
  }

  async function prepareDroppedSelection(dataTransfer) {
    var selection = await selectionController.buildSelectionFromDrop(dataTransfer);
    if (!selection) return;
    await prepareSendSelection(selection);
  }

  function openPicker(inputId, e) {
    if (e) {
      e.stopPropagation();
    }

    if (zipBusyRef.current) return;

    var input = document.getElementById(inputId);
    if (input) {
      input.click();
    }
  }

  function onDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    setDragging(true);
  }

  function onDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
  }

  async function onDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    await prepareDroppedSelection(e.dataTransfer);
  }

  async function onFileSelect(e) {
    await prepareSelectedFiles(e.target.files);
    e.target.value = '';
  }

  async function onFolderSelect(e) {
    await prepareSelectedFolder(e.target.files);
    e.target.value = '';
  }

  async function copyId() {
    var link = buildConnectLink(myId);
    try {
      await copyTextToClipboard(link);
      setCopied(true);
      setTimeout(function() { setCopied(false); }, 2000);
      showToast('Send link copied.', 'success');
    } catch (err) {
      console.error('Failed to copy direct connect link:', err);
      showToast('Could not copy the send link.', 'error');
    }
  }

  function clearPreparedSend() {
    resetPreparedSend();
  }

  function openSendMode() {
    stopActiveScannerStreams();
    setReceiveUiHidden(false);
    setMode('send');
  }

  function openReceiveMode() {
    setLaunchAction(null);
    setReceiveUiHidden(false);
    setMode('receive');
  }

  function goHome() {
    setLaunchAction(null);
    stopActiveScannerStreams();
    setReceiveUiHidden(false);
    if (modeRef.current === 'send' && !currentSendFileIdRef.current) {
      resetPreparedSend();
    }
    setMode('home');
  }

  function handleReceiveScan(value) {
    peerController.handleScannerResult(value);
  }

  function disconnect() {
    if (connRef.current) connRef.current.close();
    connRef.current = null;
    setStatus('idle');
    setPeerId('');
  }

  function cancelSend() {
    var fileId = currentSendFileIdRef.current;
    if (!fileId) return;

    var transfer = outgoingTransfersRef.current[fileId];
    if (transfer && transfer.conn && transfer.conn.open) {
      transfer.conn.send({ type: 'file-cancel', id: fileId });
    }

    transferController.cancelOutgoingTransfer(fileId, 'Send cancelled.');
  }

  function cancelReceive() {
    var fileId = currentReceiveFileIdRef.current;
    if (!fileId) return;

    var fileBuild = incomingTransfersRef.current[fileId];
    if (fileBuild && fileBuild.conn && fileBuild.conn.open) {
      fileBuild.conn.send({ type: 'file-cancel', id: fileId });
    }

    transferController.cancelIncomingTransfer(fileId, 'Receive cancelled.');
    setReceiveUiHidden(false);
  }

  function createHostedFileId() {
    var id = '';

    do {
      id = Math.random().toString(36).slice(2, 8);
    } while (!id || hostedFilesRef.current.some(function(file) { return file.id === id; }));

    return id;
  }

  function hostFile(file, options) {
    var settings = options || {};
    var id = createHostedFileId();
    var link = buildDownloadLink(myId, id);
    var sourceCount = settings.sourceCount || 1;
    var folderCount = settings.folderCount || 0;

    setHostedFiles(function(prev) {
      return [{ id: id, file: file, link: link, sourceCount: sourceCount, folderCount: folderCount }].concat(prev);
    });

    showToast((sourceCount > 1 || folderCount > 0 ? 'Zip link created: ' : 'Link created for: ') + file.name, 'success');
  }

  function removeHostedFile(id) {
    setHostedFiles(function(prev) {
      return prev.filter(function(file) { return file.id !== id; });
    });
  }

  async function copyLink(link, id) {
    try {
      await copyTextToClipboard(link);
      setLinkCopied(id);
      setTimeout(function() { setLinkCopied(null); }, 2000);
      showToast('Link copied.', 'success');
    } catch (err) {
      console.error('Failed to copy hosted link:', err);
      showToast('Could not copy the link.', 'error');
    }
  }

  function onLinkDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    setLinkDragging(true);
  }

  function onLinkDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    setLinkDragging(false);
  }

  async function hostSelection(selection) {
    var normalized = selection && selection.entries ? selection : selectionController.buildSelectionFromFileList(selection);
    var selectionFile = await selectionController.buildSelectionFile(normalized, 'link');
    if (!selectionFile || !selectionFile.file) return;
    hostFile(selectionFile.file, {
      sourceCount: selectionFile.sourceCount,
      folderCount: selectionFile.folderCount
    });
  }

  async function hostSelectedFiles(fileList) {
    await hostSelection(selectionController.buildSelectionFromFileList(fileList));
  }

  async function hostSelectedFolder(fileList) {
    await hostSelection(selectionController.buildSelectionFromFileList(fileList));
  }

  async function hostDroppedSelection(dataTransfer) {
    var selection = await selectionController.buildSelectionFromDrop(dataTransfer);
    if (!selection) return;
    await hostSelection(selection);
  }

  async function onLinkDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    setLinkDragging(false);
    await hostDroppedSelection(e.dataTransfer);
  }

  async function onLinkFileSelect(e) {
    await hostSelectedFiles(e.target.files);
    e.target.value = '';
  }

  async function onLinkFolderSelect(e) {
    await hostSelectedFolder(e.target.files);
    e.target.value = '';
  }

  function markTransferDownloaded(transfer) {
    if (!transfer) return;

    setTransfers(function(prev) {
      return prev.map(function(item) {
        var sameTransfer =
          (transfer.transferId && item.transferId === transfer.transferId) ||
          item === transfer ||
          (
            item.name === transfer.name &&
            item.size === transfer.size &&
            item.direction === transfer.direction
          );

        return sameTransfer
          ? Object.assign({}, item, { isDownloaded: true })
          : item;
      });
    });
  }

  return h(DropApp.AppView, {
    mode: mode,
    myId: myId,
    status: status,
    toast: toast,
    transfers: transfers,
    dragging: dragging,
    copied: copied,
    sendProgress: sendProgress,
    receiveProgress: receiveProgress,
    zipProgress: zipProgress,
    isDownloading: isDownloading,
    isDownloadSession: isDownloadSession,
    receiveLaunchType: launchAction ? launchAction.type : '',
    downloadProgress: downloadProgress,
    preparedSend: preparedSend,
    receiveUiHidden: receiveUiHidden,
    sendLink: myId ? buildConnectLink(myId) : '',
    isPackagingZip: !!zipProgress,
    connectedPeerId: peerId || (connRef.current && connRef.current.peer) || '-',
    openSendMode: openSendMode,
    openReceiveMode: openReceiveMode,
    goHome: goHome,
    handleReceiveScan: handleReceiveScan,
    scannerOpen: scannerOpen,
    setScannerOpen: setScannerOpen,
    copyId: copyId,
    clearPreparedSend: clearPreparedSend,
    openPicker: openPicker,
    onDragOver: onDragOver,
    onDragLeave: onDragLeave,
    onDrop: onDrop,
    onFileSelect: onFileSelect,
    onFolderSelect: onFolderSelect,
    disconnect: disconnect,
    cancelSend: cancelSend,
    cancelReceive: cancelReceive,
    markTransferDownloaded: markTransferDownloaded,
    clearToast: function() { setToast(null); }
  });
}

var root = ReactDOM.createRoot(document.getElementById('root'));
root.render(h(App));
