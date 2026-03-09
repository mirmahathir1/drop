var DropApp = window.DropApp || (window.DropApp = {});

DropApp.AppView = function AppView(props) {
  var myId = props.myId;
  var peerId = props.peerId;
  var status = props.status;
  var toast = props.toast;
  var transfers = props.transfers;
  var dragging = props.dragging;
  var copied = props.copied;
  var sendProgress = props.sendProgress;
  var receiveProgress = props.receiveProgress;
  var zipProgress = props.zipProgress;
  var hostedFiles = props.hostedFiles;
  var linkDragging = props.linkDragging;
  var linkCopied = props.linkCopied;
  var isDownloading = props.isDownloading;
  var isDownloadSession = props.isDownloadSession;
  var downloadProgress = props.downloadProgress;
  var qrModal = props.qrModal;
  var scannerOpen = props.scannerOpen;
  var directConnectLink = props.directConnectLink;
  var scannerDisabled = props.scannerDisabled;
  var isPackagingZip = props.isPackagingZip;
  var connectedPeerId = props.connectedPeerId;
  var setPeerId = props.setPeerId;
  var requestConnection = props.requestConnection;
  var showQrCode = props.showQrCode;
  var openScanner = props.openScanner;
  var closeScanner = props.closeScanner;
  var handleScannerResult = props.handleScannerResult;
  var copyId = props.copyId;
  var openPicker = props.openPicker;
  var onDragOver = props.onDragOver;
  var onDragLeave = props.onDragLeave;
  var onDrop = props.onDrop;
  var onFileSelect = props.onFileSelect;
  var onFolderSelect = props.onFolderSelect;
  var disconnect = props.disconnect;
  var cancelSend = props.cancelSend;
  var cancelReceive = props.cancelReceive;
  var onLinkDragOver = props.onLinkDragOver;
  var onLinkDragLeave = props.onLinkDragLeave;
  var onLinkDrop = props.onLinkDrop;
  var onLinkFileSelect = props.onLinkFileSelect;
  var onLinkFolderSelect = props.onLinkFolderSelect;
  var copyLink = props.copyLink;
  var removeHostedFile = props.removeHostedFile;
  var closeQrModal = props.closeQrModal;
  var copyQrValue = props.copyQrValue;
  var clearToast = props.clearToast;

  return h('div', { style: { maxWidth: 520, margin: '0 auto', padding: '60px 20px 80px', minHeight: '100vh' } },

    h('div', { style: { textAlign:'center', marginBottom:48, animation:'fadeUp 0.5s ease' } },
      h('div', { style: { fontFamily:"'DM Mono', monospace", fontSize:11, fontWeight:400, letterSpacing:3, textTransform:'uppercase', color:'var(--accent)', marginBottom:12 } }, 'peer-to-peer'),
      h('h1', { style: { fontSize:48, fontWeight:700, letterSpacing:'-0.03em', lineHeight:1, marginBottom:10 } },
        'drop', h('span', { style: { color:'var(--accent)' } }, '.')
      ),
      h('p', { style: { color:'var(--text-dim)', fontSize:15, fontWeight:300 } }, 'Send files directly between browsers. No server, no upload.')
    ),

    !isDownloadSession && status !== 'connected' && h('div', { style: { background:'var(--surface)', border:'1px solid var(--border)', borderRadius:16, padding:'22px 26px', marginBottom:20, animation:'fadeUp 0.5s ease 0.1s both' } },
      h('div', { style: { fontFamily:"'DM Mono', monospace", fontSize:11, color:'var(--text-dim)', letterSpacing:1, textTransform:'uppercase', marginBottom:10 } }, 'Your ID'),
      h('div', { style: { display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' } },
        h('div', { style: { flex:'1 1 auto', fontFamily:"'DM Mono', monospace", fontSize:20, fontWeight:500, color: myId ? 'var(--text)' : 'var(--text-dim)', animation: myId ? 'none' : 'pulse 1.5s infinite' } }, myId || 'connecting...'),
        myId && h('div', { style: { display:'flex', gap:8, flexWrap:'wrap' } },
          h('button', {
            onClick: copyId,
            style: { display:'flex', alignItems:'center', justifyContent:'center', gap:6, padding:'7px 14px', borderRadius:8, border:'1px solid var(--border)', background:'var(--surface-2)', color: copied ? 'var(--accent)' : 'var(--text-dim)', cursor:'pointer', fontFamily:"'DM Mono', monospace", fontSize:12, transition:'all 0.2s', whiteSpace:'nowrap' },
            onMouseEnter: function(e) { e.currentTarget.style.borderColor='var(--border-active)'; },
            onMouseLeave: function(e) { e.currentTarget.style.borderColor='var(--border)'; }
          }, copied ? [h(CheckIcon, { key:'ci' }), ' copied'] : [h(LinkIcon, { key:'li' }), ' copy direct connect link']),
          h('button', {
            onClick: function() {
              showQrCode(
                'Direct connect',
                directConnectLink,
                'Scan to connect to ' + myId + ' without typing the link.',
                buildConnectQrValue(myId),
                'direct-connect'
              );
            },
            style: { display:'flex', alignItems:'center', justifyContent:'center', gap:6, padding:'7px 14px', borderRadius:8, border:'1px solid var(--border)', background:'var(--surface-2)', color:'var(--text-dim)', cursor:'pointer', fontFamily:"'DM Mono', monospace", fontSize:12, transition:'all 0.2s', whiteSpace:'nowrap' },
            onMouseEnter: function(e) { e.currentTarget.style.borderColor='var(--border-active)'; },
            onMouseLeave: function(e) { e.currentTarget.style.borderColor='var(--border)'; }
          }, h(QrIcon), ' QR'),
          h('button', {
            onClick: openScanner,
            disabled: scannerDisabled,
            style: {
              display:'flex', alignItems:'center', justifyContent:'center', gap:6,
              padding:'7px 14px', borderRadius:8, border:'1px solid var(--border)',
              background:'var(--surface-2)', color:'var(--text-dim)',
              cursor: scannerDisabled ? 'not-allowed' : 'pointer',
              fontFamily:"'DM Mono', monospace", fontSize:12, transition:'all 0.2s',
              whiteSpace:'nowrap', opacity: scannerDisabled ? 0.55 : 1
            },
            onMouseEnter: function(e) { if (!scannerDisabled) e.currentTarget.style.borderColor='var(--border-active)'; },
            onMouseLeave: function(e) { e.currentTarget.style.borderColor='var(--border)'; }
          }, h(CameraIcon), ' open camera')
        )
      )
    ),

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

    status === 'connected' && h(React.Fragment, null,
      h('div', { style: { background:'var(--surface)', border:'1px solid var(--accent-dim)', borderRadius:16, padding:'18px 26px', marginBottom:20, animation:'fadeUp 0.3s ease', display:'flex', alignItems:'center', justifyContent:'space-between' } },
        h('div', { style: { display:'flex', alignItems:'center', gap:12 } },
          h('div', { style: { width:10, height:10, borderRadius:'50%', background:'var(--accent)', animation:'ripple 2s infinite' } }),
          h('div', null,
            h('div', { style: { fontFamily:"'DM Mono', monospace", fontSize:13, color:'var(--text-dim)' } }, 'connected to'),
            h('div', { style: { fontFamily:"'DM Mono', monospace", fontSize:15, fontWeight:500, color:'var(--accent)' } }, connectedPeerId)
          )
        ),
        h('button', {
          onClick: disconnect,
          style: { padding:'7px 14px', borderRadius:8, border:'1px solid var(--border)', background:'var(--surface-2)', color:'var(--text-dim)', cursor:'pointer', fontFamily:"'DM Mono', monospace", fontSize:12, display:'flex', alignItems:'center', gap:6, transition:'all 0.2s' },
          onMouseEnter: function(e) { e.currentTarget.style.borderColor='var(--danger)'; e.currentTarget.style.color='var(--danger)'; },
          onMouseLeave: function(e) { e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.color='var(--text-dim)'; }
        }, h(XIcon), ' disconnect')
      ),

      h('div', {
        onDragOver: onDragOver, onDragLeave: onDragLeave, onDrop: onDrop,
        onClick: function() {
          if (!isPackagingZip) {
            openPicker('file-input');
          }
        },
        style: { border: '2px dashed ' + (dragging ? 'var(--accent)' : 'var(--border)'), borderRadius:20, padding:'50px 30px', textAlign:'center', cursor: isPackagingZip ? 'wait' : 'pointer', transition:'all 0.3s', background: dragging ? 'var(--accent-glow)' : 'var(--surface)', marginBottom:24, animation:'fadeUp 0.4s ease', opacity: isPackagingZip ? 0.78 : 1 },
        onMouseEnter: function(e) { if (!dragging && !isPackagingZip) { e.currentTarget.style.borderColor='var(--border-active)'; e.currentTarget.style.background='var(--surface-2)'; } },
        onMouseLeave: function(e) { if (!dragging) { e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.background='var(--surface)'; } }
      },
        h('div', { style: { marginBottom:14 } }, h(UploadIcon, { stroke: dragging ? 'var(--accent)' : 'var(--text-dim)', style: { transition:'all 0.3s' } })),
        h('div', { style: { fontSize:16, fontWeight:500, marginBottom:6, color: dragging ? 'var(--accent)' : 'var(--text)' } }, dragging ? 'Drop to send' : 'Drag & drop files or folders here'),
        h('div', { style: { color:'var(--text-dim)', fontSize:13, fontWeight:300 } }, 'click to browse files · folders keep their name when zipped'),
        h('div', { style: { display:'flex', justifyContent:'center', gap:10, flexWrap:'wrap', marginTop:14 } },
          h('button', {
            onClick: function(e) { openPicker('file-input', e); },
            disabled: isPackagingZip,
            style: { padding:'8px 14px', borderRadius:9, border:'1px solid var(--border)', background:'var(--surface-2)', color:'var(--text-dim)', cursor: isPackagingZip ? 'not-allowed' : 'pointer', fontFamily:"'DM Mono', monospace", fontSize:11, opacity: isPackagingZip ? 0.6 : 1 }
          }, 'browse files'),
          h('button', {
            onClick: function(e) { openPicker('folder-input', e); },
            disabled: isPackagingZip,
            style: { padding:'8px 14px', borderRadius:9, border:'1px solid var(--border)', background:'var(--surface-2)', color:'var(--text-dim)', cursor: isPackagingZip ? 'not-allowed' : 'pointer', fontFamily:"'DM Mono', monospace", fontSize:11, opacity: isPackagingZip ? 0.6 : 1 }
          }, 'choose folder')
        ),
        h('input', { id: 'file-input', type: 'file', multiple: true, style: { display:'none' }, onChange: onFileSelect, disabled: isPackagingZip }),
        h('input', { id: 'folder-input', type: 'file', webkitdirectory: true, multiple: true, style: { display:'none' }, onChange: onFolderSelect, disabled: isPackagingZip })
      )
    ),

    zipProgress && h('div', { style: { background:'var(--surface)', border:'1px solid rgba(251,191,36,0.28)', borderRadius:14, padding:'16px 22px', marginBottom:20, animation:'fadeUp 0.3s ease' } },
      h('div', { style: { display:'flex', justifyContent:'space-between', alignItems:'center', gap:12, marginBottom:8 } },
        h('div', { style: { fontFamily:"'DM Mono', monospace", fontSize:12, color:'var(--warning)', textTransform:'uppercase', letterSpacing:1 } }, 'Creating zip archive'),
        h('div', { style: { fontFamily:"'DM Mono', monospace", fontSize:12, color:'var(--warning)', flexShrink:0 } }, zipProgress.percent + '%')
      ),
      h('div', { style: { fontSize:13, fontWeight:500, marginBottom:6, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' } }, zipProgress.name),
      h('div', { style: { fontFamily:"'DM Mono', monospace", fontSize:11, color:'var(--text-dim)', marginBottom:10, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' } },
        zipProgress.sourceLabel + ' · ' + formatBytes(zipProgress.totalBytes) + ' · ' + (zipProgress.action === 'link' ? 'preparing share link' : 'preparing to send') + (zipProgress.currentFile ? ' · ' + zipProgress.currentFile : '')
      ),
      h('div', { style: { height:6, borderRadius:3, background:'var(--surface-2)', overflow:'hidden' } },
        h('div', { style: { height:'100%', borderRadius:3, background:'linear-gradient(90deg, #f59e0b, #fbbf24)', width: zipProgress.percent + '%', transition:'width 0.15s ease' } })
      )
    ),

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

    !isDownloadSession && status !== 'connected' && h('div', { style: { background:'var(--surface)', border:'1px solid var(--border)', borderRadius:16, padding:'22px 26px', marginBottom:20, animation:'fadeUp 0.5s ease 0.3s both' } },
      h('div', { style: { fontFamily:"'DM Mono', monospace", fontSize:11, color:'var(--text-dim)', letterSpacing:1, textTransform:'uppercase', marginBottom:14, display:'flex', alignItems:'center', gap:8 } }, h(ShareIcon), ' Create Download Link'),
      h('div', {
        onDragOver: onLinkDragOver, onDragLeave: onLinkDragLeave, onDrop: onLinkDrop,
        onClick: function() {
          if (myId && !isPackagingZip) {
            openPicker('link-file-input');
          }
        },
        style: { border: '2px dashed ' + (linkDragging ? '#818cf8' : 'var(--border)'), borderRadius:14, padding:'32px 20px', textAlign:'center', cursor: !myId ? 'not-allowed' : isPackagingZip ? 'wait' : 'pointer', transition:'all 0.3s', background: linkDragging ? 'rgba(99,102,241,0.08)' : 'transparent', opacity: !myId ? 0.5 : isPackagingZip ? 0.78 : 1 },
        onMouseEnter: function(e) { if (!linkDragging && myId && !isPackagingZip) { e.currentTarget.style.borderColor='var(--border-active)'; e.currentTarget.style.background='var(--surface-2)'; } },
        onMouseLeave: function(e) { if (!linkDragging) { e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.background='transparent'; } }
      },
        h('div', { style: { marginBottom:10 } }, h(LinkDropIcon, { stroke: linkDragging ? '#818cf8' : 'var(--text-dim)', style: { transition:'all 0.3s' } })),
        h('div', { style: { fontSize:14, fontWeight:500, marginBottom:4, color: linkDragging ? '#818cf8' : 'var(--text)' } }, linkDragging ? 'Drop to create link' : 'Drop files or folders to create a shareable link'),
        h('div', { style: { color:'var(--text-dim)', fontSize:12, fontWeight:300 } }, 'Anyone with the link can download directly from your browser · folders are zipped under their own name'),
        h('div', { style: { display:'flex', justifyContent:'center', gap:10, flexWrap:'wrap', marginTop:14 } },
          h('button', {
            onClick: function(e) { openPicker('link-file-input', e); },
            disabled: !myId || isPackagingZip,
            style: { padding:'8px 14px', borderRadius:9, border:'1px solid var(--border)', background:'var(--surface)', color:'var(--text-dim)', cursor: !myId || isPackagingZip ? 'not-allowed' : 'pointer', fontFamily:"'DM Mono', monospace", fontSize:11, opacity: !myId || isPackagingZip ? 0.6 : 1 }
          }, 'browse files'),
          h('button', {
            onClick: function(e) { openPicker('link-folder-input', e); },
            disabled: !myId || isPackagingZip,
            style: { padding:'8px 14px', borderRadius:9, border:'1px solid var(--border)', background:'var(--surface)', color:'var(--text-dim)', cursor: !myId || isPackagingZip ? 'not-allowed' : 'pointer', fontFamily:"'DM Mono', monospace", fontSize:11, opacity: !myId || isPackagingZip ? 0.6 : 1 }
          }, 'choose folder')
        ),
        h('input', { id: 'link-file-input', type: 'file', multiple: true, style: { display:'none' }, onChange: onLinkFileSelect, disabled: !myId || isPackagingZip }),
        h('input', { id: 'link-folder-input', type: 'file', webkitdirectory: true, multiple: true, style: { display:'none' }, onChange: onLinkFolderSelect, disabled: !myId || isPackagingZip })
      ),

      hostedFiles.length > 0 && h('div', { style: { marginTop:16 } },
        hostedFiles.map(function(hosted) {
          return h('div', { key: hosted.id, style: { display:'flex', alignItems:'flex-start', gap:12, padding:'12px 16px', background:'var(--surface-2)', border:'1px solid var(--border)', borderRadius:12, marginBottom:8, animation:'fadeUp 0.3s ease' } },
            h('div', { style: { width:38, height:38, borderRadius:8, background:'rgba(99,102,241,0.1)', border:'1px solid rgba(99,102,241,0.3)', display:'flex', alignItems:'center', justifyContent:'center', color:'#818cf8', flexShrink:0 } }, h(FileIcon)),
            h('div', { style: { flex:1, minWidth:0 } },
              h('div', { style: { fontWeight:500, fontSize:13, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' } }, hosted.file.name),
              h('div', { style: { display:'flex', gap:8, flexWrap:'wrap', marginTop:8 } },
                h('button', {
                  onClick: function() { copyLink(hosted.link, hosted.id); },
                  style: { display:'flex', alignItems:'center', gap:5, padding:'6px 12px', borderRadius:7, border: '1px solid ' + (linkCopied === hosted.id ? 'var(--accent-dim)' : 'var(--border)'), background: linkCopied === hosted.id ? 'var(--accent-glow)' : 'var(--surface)', color: linkCopied === hosted.id ? 'var(--accent)' : 'var(--text-dim)', cursor:'pointer', fontFamily:"'DM Mono', monospace", fontSize:11, transition:'all 0.2s' },
                  onMouseEnter: function(e) { e.currentTarget.style.borderColor='var(--border-active)'; },
                  onMouseLeave: function(e) { e.currentTarget.style.borderColor = linkCopied === hosted.id ? 'var(--accent-dim)' : 'var(--border)'; }
                }, linkCopied === hosted.id ? [h(CheckIcon, { key:'c' }), ' copied'] : [h(CopyIcon, { key:'c' }), ' copy link']),
                h('button', {
                  onClick: function() {
                    showQrCode(
                      hosted.file.name,
                      hosted.link,
                      'Scan to download this file directly from the host browser.',
                      buildDownloadQrValue(myId, hosted.id)
                    );
                  },
                  style: { display:'flex', alignItems:'center', gap:5, padding:'6px 10px', borderRadius:7, border:'1px solid var(--border)', background:'var(--surface)', color:'var(--text-dim)', cursor:'pointer', fontFamily:"'DM Mono', monospace", fontSize:11, transition:'all 0.2s' },
                  onMouseEnter: function(e) { e.currentTarget.style.borderColor='var(--border-active)'; },
                  onMouseLeave: function(e) { e.currentTarget.style.borderColor='var(--border)'; }
                }, h(QrIcon), ' QR'),
                h('button', {
                  onClick: function() { removeHostedFile(hosted.id); },
                  style: { display:'flex', alignItems:'center', gap:5, padding:'6px 10px', borderRadius:7, border:'1px solid var(--border)', background:'var(--surface)', color:'var(--text-dim)', cursor:'pointer', fontFamily:"'DM Mono', monospace", fontSize:11, transition:'all 0.2s' },
                  onMouseEnter: function(e) { e.currentTarget.style.borderColor='var(--danger)'; e.currentTarget.style.color='var(--danger)'; },
                  onMouseLeave: function(e) { e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.color='var(--text-dim)'; }
                }, h(XIcon), ' cancel')
              ),
              h('div', { style: { color:'var(--text-dim)', fontSize:11, fontFamily:"'DM Mono', monospace", marginTop:2 } }, formatBytes(hosted.file.size) + ' · ' + (hosted.folderCount === 1 && hosted.sourceCount === 1 ? 'folder zipped for sharing' : hosted.folderCount > 0 ? hosted.sourceCount + ' items zipped for sharing' : hosted.sourceCount > 1 ? hosted.sourceCount + ' files zipped for sharing' : 'sharing via link'))
            )
          );
        }),
        h('div', { style: { fontFamily:"'DM Mono', monospace", fontSize:11, color:'var(--warning)', marginTop:8, paddingLeft:4, opacity:0.8 } }, 'keep this tab open - files are served from your browser')
      )
    ),

    isDownloading && h('div', { style: { background:'var(--surface)', border:'1px solid rgba(99,102,241,0.4)', borderRadius:16, padding:'40px 26px', marginBottom:20, animation:'fadeUp 0.3s ease', textAlign:'center' } },
      h('div', { style: { width:56, height:56, borderRadius:'50%', background:'rgba(99,102,241,0.1)', border:'1px solid rgba(99,102,241,0.3)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px', animation:'ripple 2s infinite' } }, h(DownloadIcon)),
      h('h3', { style: { fontFamily:"'Outfit', sans-serif", fontWeight:600, fontSize:18, marginBottom:8 } }, 'Downloading File'),
      h('p', { style: { color:'var(--text-dim)', fontSize:13, fontFamily:"'DM Mono', monospace" } }, downloadProgress || 'Preparing...')
    ),

    transfers.length > 0 && h('div', { style: { animation:'fadeUp 0.3s ease' } },
      h('div', { style: { fontFamily:"'DM Mono', monospace", fontSize:11, color:'var(--text-dim)', letterSpacing:1, textTransform:'uppercase', marginBottom:12, paddingLeft:4 } }, 'Transfers'),
      [].concat(transfers).reverse().map(function(t, i) { return h(TransferItem, { key: i, file: t, direction: t.direction }); })
    ),

    qrModal && h(QrModal, {
      title: qrModal.title,
      value: qrModal.value,
      qrValue: qrModal.qrValue,
      subtitle: qrModal.subtitle,
      onClose: closeQrModal,
      onCopy: copyQrValue
    }),
    scannerOpen && h(ScannerModal, {
      onClose: closeScanner,
      onScan: handleScannerResult
    }),

    toast && h(Toast, { key: toast.key, message: toast.message, type: toast.type, onDone: clearToast }),

    h('div', { style: { textAlign:'center', marginTop:48, fontFamily:"'DM Mono', monospace", fontSize:11, color:'var(--text-dim)', opacity:0.5 } }, 'files never touch a server · share links or connect directly · powered by WebRTC')
  );
};
