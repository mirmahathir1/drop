var DropApp = window.DropApp || (window.DropApp = {});

function ModeChoiceButton(props) {
  return h('button', {
    onClick: props.onClick,
    className: 'round-action',
    type: 'button'
  },
    h('div', { className: 'round-action__icon' }, props.icon),
    h('div', { className: 'round-action__label' }, props.label),
    props.description && h('div', { className: 'round-action__copy' }, props.description)
  );
}

function ProgressCard(props) {
  return h('div', {
    className: 'surface-card',
    style: {
      borderColor: props.borderColor,
      animation:'fadeUp 0.3s ease',
      marginBottom:20
    }
  },
    h('div', { style: { display:'flex', justifyContent:'space-between', alignItems:'center', gap:12, marginBottom:10 } },
      h('div', { style: { minWidth:0, flex:1 } },
        h('div', { className: 'section-label', style: { color: props.labelColor || 'var(--text-dim)', marginBottom:6 } }, props.eyebrow),
        h('div', {
          style: {
            fontFamily:"'DM Mono', monospace",
            fontSize:13,
            color:'var(--text)',
            whiteSpace:'normal',
            overflowWrap:'anywhere',
            lineHeight:1.5
          }
        }, props.title)
      ),
      h('div', { style: { display:'flex', alignItems:'center', gap:10, flexShrink:0 } },
        h('div', {
          style: {
            fontFamily:"'DM Mono', monospace",
            fontSize:12,
            color: props.valueColor || 'var(--text)'
          }
        }, props.percent + '%' + (props.eta ? ' · ' + props.eta + ' left' : '')),
        props.onCancel && h('button', {
          onClick: props.onCancel,
          title: props.cancelTitle || 'Cancel',
          className: 'icon-button'
        }, h(XIcon))
      )
    ),
    h('div', { className: 'progress-track' },
      h('div', {
        className: 'progress-fill',
        style: {
          width: props.percent + '%',
          background: props.gradient
        }
      })
    )
  );
}

function describePreparedSend(preparedSend) {
  if (!preparedSend) return '';
  if (preparedSend.folderCount === 1 && preparedSend.sourceCount === 1) return '1 folder';
  if (preparedSend.folderCount > 0) return preparedSend.sourceCount + ' items';
  if (preparedSend.sourceCount > 1) return preparedSend.sourceCount + ' files';
  return '1 file';
}

