/* Main App */
function App() {
  const [myId, setMyId] = useState('');
  const [peerId, setPeerId] = useState('');
  const [status, setStatus] = useState('idle');
  const [toast, setToast] = useState(null);
  const [pendingRequest, setPendingRequest] = useState(null);
  const [transfers, setTransfers] = useState([]);
  const [dragging, setDragging] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sendProgress, setSendProgress] = useState(null);
  const [receiveProgress, setReceiveProgress] = useState(null);

  const [hostedFiles, setHostedFiles] = useState([]);
  const [linkDragging, setLinkDragging] = useState(false);
  const [linkCopied, setLinkCopied] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDownloadSession, setIsDownloadSession] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(null);

  const peerRef = useRef(null);
  const connRef = useRef(null);
  const incomingTransfersRef = useRef({});
  const outgoingTransfersRef = useRef({});
  const currentSendFileIdRef = useRef(null);
  const currentReceiveFileIdRef = useRef(null);
  const hostedFilesRef = useRef([]);
  const storageRootRef = useRef(null);
  const storageWarningShownRef = useRef(false);

  const CHUNK_SIZE = 64 * 1024;
  const TRANSFER_STORAGE_DIR = 'drop-transfers';

  function showToast(message, type) {
    setToast({ message: message, type: type || 'info', key: Date.now() });
  }

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

  async function getTransferDirectory(createIfMissing) {
    if (!navigator.storage || !navigator.storage.getDirectory) return null;

    if (!storageRootRef.current) {
      storageRootRef.current = navigator.storage.getDirectory();
    }

    var root = await storageRootRef.current;
    return root.getDirectoryHandle(TRANSFER_STORAGE_DIR, { create: createIfMissing !== false });
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

  function startOutgoingTransfer(conn, file, options) {
    var settings = options || {};
    var fileId = Date.now().toString(36) + Math.random().toString(36).slice(2);
    var totalChunks = Math.ceil(file.size / CHUNK_SIZE);

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
      trackProgress: !!settings.trackProgress
    };

    if (settings.trackProgress) {
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
      var start = transfer.nextIndex * CHUNK_SIZE;
      var end = Math.min(start + CHUNK_SIZE, transfer.size);
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
      return;
    }

    if (data.type === 'accept') {
      setStatus('connected');
      showToast('Connection accepted!', 'success');
      return;
    }

    if (data.type === 'reject') {
      setStatus('idle');
      connRef.current = null;
      showToast('Connection declined.', 'error');
    }
  }

  function setupConn(conn, mode) {
    connRef.current = conn;
    conn.on('open', function() {
      setStatus('connected');
      showToast('Connected! You can now send files.', 'success');
    });
    conn.on('data', function(data) { handleData(conn, data, mode); });
    conn.on('close', function() {
      cleanupConnectionTransfers(conn);
      setStatus('idle');
      connRef.current = null;
      showToast('Peer disconnected.', 'error');
    });
    conn.on('error', function(err) {
      console.error('Connection error:', err);
      showToast('Connection error.', 'error');
    });
  }

  useEffect(function() {
    hostedFilesRef.current = hostedFiles;
  }, [hostedFiles]);

  useEffect(function() {
    var cancelled = false;

    (async function() {
      try {
        var dir = await getTransferDirectory(false);
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

  /* Initialize PeerJS */
  useEffect(function() {
    var hash = window.location.hash;
    var dlMatch = hash.match(/^#dl=(.+)$/);
    var connectMatch = hash.match(/^#connect=(.+)$/);
    var id = generateId();
    var peer = new Peer(id);

    peer.on('open', function(assignedId) {
      setMyId(assignedId);

      if (connectMatch) {
        var targetId = connectMatch[1];
        setPeerId(targetId);
        setStatus('connecting');
        var conn = peer.connect(targetId, { metadata: { type: 'request', fromId: assignedId }, reliable: true });
        setupConn(conn, 'direct');
        history.replaceState(null, '', window.location.pathname + window.location.search);
      }

      if (dlMatch) {
        var hostId = dlMatch[1];
        setIsDownloading(true);
        setIsDownloadSession(true);
        setDownloadProgress('Connecting to host...');
        var dlConn = peer.connect(hostId, { metadata: { type: 'download-request' }, reliable: true });

        dlConn.on('open', function() {
          setDownloadProgress('Connected. Waiting for file...');
        });

        dlConn.on('data', function(data) {
          handleData(dlConn, data, 'download');
        });

        dlConn.on('error', function(err) {
          console.error('Download connection error:', err);
          cleanupConnectionTransfers(dlConn);
          setReceiveProgress(null);
          setDownloadProgress(null);
          setIsDownloading(false);
          showToast('Failed to connect to host. The link may have expired.', 'error');
        });

        dlConn.on('close', function() {
          cleanupConnectionTransfers(dlConn);
          if (currentReceiveFileIdRef.current) {
            setReceiveProgress(null);
            showToast('Download interrupted.', 'error');
          }
          setDownloadProgress(null);
          setIsDownloading(false);
        });
      }
    });

    peer.on('connection', function(conn) {
      if (conn.metadata && conn.metadata.type === 'download-request') {
        conn.on('open', function() {
          var files = hostedFilesRef.current;
          if (files.length > 0) {
            startOutgoingTransfer(conn, files[0].file, { trackProgress: false });
          }
        });

        conn.on('data', function(data) {
          handleData(conn, data, 'hosted-source');
        });

        conn.on('close', function() {
          cleanupConnectionTransfers(conn);
        });

        conn.on('error', function(err) {
          console.error('Hosted download error:', err);
          cleanupConnectionTransfers(conn);
        });
      } else if (conn.metadata && conn.metadata.type === 'request') {
        setPendingRequest({ fromId: conn.metadata.fromId, conn: conn });
      }
    });

    peer.on('error', function(err) {
      console.error('Peer error:', err);
      if (err.type === 'peer-unavailable') {
        showToast('Peer not found. Check the ID and try again.', 'error');
        setStatus('idle');
        setIsDownloading(false);
        setDownloadProgress(null);
      }
    });

    peerRef.current = peer;

    return function() {
      peer.destroy();
    };
  }, []);

  function requestConnection() {
    if (!peerId.trim() || !peerRef.current) return;
    setStatus('connecting');
    var conn = peerRef.current.connect(peerId.trim(), { metadata: { type: 'request', fromId: myId }, reliable: true });
    setupConn(conn, 'direct');
  }

  function acceptRequest() {
    if (!pendingRequest) return;
    var conn = pendingRequest.conn;
    setupConn(conn, 'direct');
    conn.on('open', function() {
      conn.send({ type: 'accept' });
      setStatus('connected');
    });
    if (conn.open) {
      conn.send({ type: 'accept' });
      setStatus('connected');
    }
    setPendingRequest(null);
  }

  function rejectRequest() {
    if (!pendingRequest) return;
    var conn = pendingRequest.conn;
    conn.on('open', function() { conn.send({ type: 'reject' }); });
    if (conn.open) conn.send({ type: 'reject' });
    setPendingRequest(null);
  }

  function sendFile(file) {
    var conn = connRef.current;
    if (!conn || !conn.open) {
      showToast('Not connected to a peer.', 'error');
      return;
    }
    startOutgoingTransfer(conn, file, { trackProgress: true });
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

  function onDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    var files = e.dataTransfer.files;
    for (var i = 0; i < files.length; i++) sendFile(files[i]);
  }

  function onFileSelect(e) {
    var files = e.target.files;
    for (var i = 0; i < files.length; i++) sendFile(files[i]);
    e.target.value = '';
  }

  function copyId() {
    var link = window.location.origin + window.location.pathname + '#connect=' + myId;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(function() { setCopied(false); }, 2000);
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

    cancelOutgoingTransfer(fileId, 'Send cancelled.');
  }

  function cancelReceive() {
    var fileId = currentReceiveFileIdRef.current;
    if (!fileId) return;

    var fileBuild = incomingTransfersRef.current[fileId];
    if (fileBuild && fileBuild.conn && fileBuild.conn.open) {
      fileBuild.conn.send({ type: 'file-cancel', id: fileId });
    }

    cancelIncomingTransfer(fileId, 'Receive cancelled.');
  }

  function hostFile(file) {
    var id = Date.now().toString(36) + Math.random().toString(36).slice(2);
    var link = window.location.origin + window.location.pathname + '#dl=' + myId;
    setHostedFiles(function(prev) { return [{ id: id, file: file, link: link }].concat(prev); });
    showToast('Link created for: ' + file.name, 'success');
  }

  function removeHostedFile(id) {
    setHostedFiles(function(prev) {
      return prev.filter(function(f) { return f.id !== id; });
    });
  }

  function copyLink(link, id) {
    navigator.clipboard.writeText(link);
    setLinkCopied(id);
    setTimeout(function() { setLinkCopied(null); }, 2000);
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

  function onLinkDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    setLinkDragging(false);
    var files = e.dataTransfer.files;
    for (var i = 0; i < files.length; i++) hostFile(files[i]);
  }

  function onLinkFileSelect(e) {
    var files = e.target.files;
    for (var i = 0; i < files.length; i++) hostFile(files[i]);
    e.target.value = '';
  }

  /* Render */
  return h('div', { style: { maxWidth: 520, margin: '0 auto', padding: '60px 20px 80px', minHeight: '100vh' } },

    /* Header */
    h('div', { style: { textAlign:'center', marginBottom:48, animation:'fadeUp 0.5s ease' } },
      h('div', { style: { fontFamily:"'DM Mono', monospace", fontSize:11, fontWeight:400, letterSpacing:3, textTransform:'uppercase', color:'var(--accent)', marginBottom:12 } }, 'peer-to-peer'),
      h('h1', { style: { fontSize:48, fontWeight:700, letterSpacing:'-0.03em', lineHeight:1, marginBottom:10 } },
        'drop', h('span', { style: { color:'var(--accent)' } }, '.')
      ),
      h('p', { style: { color:'var(--text-dim)', fontSize:15, fontWeight:300 } }, 'Send files directly between browsers. No server, no upload.')
    ),

    /* Your ID card */
    !isDownloadSession && h('div', { style: { background:'var(--surface)', border:'1px solid var(--border)', borderRadius:16, padding:'22px 26px', marginBottom:20, animation:'fadeUp 0.5s ease 0.1s both' } },
      h('div', { style: { fontFamily:"'DM Mono', monospace", fontSize:11, color:'var(--text-dim)', letterSpacing:1, textTransform:'uppercase', marginBottom:10 } }, 'Your ID'),
      h('div', { style: { display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' } },
        h('div', { style: { flex:'1 1 auto', fontFamily:"'DM Mono', monospace", fontSize:20, fontWeight:500, color: myId ? 'var(--text)' : 'var(--text-dim)', animation: myId ? 'none' : 'pulse 1.5s infinite' } }, myId || 'connecting...'),
        myId && h('button', {
          onClick: copyId,
          style: { display:'flex', alignItems:'center', justifyContent:'center', gap:6, padding:'7px 14px', borderRadius:8, border:'1px solid var(--border)', background:'var(--surface-2)', color: copied ? 'var(--accent)' : 'var(--text-dim)', cursor:'pointer', fontFamily:"'DM Mono', monospace", fontSize:12, transition:'all 0.2s', whiteSpace:'nowrap' },
          onMouseEnter: function(e) { e.currentTarget.style.borderColor='var(--border-active)'; },
          onMouseLeave: function(e) { e.currentTarget.style.borderColor='var(--border)'; }
        }, copied ? [h(CheckIcon, { key:'ci' }), ' copied'] : [h(LinkIcon, { key:'li' }), ' copy direct connect link'])
      )
    ),

    /* Connect section */
    !isDownloadSession && status !== 'connected' && h('div', { style: { background:'var(--surface)', border:'1px solid var(--border)', borderRadius:16, padding:'22px 26px', marginBottom:20, animation:'fadeUp 0.5s ease 0.2s both' } },
      h('div', { style: { fontFamily:"'DM Mono', monospace", fontSize:11, color:'var(--text-dim)', letterSpacing:1, textTransform:'uppercase', marginBottom:14 } }, 'Connect to Peer'),
      h('div', { style: { display:'flex', gap:10, flexWrap:'wrap' } },
        h('input', {
          type: 'text', value: peerId,
          onChange: function(e) { setPeerId(e.target.value); },
          onKeyDown: function(e) { if (e.key === 'Enter') requestConnection(); },
          placeholder: 'enter peer id...',
          disabled: status === 'connecting',
          style: { flex:'1 1 180px', minWidth:0, padding:'11px 16px', borderRadius:10, border:'1px solid var(--border)', background:'var(--bg)', color:'var(--text)', fontFamily:"'DM Mono', monospace", fontSize:14, outline:'none', transition:'border-color 0.2s', boxSizing:'border-box' },
          onFocus: function(e) { e.target.style.borderColor='var(--accent-dim)'; },
          onBlur: function(e) { e.target.style.borderColor='var(--border)'; }
        }),
        h('button', {
          onClick: requestConnection,
          disabled: !peerId.trim() || status === 'connecting',
          style: { flex:'1 1 auto', padding:'11px 24px', borderRadius:10, border:'1px solid var(--accent)', background: status === 'connecting' ? 'var(--accent-dim)' : 'var(--accent)', color:'#0a0a0c', fontFamily:"'Outfit', sans-serif", fontSize:14, fontWeight:600, cursor: status === 'connecting' ? 'wait' : 'pointer', transition:'all 0.2s', whiteSpace:'nowrap', boxSizing:'border-box' },
          onMouseEnter: function(e) { if (status !== 'connecting') e.target.style.background='#5dd4a6'; },
          onMouseLeave: function(e) { if (status !== 'connecting') e.target.style.background='var(--accent)'; }
        }, status === 'connecting' ? 'connecting...' : 'connect')
      )
    ),

    /* Connected state */
    status === 'connected' && h(React.Fragment, null,
      h('div', { style: { background:'var(--surface)', border:'1px solid var(--accent-dim)', borderRadius:16, padding:'18px 26px', marginBottom:20, animation:'fadeUp 0.3s ease', display:'flex', alignItems:'center', justifyContent:'space-between' } },
        h('div', { style: { display:'flex', alignItems:'center', gap:12 } },
          h('div', { style: { width:10, height:10, borderRadius:'50%', background:'var(--accent)', animation:'ripple 2s infinite' } }),
          h('div', null,
            h('div', { style: { fontFamily:"'DM Mono', monospace", fontSize:13, color:'var(--text-dim)' } }, 'connected to'),
            h('div', { style: { fontFamily:"'DM Mono', monospace", fontSize:15, fontWeight:500, color:'var(--accent)' } }, peerId || (connRef.current && connRef.current.peer) || '-')
          )
        ),
        h('button', {
          onClick: disconnect,
          style: { padding:'7px 14px', borderRadius:8, border:'1px solid var(--border)', background:'var(--surface-2)', color:'var(--text-dim)', cursor:'pointer', fontFamily:"'DM Mono', monospace", fontSize:12, display:'flex', alignItems:'center', gap:6, transition:'all 0.2s' },
          onMouseEnter: function(e) { e.currentTarget.style.borderColor='var(--danger)'; e.currentTarget.style.color='var(--danger)'; },
          onMouseLeave: function(e) { e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.color='var(--text-dim)'; }
        }, h(XIcon), ' disconnect')
      ),

      /* Drop zone */
      h('div', {
        onDragOver: onDragOver, onDragLeave: onDragLeave, onDrop: onDrop,
        onClick: function() { document.getElementById('file-input').click(); },
        style: { border: '2px dashed ' + (dragging ? 'var(--accent)' : 'var(--border)'), borderRadius:20, padding:'50px 30px', textAlign:'center', cursor:'pointer', transition:'all 0.3s', background: dragging ? 'var(--accent-glow)' : 'var(--surface)', marginBottom:24, animation:'fadeUp 0.4s ease' },
        onMouseEnter: function(e) { if (!dragging) { e.currentTarget.style.borderColor='var(--border-active)'; e.currentTarget.style.background='var(--surface-2)'; } },
        onMouseLeave: function(e) { if (!dragging) { e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.background='var(--surface)'; } }
      },
        h('div', { style: { marginBottom:14 } }, h(UploadIcon, { stroke: dragging ? 'var(--accent)' : 'var(--text-dim)', style: { transition:'all 0.3s' } })),
        h('div', { style: { fontSize:16, fontWeight:500, marginBottom:6, color: dragging ? 'var(--accent)' : 'var(--text)' } }, dragging ? 'Drop to send' : 'Drag & drop files here'),
        h('div', { style: { color:'var(--text-dim)', fontSize:13, fontWeight:300 } }, 'or click to browse'),
        h('input', { id: 'file-input', type: 'file', multiple: true, style: { display:'none' }, onChange: onFileSelect })
      )
    ),

    /* Send progress */
    sendProgress && h('div', { style: { background:'var(--surface)', border:'1px solid rgba(99,102,241,0.4)', borderRadius:14, padding:'16px 22px', marginBottom:20, animation:'fadeUp 0.3s ease' } },
      h('div', { style: { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 } },
        h('div', { style: { fontFamily:"'DM Mono', monospace", fontSize:12, color:'var(--text-dim)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1, minWidth:0 } }, '↑ Sending: ' + sendProgress.name),
        h('div', { style: { display:'flex', alignItems:'center', gap:10, flexShrink:0 } },
          h('div', { style: { fontFamily:"'DM Mono', monospace", fontSize:12, color:'#818cf8' } }, sendProgress.percent + '%' + (sendProgress.eta ? ' · ' + sendProgress.eta + ' left' : '')),
          h('button', {
            onClick: cancelSend, title: 'Cancel send',
            style: { width:28, height:28, borderRadius:7, border:'1px solid var(--border)', background:'var(--surface-2)', color:'var(--text-dim)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.2s', flexShrink:0, padding:0 },
            onMouseEnter: function(e) { e.currentTarget.style.borderColor='var(--danger)'; e.currentTarget.style.color='var(--danger)'; },
            onMouseLeave: function(e) { e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.color='var(--text-dim)'; }
          }, h(XIcon))
        )
      ),
      h('div', { style: { height:6, borderRadius:3, background:'var(--surface-2)', overflow:'hidden' } },
        h('div', { style: { height:'100%', borderRadius:3, background:'linear-gradient(90deg, #818cf8, #a78bfa)', width: sendProgress.percent + '%', transition:'width 0.15s ease' } })
      )
    ),

    /* Receive progress */
    receiveProgress && h('div', { style: { background:'var(--surface)', border:'1px solid var(--accent-dim)', borderRadius:14, padding:'16px 22px', marginBottom:20, animation:'fadeUp 0.3s ease' } },
      h('div', { style: { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 } },
        h('div', { style: { fontFamily:"'DM Mono', monospace", fontSize:12, color:'var(--text-dim)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1, minWidth:0 } }, '↓ Receiving: ' + receiveProgress.name),
        h('div', { style: { display:'flex', alignItems:'center', gap:10, flexShrink:0 } },
          h('div', { style: { fontFamily:"'DM Mono', monospace", fontSize:12, color:'var(--accent)' } }, receiveProgress.percent + '%' + (receiveProgress.eta ? ' · ' + receiveProgress.eta + ' left' : '')),
          h('button', {
            onClick: cancelReceive, title: 'Cancel receive',
            style: { width:28, height:28, borderRadius:7, border:'1px solid var(--border)', background:'var(--surface-2)', color:'var(--text-dim)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.2s', flexShrink:0, padding:0 },
            onMouseEnter: function(e) { e.currentTarget.style.borderColor='var(--danger)'; e.currentTarget.style.color='var(--danger)'; },
            onMouseLeave: function(e) { e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.color='var(--text-dim)'; }
          }, h(XIcon))
        )
      ),
      h('div', { style: { height:6, borderRadius:3, background:'var(--surface-2)', overflow:'hidden' } },
        h('div', { style: { height:'100%', borderRadius:3, background:'linear-gradient(90deg, var(--accent), #5dd4a6)', width: receiveProgress.percent + '%', transition:'width 0.15s ease' } })
      )
    ),

    /* Download Link Section */
    !isDownloadSession && status !== 'connected' && h('div', { style: { background:'var(--surface)', border:'1px solid var(--border)', borderRadius:16, padding:'22px 26px', marginBottom:20, animation:'fadeUp 0.5s ease 0.3s both' } },
      h('div', { style: { fontFamily:"'DM Mono', monospace", fontSize:11, color:'var(--text-dim)', letterSpacing:1, textTransform:'uppercase', marginBottom:14, display:'flex', alignItems:'center', gap:8 } }, h(ShareIcon), ' Create Download Link'),
      h('div', {
        onDragOver: onLinkDragOver, onDragLeave: onLinkDragLeave, onDrop: onLinkDrop,
        onClick: function() { document.getElementById('link-file-input').click(); },
        style: { border: '2px dashed ' + (linkDragging ? '#818cf8' : 'var(--border)'), borderRadius:14, padding:'32px 20px', textAlign:'center', cursor: myId ? 'pointer' : 'not-allowed', transition:'all 0.3s', background: linkDragging ? 'rgba(99,102,241,0.08)' : 'transparent', opacity: myId ? 1 : 0.5 },
        onMouseEnter: function(e) { if (!linkDragging && myId) { e.currentTarget.style.borderColor='var(--border-active)'; e.currentTarget.style.background='var(--surface-2)'; } },
        onMouseLeave: function(e) { if (!linkDragging) { e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.background='transparent'; } }
      },
        h('div', { style: { marginBottom:10 } }, h(LinkDropIcon, { stroke: linkDragging ? '#818cf8' : 'var(--text-dim)', style: { transition:'all 0.3s' } })),
        h('div', { style: { fontSize:14, fontWeight:500, marginBottom:4, color: linkDragging ? '#818cf8' : 'var(--text)' } }, linkDragging ? 'Drop to create link' : 'Drop a file to create a shareable link'),
        h('div', { style: { color:'var(--text-dim)', fontSize:12, fontWeight:300 } }, 'Anyone with the link can download directly from your browser'),
        h('input', { id: 'link-file-input', type: 'file', style: { display:'none' }, onChange: onLinkFileSelect, disabled: !myId })
      ),

      /* Hosted files list */
      hostedFiles.length > 0 && h('div', { style: { marginTop:16 } },
        hostedFiles.map(function(hosted) {
          return h('div', { key: hosted.id, style: { display:'flex', alignItems:'center', gap:12, padding:'12px 16px', background:'var(--surface-2)', border:'1px solid var(--border)', borderRadius:12, marginBottom:8, animation:'fadeUp 0.3s ease' } },
            h('div', { style: { width:38, height:38, borderRadius:8, background:'rgba(99,102,241,0.1)', border:'1px solid rgba(99,102,241,0.3)', display:'flex', alignItems:'center', justifyContent:'center', color:'#818cf8', flexShrink:0 } }, h(FileIcon)),
            h('div', { style: { flex:1, minWidth:0 } },
              h('div', { style: { fontWeight:500, fontSize:13, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' } }, hosted.file.name),
              h('div', { style: { color:'var(--text-dim)', fontSize:11, fontFamily:"'DM Mono', monospace", marginTop:2 } }, formatBytes(hosted.file.size) + ' · sharing via link')
            ),
            h('button', {
              onClick: function() { copyLink(hosted.link, hosted.id); },
              style: { display:'flex', alignItems:'center', gap:5, padding:'6px 12px', borderRadius:7, border: '1px solid ' + (linkCopied === hosted.id ? 'var(--accent-dim)' : 'var(--border)'), background: linkCopied === hosted.id ? 'var(--accent-glow)' : 'var(--surface)', color: linkCopied === hosted.id ? 'var(--accent)' : 'var(--text-dim)', cursor:'pointer', fontFamily:"'DM Mono', monospace", fontSize:11, transition:'all 0.2s', flexShrink:0 },
              onMouseEnter: function(e) { e.currentTarget.style.borderColor='var(--border-active)'; },
              onMouseLeave: function(e) { e.currentTarget.style.borderColor = linkCopied === hosted.id ? 'var(--accent-dim)' : 'var(--border)'; }
            }, linkCopied === hosted.id ? [h(CheckIcon, { key:'c' }), ' copied'] : [h(CopyIcon, { key:'c' }), ' copy link']),
            h('button', {
              onClick: function() { removeHostedFile(hosted.id); },
              style: { width:30, height:30, borderRadius:6, border:'1px solid var(--border)', background:'var(--surface)', color:'var(--text-dim)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.2s', flexShrink:0 },
              onMouseEnter: function(e) { e.currentTarget.style.borderColor='var(--danger)'; e.currentTarget.style.color='var(--danger)'; },
              onMouseLeave: function(e) { e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.color='var(--text-dim)'; }
            }, h(XIcon))
          );
        }),
        h('div', { style: { fontFamily:"'DM Mono', monospace", fontSize:11, color:'var(--warning)', marginTop:8, paddingLeft:4, opacity:0.8 } }, 'keep this tab open - files are served from your browser')
      )
    ),

    /* Download in progress */
    isDownloading && h('div', { style: { background:'var(--surface)', border:'1px solid rgba(99,102,241,0.4)', borderRadius:16, padding:'40px 26px', marginBottom:20, animation:'fadeUp 0.3s ease', textAlign:'center' } },
      h('div', { style: { width:56, height:56, borderRadius:'50%', background:'rgba(99,102,241,0.1)', border:'1px solid rgba(99,102,241,0.3)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px', animation:'ripple 2s infinite' } }, h(DownloadIcon)),
      h('h3', { style: { fontFamily:"'Outfit', sans-serif", fontWeight:600, fontSize:18, marginBottom:8 } }, 'Downloading File'),
      h('p', { style: { color:'var(--text-dim)', fontSize:13, fontFamily:"'DM Mono', monospace" } }, downloadProgress || 'Preparing...')
    ),

    /* Transfer history */
    transfers.length > 0 && h('div', { style: { animation:'fadeUp 0.3s ease' } },
      h('div', { style: { fontFamily:"'DM Mono', monospace", fontSize:11, color:'var(--text-dim)', letterSpacing:1, textTransform:'uppercase', marginBottom:12, paddingLeft:4 } }, 'Transfers'),
      [].concat(transfers).reverse().map(function(t, i) { return h(TransferItem, { key: i, file: t, direction: t.direction }); })
    ),

    /* Connection request modal */
    pendingRequest && h(ConnectionModal, { fromId: pendingRequest.fromId, onAccept: acceptRequest, onReject: rejectRequest }),

    /* Toast */
    toast && h(Toast, { key: toast.key, message: toast.message, type: toast.type, onDone: function() { setToast(null); } }),

    /* Footer */
    h('div', { style: { textAlign:'center', marginTop:48, fontFamily:"'DM Mono', monospace", fontSize:11, color:'var(--text-dim)', opacity:0.5 } }, 'files never touch a server · share links or connect directly · powered by WebRTC')
  );
}

var root = ReactDOM.createRoot(document.getElementById('root'));
root.render(h(App));
