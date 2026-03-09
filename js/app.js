/* Main App */
function App() {
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

  const [hostedFiles, setHostedFiles] = useState([]);
  const [linkDragging, setLinkDragging] = useState(false);
  const [linkCopied, setLinkCopied] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDownloadSession, setIsDownloadSession] = useState(false);
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
  const statusRef = useRef(status);
  const isDownloadingRef = useRef(isDownloading);
  const qrModalRef = useRef(qrModal);

  const CHUNK_SIZE = 64 * 1024;
  const TRANSFER_STORAGE_DIR = 'drop-transfers';

  transfersRef.current = transfers;
  hostedFilesRef.current = hostedFiles;
  statusRef.current = status;
  isDownloadingRef.current = isDownloading;
  qrModalRef.current = qrModal;

  function showToast(message, type) {
    setToast({ message: message, type: type || 'info', key: Date.now() });
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
    clearTransferHistory: transferController.clearTransferHistory,
    cleanupConnectionTransfers: transferController.cleanupConnectionTransfers,
    handleData: transferController.handleData,
    startOutgoingTransfer: transferController.startOutgoingTransfer
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

  async function sendSelection(selection) {
    var normalized = selection && selection.entries ? selection : selectionController.buildSelectionFromFileList(selection);
    var selectionFile = await selectionController.buildSelectionFile(normalized, 'send');
    if (!selectionFile || !selectionFile.file) return;
    sendFile(selectionFile.file);
  }

  async function sendSelectedFiles(fileList) {
    await sendSelection(selectionController.buildSelectionFromFileList(fileList));
  }

  async function sendSelectedFolder(fileList) {
    await sendSelection(selectionController.buildSelectionFromFileList(fileList));
  }

  async function sendDroppedSelection(dataTransfer) {
    var selection = await selectionController.buildSelectionFromDrop(dataTransfer);
    if (!selection) return;
    await sendSelection(selection);
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
    await sendDroppedSelection(e.dataTransfer);
  }

  async function onFileSelect(e) {
    await sendSelectedFiles(e.target.files);
    e.target.value = '';
  }

  async function onFolderSelect(e) {
    await sendSelectedFolder(e.target.files);
    e.target.value = '';
  }

  async function copyId() {
    var link = buildConnectLink(myId);
    try {
      await copyTextToClipboard(link);
      setCopied(true);
      setTimeout(function() { setCopied(false); }, 2000);
      showToast('Direct connect link copied.', 'success');
    } catch (err) {
      console.error('Failed to copy direct connect link:', err);
      showToast('Could not copy the direct connect link.', 'error');
    }
  }

  function disconnect() {
    if (connRef.current) connRef.current.close();
    transferController.clearTransferHistory();
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

  return h(DropApp.AppView, {
    myId: myId,
    peerId: peerId,
    status: status,
    toast: toast,
    transfers: transfers,
    dragging: dragging,
    copied: copied,
    sendProgress: sendProgress,
    receiveProgress: receiveProgress,
    zipProgress: zipProgress,
    hostedFiles: hostedFiles,
    linkDragging: linkDragging,
    linkCopied: linkCopied,
    isDownloading: isDownloading,
    isDownloadSession: isDownloadSession,
    downloadProgress: downloadProgress,
    qrModal: qrModal,
    scannerOpen: scannerOpen,
    directConnectLink: myId ? buildConnectLink(myId) : '',
    scannerDisabled: !myId || status === 'connecting' || isDownloading,
    isPackagingZip: !!zipProgress,
    connectedPeerId: peerId || (connRef.current && connRef.current.peer) || '-',
    setPeerId: setPeerId,
    requestConnection: requestConnection,
    showQrCode: peerController.showQrCode,
    openScanner: function() { setScannerOpen(true); },
    closeScanner: function() { setScannerOpen(false); },
    handleScannerResult: peerController.handleScannerResult,
    copyId: copyId,
    openPicker: openPicker,
    onDragOver: onDragOver,
    onDragLeave: onDragLeave,
    onDrop: onDrop,
    onFileSelect: onFileSelect,
    onFolderSelect: onFolderSelect,
    disconnect: disconnect,
    cancelSend: cancelSend,
    cancelReceive: cancelReceive,
    onLinkDragOver: onLinkDragOver,
    onLinkDragLeave: onLinkDragLeave,
    onLinkDrop: onLinkDrop,
    onLinkFileSelect: onLinkFileSelect,
    onLinkFolderSelect: onLinkFolderSelect,
    copyLink: copyLink,
    removeHostedFile: removeHostedFile,
    closeQrModal: function() { setQrModal(null); },
    copyQrValue: peerController.copyQrValue,
    clearToast: function() { setToast(null); }
  });
}

var root = ReactDOM.createRoot(document.getElementById('root'));
root.render(h(App));