DropApp.AppView = function AppView(props) {
  var mode = props.mode;
  var myId = props.myId;
  var status = props.status;
  var toast = props.toast;
  var transfers = props.transfers;
  var dragging = props.dragging;
  var copied = props.copied;
  var sendProgress = props.sendProgress;
  var receiveProgress = props.receiveProgress;
  var zipProgress = props.zipProgress;
  var isDownloading = props.isDownloading;
  var isDownloadSession = props.isDownloadSession;
  var receiveLaunchType = props.receiveLaunchType;
  var downloadProgress = props.downloadProgress;
  var preparedSend = props.preparedSend;
  var receiveUiHidden = props.receiveUiHidden;
  var sendLink = props.sendLink;
  var isPackagingZip = props.isPackagingZip;
  var connectedPeerId = props.connectedPeerId;
  var qrModal = props.qrModal;
  var openSendMode = props.openSendMode;
  var openReceiveMode = props.openReceiveMode;
  var openHomeConnectionQr = props.openHomeConnectionQr;
  var closeQrModal = props.closeQrModal;
  var copyQrValue = props.copyQrValue;
  var goHome = props.goHome;
  var handleReceiveScan = props.handleReceiveScan;
  var scannerOpen = props.scannerOpen;
  var setScannerOpen = props.setScannerOpen;
  var copyId = props.copyId;
  var clearPreparedSend = props.clearPreparedSend;
  var openPicker = props.openPicker;
  var onDragOver = props.onDragOver;
  var onDragLeave = props.onDragLeave;
  var onDrop = props.onDrop;
  var onFileSelect = props.onFileSelect;
  var onFolderSelect = props.onFolderSelect;
  var disconnect = props.disconnect;
  var cancelSend = props.cancelSend;
  var cancelReceive = props.cancelReceive;
  var markTransferDownloaded = props.markTransferDownloaded;
  var clearToast = props.clearToast;

  var preparedSendLabel = describePreparedSend(preparedSend);
  var showConnectionSummary = status === 'connecting' || status === 'connected';
  var hasReceivedTransfers = transfers.some(function(transfer) {
    return transfer && transfer.direction === 'received';
  });
  var hasReceiveLaunch = mode === 'receive' && !!receiveLaunchType;

  function renderModeToolbar() {
    if (mode === 'home') return null;

    return h('div', { className: 'mode-toolbar' },
      h('button', { className: 'ghost-button', onClick: goHome, type: 'button' }, 'Back')
    );
  }

  function renderHome() {
    return h(React.Fragment, null,
      h('div', { className: 'choice-grid' },
        h(ModeChoiceButton, {
          label: 'Send',
          onClick: openSendMode,
          icon: h(UploadIcon, { stroke:'var(--accent)', style: { width:42, height:42 } })
        }),
        h(ModeChoiceButton, {
          label: 'Receive',
          onClick: openReceiveMode,
          icon: h(DownloadIcon, { width:42, height:42, strokeWidth:1.5 })
        })
      ),
      h('div', {
        style: {
          display:'flex',
          justifyContent:'center',
          alignItems:'center',
          margin:'4px auto 24px',
          animation:'fadeUp 0.35s ease'
        }
      },
        status === 'connected'
          ? h('div', {
              style: {
                display:'flex',
                flexDirection:'column',
                alignItems:'center',
                gap:12
              }
            },
              h('div', {
                style: {
                  fontFamily:"'Outfit', sans-serif",
                  fontSize:22,
                  fontWeight:500,
                  color:'var(--text)',
                  textAlign:'center'
                }
              }, 'You are connected with ' + connectedPeerId),
              h('button', {
                className: 'ghost-button',
                onClick: disconnect,
                type: 'button'
              }, 'Disconnect')
            )
          : h('button', {
              className: 'ghost-button',
              onClick: openHomeConnectionQr,
              disabled: !myId,
              type: 'button'
            }, 'Show QR code')
      )
    );
  }

  function renderSendShareCard() {
    if (!sendLink) {
      return h('div', { className: 'surface-card helper-card' },
        h('div', { className: 'section-label' }, 'Preparing'),
        h('h3', { style: { fontFamily:"'Outfit', sans-serif", fontWeight:600, fontSize:24, lineHeight:1.1, marginBottom:8 } }, 'Creating your sender link'),
        h('p', { className: 'card-copy' }, 'Your file is ready. The QR code and link will appear as soon as this browser finishes claiming its peer ID.')
      );
    }

    var subtitle = 'Scan this QR code on the receiving device, or paste the link there manually.';
    if (sendProgress) {
      subtitle = 'The receiver is connected and the transfer is in progress.';
    } else if (status === 'connected') {
      subtitle = 'The receiver is connected. Choose another file to prepare a new transfer on this connection.';
    }

    return h(QrCard, {
      subtitle: subtitle,
      value: sendLink,
      qrValue: sendLink,
      idValue: myId,
      onCopy: copyId,
      copied: copied
    });
  }

  function renderSendWorkspace() {
    if (preparedSend && status !== 'connected') {
      return h('div', { className: 'send-ready-shell' },
        renderSendShareCard(),
        h('div', { className: 'surface-card', style: { animation:'fadeUp 0.35s ease' } },
          h('div', { className: 'prepared-summary' },
            h('div', { style: { minWidth:0, flex:1 } },
              h('div', { className: 'section-label', style: { marginBottom:6 } }, 'Ready package'),
              h('div', {
                style: {
                  fontWeight:500,
                  fontSize:16,
                  whiteSpace:'normal',
                  overflowWrap:'anywhere',
                  lineHeight:1.5
                }
              }, preparedSend.file.name),
              h('div', { className: 'card-copy', style: { marginTop:6 } },
                formatBytes(preparedSend.file.size) +
                ' · ' +
                preparedSendLabel +
                (preparedSend.folderCount > 0 || preparedSend.sourceCount > 1 ? ' packaged for transfer' : ' ready to transfer')
              )
            )
          ),
          h('div', { className: 'inline-actions' },
            h('button', {
              onClick: clearPreparedSend,
              disabled: !!sendProgress,
              className: 'ghost-button',
              type: 'button'
            }, 'Choose another file'),
            status === 'connected' && h('button', {
              className: 'ghost-button',
              onClick: disconnect,
              type: 'button'
            }, 'Disconnect')
          )
        )
      );
    }

    return h('div', { className: 'send-ready-shell' },
      h('div', { className: 'surface-card', style: { animation:'fadeUp 0.35s ease' } },
        h('h2', { className: 'panel-title' }, 'Choose what to send'),
        h('p', { className: 'card-copy', style: { marginBottom:20 } },
          status === 'connected'
            ? 'The receiver is connected. Drop another file or folder here to send it over the same direct connection.'
            : 'Click below to select files or simply drag files in this box'
        ),
        h('div', {
          onDragOver: onDragOver,
          onDragLeave: onDragLeave,
          onDrop: onDrop,
          onClick: function() {
            if (!isPackagingZip && !sendProgress) {
              openPicker('file-input');
            }
          },
          className: 'dropzone' + (dragging ? ' is-dragging' : '') + (isPackagingZip || sendProgress ? ' is-busy' : '')
        },
          h('div', { style: { marginBottom:16 } }, h(UploadIcon, { stroke: dragging ? 'var(--accent)' : 'var(--text-dim)', style: { width:42, height:42 } })),
          h('div', { style: { fontSize:18, fontWeight:500, marginBottom:6, color: dragging ? 'var(--accent)' : 'var(--text)' } }, dragging ? 'Drop to prepare the transfer' : 'Drag and drop files or folders'),
          h('div', { className: 'card-copy' },
            status === 'connected'
              ? 'Your receiver is already connected, so new files will send on this session.'
              : 'The receiver link appears immediately after the file package is ready.'
          ),
          h('div', { className: 'inline-actions' },
            h('button', {
              onClick: function(e) { openPicker('file-input', e); },
              disabled: isPackagingZip || !!sendProgress,
              className: 'ghost-button'
            }, 'Browse files'),
            h('button', {
              onClick: function(e) { openPicker('folder-input', e); },
              disabled: isPackagingZip || !!sendProgress,
              className: 'ghost-button'
            }, 'Choose folder')
          ),
          h('input', { id: 'file-input', type: 'file', multiple: true, style: { display:'none' }, onChange: onFileSelect, disabled: isPackagingZip || !!sendProgress }),
          h('input', { id: 'folder-input', type: 'file', webkitdirectory: true, multiple: true, style: { display:'none' }, onChange: onFolderSelect, disabled: isPackagingZip || !!sendProgress })
        ),
        showConnectionSummary && h('div', { className: 'status-box' },
          h('div', { className: 'section-label', style: { marginBottom:6 } }, 'Connection'),
          h('div', {
            style: {
              fontFamily:"'DM Mono', monospace",
              fontSize:13,
              color: status === 'connected' ? 'var(--accent)' : 'var(--warning)'
            }
          },
            status === 'connected'
              ? 'You are connected to ' + connectedPeerId
              : 'Waiting for the receiver to connect...'
          ),
          status === 'connected' && h('div', { className: 'inline-actions', style: { marginTop:12 } },
            h('button', { className: 'ghost-button', onClick: disconnect, type: 'button' }, 'Disconnect')
          )
        )
      )
    );
  }

  function renderReceiveWorkspace() {
    if (receiveUiHidden) {
      return null;
    }

    if (hasReceiveLaunch || isDownloadSession || status === 'connecting') {
      return null;
    }

    if (status === 'connected' && !isDownloading && !receiveProgress) {
      return h('div', { className: 'send-ready-shell' },
        h('div', { className: 'surface-card', style: { animation:'fadeUp 0.35s ease' } },
          h('div', { className: 'section-label' }, 'Connected'),
          h('h2', { className: 'panel-title' }, hasReceivedTransfers ? 'Waiting for the next file' : 'Waiting for the file'),
          h('p', { className: 'card-copy' },
            hasReceivedTransfers
              ? 'The sender is still connected. Keep the app open for the next to will arrive over the same direct connection.'
              : 'The sender is connected. Keep this tab open and the file will arrive over the same direct connection.'
          ),
          h('div', { className: 'status-box' },
            h('div', { className: 'section-label', style: { marginBottom:6 } }, 'Peer'),
            h('div', {
              style: {
                fontFamily:"'DM Mono', monospace",
                fontSize:13,
                color:'var(--accent)'
              }
            }, connectedPeerId)
          ),
          h('div', { className: 'inline-actions' },
            h('button', {
              className: 'ghost-button',
              onClick: disconnect,
              type: 'button'
            }, 'Disconnect')
          )
        )
      );
    }

    return h('div', { className: 'send-ready-shell' },
      h(ScannerPanel, {
        title: 'Connect to the sender',
        subtitle: 'Open the camera on this device and point it at the QR code shown in send mode, or enter the sender ID manually.',
        enabled: !hasReceiveLaunch && !isDownloadSession && status !== 'connecting',
        onScan: handleReceiveScan
      })
    );
  }

  function renderReceiveWaitingCard() {
    if (mode !== 'receive' || !receiveUiHidden || status !== 'connected' || isDownloading || receiveProgress) {
      return null;
    }

    return h('div', { className: 'send-ready-shell', style: { marginTop:20 } },
      h('div', { className: 'surface-card', style: { animation:'fadeUp 0.35s ease' } },
        h('div', { className: 'section-label' }, 'Connected'),
        h('h2', { className: 'panel-title' }, 'Waiting for the next file'),
        h('p', { className: 'card-copy' }, 'The sender is still connected. Keep this app open and the next file will arrive over the same connection.'),
        h('div', { className: 'status-box' },
          h('div', { className: 'section-label', style: { marginBottom:6 } }, 'Peer'),
          h('div', {
            style: {
              fontFamily:"'DM Mono', monospace",
              fontSize:13,
              color:'var(--accent)'
            }
          }, connectedPeerId)
        ),
        h('div', { className: 'inline-actions' },
          h('button', {
            className: 'ghost-button',
            onClick: disconnect,
            type: 'button'
          }, 'Disconnect')
        )
      )
    );
  }

  return h('div', { className: 'app-shell' },
    h('div', { className: 'hero-block' },
      h('div', { style: { fontFamily:"'DM Mono', monospace", fontSize:11, fontWeight:400, letterSpacing:3, textTransform:'uppercase', color:'var(--accent)', marginBottom:12 } }, 'peer-to-peer'),
      h('h1', { className: 'hero-title' }, 'drop', h('span', { style: { color:'var(--accent)' } }, '.')),
      !(mode === 'receive' && hasReceivedTransfers) && h('p', { className: 'hero-copy' },
        mode === 'home'
          ? 'Do you want to send or receive files?'
          : mode === 'send'
            ? 'Prepare the file here, then hand the link or QR code to the receiving device.'
            : 'Scan the sender QR code or enter the sender ID to pull the file directly.'
      )
    ),

    renderModeToolbar(),
    mode === 'home' && renderHome(),
    mode === 'send' && renderSendWorkspace(),
    mode === 'receive' && renderReceiveWorkspace(),

    zipProgress && h(ProgressCard, {
      eyebrow: 'Creating zip archive',
      title: zipProgress.name + ' · ' + zipProgress.sourceLabel,
      percent: zipProgress.percent,
      eta: '',
      labelColor: 'var(--warning)',
      valueColor: 'var(--warning)',
      borderColor: 'rgba(251,191,36,0.28)',
      gradient: 'linear-gradient(90deg, #f59e0b, #fbbf24)'
    }),

    sendProgress && h(ProgressCard, {
      eyebrow: 'Sending',
      title: sendProgress.name,
      percent: sendProgress.percent,
      eta: sendProgress.eta,
      valueColor: '#818cf8',
      borderColor: 'rgba(99,102,241,0.4)',
      gradient: 'linear-gradient(90deg, #818cf8, #a78bfa)',
      onCancel: cancelSend,
      cancelTitle: 'Cancel send'
    }),

    receiveProgress && h(ProgressCard, {
      eyebrow: 'Receiving',
      title: receiveProgress.name,
      percent: receiveProgress.percent,
      eta: receiveProgress.eta,
      valueColor: 'var(--accent)',
      borderColor: 'rgba(110,231,183,0.28)',
      gradient: 'linear-gradient(90deg, var(--accent), #5dd4a6)',
      onCancel: cancelReceive,
      cancelTitle: 'Cancel receive'
    }),

    isDownloading && !receiveProgress && h('div', { className: 'surface-card', style: { textAlign:'center', marginBottom:20, animation:'fadeUp 0.3s ease' } },
      h('div', { style: { width:56, height:56, borderRadius:'50%', background:'rgba(99,102,241,0.1)', border:'1px solid rgba(99,102,241,0.3)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 18px', animation:'ripple 2s infinite' } }, h(DownloadIcon)),
      h('h3', { style: { fontFamily:"'Outfit', sans-serif", fontWeight:600, fontSize:18, marginBottom:8 } }, 'Connecting to sender'),
      h('p', { className: 'card-copy' }, downloadProgress || 'Preparing...')
    ),

    transfers.length > 0 && h('div', { style: { animation:'fadeUp 0.3s ease' } },
      h('div', { className: 'section-label', style: { paddingLeft:4, marginBottom:12 } }, 'Transfers'),
      hasReceivedTransfers && (mode === 'receive' || mode === 'home') && h('p', {
        className: 'card-copy',
        style: { paddingLeft:4, marginBottom:12 }
      }, 'Click to download the transferred files'),
      h('div', { className: 'transfer-list' },
        transfers.map(function(t, i) {
          return h(TransferItem, {
            key: t.transferId || t.name + '-' + i,
            file: t,
            direction: t.direction,
            onDownload: markTransferDownloaded
          });
        })
      )
    ),

    renderReceiveWaitingCard(),

    toast && h(Toast, { key: toast.key, message: toast.message, type: toast.type, onDone: clearToast }),

    qrModal && h(QrModal, {
      title: qrModal.title,
      value: qrModal.value,
      qrValue: qrModal.qrValue,
      subtitle: qrModal.subtitle,
      onClose: closeQrModal,
      onCopy: copyQrValue
    }),

    scannerOpen && h(ScannerModal, {
      onClose: function() { setScannerOpen(false); },
      onScan: handleReceiveScan
    }),

    h('div', { className: 'footer-note' }, 'files never touch a server · sender and receiver connect directly in the browser')
  );
};
