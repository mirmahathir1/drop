var DropApp = window.DropApp || (window.DropApp = {});

DropApp.createPeerController = function createPeerController(options) {
  var getMyId = options.getMyId;
  var getStatus = options.getStatus;
  var getIsDownloading = options.getIsDownloading;
  var getQrModal = options.getQrModal;
  var showToast = options.showToast;
  var setMyId = options.setMyId;
  var setPeerId = options.setPeerId;
  var setStatus = options.setStatus;
  var setReceiveProgress = options.setReceiveProgress;
  var setIsDownloading = options.setIsDownloading;
  var setIsDownloadSession = options.setIsDownloadSession;
  var setDownloadProgress = options.setDownloadProgress;
  var setQrModal = options.setQrModal;
  var setScannerOpen = options.setScannerOpen;
  var peerRef = options.peerRef;
  var connRef = options.connRef;
  var hostedFilesRef = options.hostedFilesRef;
  var currentReceiveFileIdRef = options.currentReceiveFileIdRef;
  var cleanupConnectionTransfers = options.cleanupConnectionTransfers;
  var handleData = options.handleData;
  var startOutgoingTransfer = options.startOutgoingTransfer;
  var onDirectConnectionOpen = options.onDirectConnectionOpen;

  var retryState = { type: null, targetId: null, fileId: null, attempts: 0, maxRetries: 3, timer: null };

  function clearRetry() {
    clearTimeout(retryState.timer);
    retryState.type = null;
    retryState.targetId = null;
    retryState.fileId = null;
    retryState.attempts = 0;
    retryState.timer = null;
  }

  function setupConn(conn, mode) {
    connRef.current = conn;
    conn.on('open', function() {
      clearRetry();
      var qrModal = getQrModal();
      if (mode === 'direct' && qrModal && qrModal.kind === 'direct-connect') {
        setQrModal(null);
      }
      setStatus('connected');
      if (typeof onDirectConnectionOpen === 'function') {
        onDirectConnectionOpen(conn, mode);
      }
      showToast('Connection established.', 'success');
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

  function showQrCode(title, value, subtitle, qrValue, kind) {
    if (!value) return;
    setQrModal({
      title: title,
      value: value,
      subtitle: subtitle || '',
      qrValue: qrValue || value,
      kind: kind || ''
    });
  }

  async function copyQrValue() {
    var qrModal = getQrModal();
    if (!qrModal) return;

    try {
      await copyTextToClipboard(qrModal.value);
      showToast('Link copied.', 'success');
    } catch (err) {
      console.error('Failed to copy QR value:', err);
      showToast('Could not copy the link on this browser.', 'error');
    }
  }

  function startDirectConnection(targetId, optionsArg) {
    var options = optionsArg || {};
    var isRetry = options._isRetry;
    var nextPeerId = (targetId || '').trim();
    var peer = peerRef.current;
    var currentPeerId = options.fromId || (peer && peer.id) || getMyId();

    if (!nextPeerId || !peer) return false;

    if (currentPeerId && nextPeerId === currentPeerId) {
      showToast('That link points back to this browser.', 'info');
      return false;
    }

    if (!isRetry && getStatus() === 'connecting') {
      showToast('Already connecting to a peer.', 'info');
      return false;
    }

    if (!isRetry && connRef.current && connRef.current.open) {
      showToast('Disconnect before starting another direct connection.', 'info');
      return false;
    }

    if (!isRetry) {
      clearRetry();
      retryState.type = 'direct';
      retryState.targetId = nextPeerId;
    }

    setPeerId(nextPeerId);
    setStatus('connecting');

    var conn = peer.connect(nextPeerId, {
      metadata: { type: 'direct', fromId: currentPeerId },
      reliable: true
    });

    setupConn(conn, 'direct');
    return true;
  }

  function startHostedDownload(hostId, optionsArg) {
    var options = optionsArg || {};
    var isRetry = options._isRetry;
    var nextHostId = (hostId || '').trim();
    var nextFileId = (options.fileId || '').trim();
    var peer = peerRef.current;
    var currentPeerId = (peer && peer.id) || getMyId();

    if (!nextHostId || !peer) return false;

    if (currentPeerId && nextHostId === currentPeerId) {
      showToast('That download link points back to this browser.', 'info');
      return false;
    }

    if (!isRetry && getIsDownloading()) {
      showToast('A download is already in progress.', 'info');
      return false;
    }

    if (!isRetry) {
      clearRetry();
      retryState.type = 'download';
      retryState.targetId = nextHostId;
      retryState.fileId = nextFileId;
    }

    if (options.downloadSession) {
      setIsDownloadSession(true);
    }

    setIsDownloading(true);
    setDownloadProgress('Connecting to host...');

    var dlConn = peer.connect(nextHostId, {
      metadata: { type: 'download-request', fileId: nextFileId || null },
      reliable: true
    });

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

    return true;
  }

  function handleScannerResult(value) {
    var parsed = parseDropLink(value);

    setScannerOpen(false);

    if (!parsed) {
      showToast('That link or ID is not a valid Drop connection.', 'error');
      return;
    }

    if (parsed.type === 'download') {
      if (startHostedDownload(parsed.id, { downloadSession: false, fileId: parsed.fileId })) {
        showToast('Download link received. Connecting...', 'info');
      }
      return;
    }

    if (startDirectConnection(parsed.id)) {
      showToast('Peer ID received. Connecting...', 'info');
    }
  }

  function initializePeer() {
    var launchAction = parseDropLink(window.location.hash);
    var id = generateId();
    var peer = new Peer(id);
    peerRef.current = peer;

    peer.on('open', function(assignedId) {
      setMyId(assignedId);

      if (launchAction && launchAction.type === 'connect') {
        startDirectConnection(launchAction.id, { fromId: assignedId });
        history.replaceState(null, '', window.location.pathname + window.location.search);
      }

      if (launchAction && launchAction.type === 'download') {
        startHostedDownload(launchAction.id, { downloadSession: true, fileId: launchAction.fileId });
      }
    });

    peer.on('connection', function(conn) {
      if (conn.metadata && conn.metadata.type === 'download-request') {
        conn.on('open', function() {
          var files = hostedFilesRef.current;
          var requestedFileId = conn.metadata && conn.metadata.fileId;
          var fileToSend = null;

          if (requestedFileId) {
            for (var i = 0; i < files.length; i++) {
              if (files[i].id === requestedFileId) {
                fileToSend = files[i];
                break;
              }
            }
          }

          if (!fileToSend && files.length > 0) {
            fileToSend = files[0];
          }

          if (fileToSend) {
            startOutgoingTransfer(conn, fileToSend.file, { trackProgress: false });
          } else {
            conn.close();
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
      } else if (conn.metadata && conn.metadata.type === 'direct') {
        setupConn(conn, 'direct');
      }
    });

    peer.on('error', function(err) {
      console.error('Peer error:', err);
      if (err.type === 'peer-unavailable') {
        // Clean up the failed connection object
        if (connRef.current) {
          try { connRef.current.close(); } catch (e) {}
          connRef.current = null;
        }

        retryState.attempts += 1;
        if (retryState.attempts < retryState.maxRetries && retryState.targetId) {
          showToast('Peer not found. Retrying (' + retryState.attempts + '/' + retryState.maxRetries + ')...', 'info');
          retryState.timer = setTimeout(function() {
            if (retryState.type === 'direct') {
              startDirectConnection(retryState.targetId, { _isRetry: true });
            } else if (retryState.type === 'download') {
              startHostedDownload(retryState.targetId, { _isRetry: true, fileId: retryState.fileId });
            }
          }, 2000);
        } else {
          var failMsg = retryState.type === 'download'
            ? 'Host not found. The link may have expired.'
            : 'Peer not found. The sender may have closed the page.';
          clearRetry();
          showToast(failMsg, 'error');
          setStatus('idle');
          setIsDownloading(false);
          setDownloadProgress(null);
        }
      }
    });

    return function() {
      clearRetry();
      peer.destroy();
      peerRef.current = null;
    };
  }

  return {
    copyQrValue: copyQrValue,
    handleScannerResult: handleScannerResult,
    initializePeer: initializePeer,
    showQrCode: showQrCode,
    startDirectConnection: startDirectConnection,
    startHostedDownload: startHostedDownload
  };
};
