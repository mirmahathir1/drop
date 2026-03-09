const { useState, useEffect, useRef } = React;

/* ─── Toast Component ─── */
function Toast({ message, type, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3000);
    return () => clearTimeout(t);
  }, []);
  const bg = type === 'success' ? 'var(--accent-dim)' : type === 'error' ? '#7f1d1d' : 'var(--surface-2)';
  const borderColor = type === 'success' ? 'var(--accent)' : type === 'error' ? 'var(--danger)' : 'var(--border)';
  return h('div', {
    style: {
      position:'fixed', top:24, right:24, zIndex:1000,
      background: bg, border: '1px solid ' + borderColor,
      borderRadius:12, padding:'12px 20px',
      fontFamily:"'DM Mono', monospace", fontSize:13,
      color:'var(--text)', animation:'slideIn 0.3s ease',
      maxWidth: 340, boxShadow:'0 8px 32px rgba(0,0,0,0.4)'
    }
  }, message);
}

/* ─── QR Code Modal ─── */
function QrModal({ title, value, qrValue, subtitle, onClose, onCopy }) {
  const canvasRef = useRef(null);
  const [error, setError] = useState('');

  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === 'Escape') onClose();
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  useEffect(() => {
    var canvas = canvasRef.current;
    if (!canvas) return;

    if (!window.QRious || typeof window.QRious !== 'function') {
      setError('QR generation is unavailable right now.');
      return;
    }

    try {
      new window.QRious({
        element: canvas,
        value: qrValue || value,
        size: 240,
        level: 'L',
        foreground: '#0a0a0c',
        background: '#f8fafc'
      });
      setError('');
    } catch (err) {
      console.error('Failed to render QR code:', err);
      setError('Failed to render the QR code.');
    }
  }, [qrValue, value]);

  return h('div', {
    onClick: onClose,
    style: {
      position:'fixed', inset:0, zIndex:999,
      background:'rgba(0,0,0,0.72)', backdropFilter:'blur(8px)',
      display:'flex', alignItems:'center', justifyContent:'center',
      padding:'24px', animation:'fadeIn 0.2s ease'
    }
  },
    h('div', {
      onClick: function(e) { e.stopPropagation(); },
      style: {
        background:'var(--surface)', border:'1px solid var(--border)',
        borderRadius:24, padding:'28px', width:'100%', maxWidth:420,
        animation:'scaleIn 0.25s ease', boxShadow:'0 20px 80px rgba(0,0,0,0.45)'
      }
    },
      h('div', { style: { display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:16, marginBottom:22 } },
        h('div', null,
          h('div', { style: { fontFamily:"'DM Mono', monospace", fontSize:11, letterSpacing:1, textTransform:'uppercase', color:'var(--text-dim)', marginBottom:8 } }, 'QR code'),
          h('h3', { style: { fontFamily:"'Outfit', sans-serif", fontWeight:600, fontSize:22, lineHeight:1.1 } }, title),
          subtitle && h('p', { style: { marginTop:8, color:'var(--text-dim)', fontSize:13, lineHeight:1.5 } }, subtitle)
        ),
        h('button', {
          onClick: onClose,
          style: {
            width:34, height:34, borderRadius:10, border:'1px solid var(--border)',
            background:'var(--surface-2)', color:'var(--text-dim)', cursor:'pointer',
            display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0
          }
        }, h(XIcon))
      ),
      h('div', {
        style: {
          background:'#f8fafc', borderRadius:18, padding:'18px',
          display:'flex', alignItems:'center', justifyContent:'center',
          minHeight:276, marginBottom:18
        }
      },
        error
          ? h('p', { style: { color:'#0f172a', fontFamily:"'DM Mono', monospace", fontSize:12, textAlign:'center', maxWidth:220, lineHeight:1.6 } }, error)
          : h('canvas', { ref: canvasRef, width:240, height:240, style: { width:'100%', maxWidth:240, height:'auto', display:'block' } })
      ),
      h('div', {
        style: {
          padding:'12px 14px', borderRadius:14, background:'var(--surface-2)',
          border:'1px solid var(--border)', fontFamily:"'DM Mono', monospace",
          fontSize:11, color:'var(--text-dim)', wordBreak:'break-all',
          lineHeight:1.7, marginBottom:18
        }
      }, value),
      h('div', { style: { display:'flex', gap:10, flexWrap:'wrap' } },
        h('button', {
          onClick: onCopy,
          style: {
            flex:'1 1 160px', padding:'11px 16px', borderRadius:10,
            border:'1px solid var(--accent)', background:'var(--accent)',
            color:'#0a0a0c', cursor:'pointer', fontFamily:"'Outfit', sans-serif",
            fontSize:14, fontWeight:600
          }
        }, 'Copy link'),
        h('button', {
          onClick: onClose,
          style: {
            flex:'1 1 120px', padding:'11px 16px', borderRadius:10,
            border:'1px solid var(--border)', background:'var(--surface-2)',
            color:'var(--text-dim)', cursor:'pointer', fontFamily:"'Outfit', sans-serif",
            fontSize:14, fontWeight:500
          }
        }, 'Close')
      )
    )
  );
}

function QrCard({ title, subtitle, value, qrValue, onCopy, copied }) {
  const canvasRef = useRef(null);
  const [error, setError] = useState('');

  useEffect(() => {
    var canvas = canvasRef.current;
    if (!canvas) return;

    if (!window.QRious || typeof window.QRious !== 'function') {
      setError('QR generation is unavailable right now.');
      return;
    }

    try {
      new window.QRious({
        element: canvas,
        value: qrValue || value,
        size: 220,
        level: 'L',
        foreground: '#0a0a0c',
        background: '#f8fafc'
      });
      setError('');
    } catch (err) {
      console.error('Failed to render QR code:', err);
      setError('Failed to render the QR code.');
    }
  }, [qrValue, value]);

  return h('div', { className: 'surface-card qr-card', style: { animation:'fadeUp 0.35s ease' } },
    h('div', { className: 'section-label' }, 'Send link'),
    title && h('h3', { style: { fontFamily:"'Outfit', sans-serif", fontWeight:600, fontSize:24, lineHeight:1.1, marginBottom:8 } }, title),
    subtitle && h('p', { className: 'card-copy', style: { marginBottom:18 } }, subtitle),
    h('div', { className: 'qr-preview' },
      error
        ? h('p', { style: { color:'#0f172a', fontFamily:"'DM Mono', monospace", fontSize:12, textAlign:'center', maxWidth:220, lineHeight:1.6 } }, error)
        : h('canvas', { ref: canvasRef, width:220, height:220, style: { width:'100%', maxWidth:220, height:'auto', display:'block' } })
    ),
    h('div', { className: 'inline-actions', style: { marginTop:12 } },
      h('button', {
        onClick: onCopy,
        disabled: !value,
        className: copied ? 'ghost-button is-active' : 'primary-button'
      }, copied ? 'Copied' : 'Copy link')
    )
  );
}

/* ─── QR Scanner Modal ─── */
function ScannerModal({ onClose, onScan }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const frameRef = useRef(null);
  const streamRef = useRef(null);
  const onScanRef = useRef(onScan);
  const [statusText, setStatusText] = useState('Requesting camera access...');
  const [error, setError] = useState('');

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    var cancelled = false;

    function stopStream(stream) {
      if (!stream) return;
      var tracks = stream.getTracks ? stream.getTracks() : [];
      for (var i = 0; i < tracks.length; i++) {
        tracks[i].stop();
      }
    }

    function onKeyDown(e) {
      if (e.key === 'Escape') onClose();
    }

    async function start() {
      if (!window.isSecureContext) {
        setError('Camera scanning requires HTTPS or localhost. This page is not running in a secure context.');
        setStatusText('');
        return;
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError('Camera APIs are unavailable in this browser context.');
        setStatusText('');
        return;
      }

      if (!window.jsQR) {
        setError('QR scanning failed to load.');
        setStatusText('');
        return;
      }

      try {
        var stream;

        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: 'environment' } },
            audio: false
          });
        } catch (primaryErr) {
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        }

        if (cancelled) {
          stopStream(stream);
          return;
        }

        streamRef.current = stream;

        var video = videoRef.current;
        if (!video) {
          stopStream(stream);
          return;
        }

        video.srcObject = stream;
        video.setAttribute('playsinline', 'true');

        try {
          await video.play();
        } catch (err) {}

        setStatusText('Point the camera at a Drop QR code.');

        function scanFrame() {
          var liveVideo = videoRef.current;
          var canvas = canvasRef.current;
          if (!liveVideo || !canvas) return;

          if (liveVideo.readyState >= 2 && liveVideo.videoWidth > 0 && liveVideo.videoHeight > 0) {
            canvas.width = liveVideo.videoWidth;
            canvas.height = liveVideo.videoHeight;

            var ctx = canvas.getContext('2d', { willReadFrequently: true });
            ctx.drawImage(liveVideo, 0, 0, canvas.width, canvas.height);

            var imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            var code = window.jsQR(imageData.data, imageData.width, imageData.height, {
              inversionAttempts: 'dontInvert'
            });

            if (code && code.data) {
              onScanRef.current(code.data);
              return;
            }
          }

          frameRef.current = requestAnimationFrame(scanFrame);
        }

        frameRef.current = requestAnimationFrame(scanFrame);
      } catch (err) {
        console.error('Failed to start camera preview:', err);
        if (err && err.name === 'NotAllowedError') {
          setError('Camera permission was denied.');
        } else if (err && err.name === 'NotFoundError') {
          setError('No camera was found on this device.');
        } else {
          setError('Unable to open the camera preview.');
        }
        setStatusText('');
      }
    }

    window.addEventListener('keydown', onKeyDown);
    start();

    return function() {
      cancelled = true;
      window.removeEventListener('keydown', onKeyDown);
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      stopStream(streamRef.current);
      streamRef.current = null;
    };
  }, [onClose]);

  return h('div', {
    onClick: onClose,
    style: {
      position:'fixed', inset:0, zIndex:999,
      background:'rgba(0,0,0,0.78)', backdropFilter:'blur(8px)',
      display:'flex', alignItems:'center', justifyContent:'center',
      padding:'20px', animation:'fadeIn 0.2s ease'
    }
  },
    h('div', {
      onClick: function(e) { e.stopPropagation(); },
      style: {
        background:'var(--surface)', border:'1px solid var(--border)',
        borderRadius:24, width:'100%', maxWidth:480, padding:'24px',
        animation:'scaleIn 0.25s ease', boxShadow:'0 20px 80px rgba(0,0,0,0.45)'
      }
      },
      h('div', { style: { display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:16, marginBottom:18 } },
        h('div', null,
          h('h3', { style: { fontFamily:"'Outfit', sans-serif", fontWeight:600, fontSize:22, lineHeight:1.1 } }, 'Scan QR code'),
          h('p', { style: { marginTop:8, color:'var(--text-dim)', fontSize:13, lineHeight:1.5 } }, 'Scan a direct-connect or download QR code to open it here.')
        ),
        h('button', {
          onClick: onClose,
          style: {
            width:34, height:34, borderRadius:10, border:'1px solid var(--border)',
            background:'var(--surface-2)', color:'var(--text-dim)', cursor:'pointer',
            display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0
          }
        }, h(XIcon))
      ),
      h('div', {
        style: {
          position:'relative', overflow:'hidden', borderRadius:20,
          background:'#050507', border:'1px solid var(--border)',
          minHeight:320, display:'flex', alignItems:'center', justifyContent:'center'
        }
      },
        error
          ? h('div', { style: { padding:'24px', textAlign:'center', maxWidth:260 } },
              h('div', { style: { width:56, height:56, borderRadius:'50%', margin:'0 auto 16px', background:'rgba(248,113,113,0.12)', border:'1px solid rgba(248,113,113,0.35)', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--danger)' } }, h(CameraIcon)),
              h('p', { style: { color:'var(--text)', fontSize:14, lineHeight:1.6 } }, error)
            )
          : [
              h('video', {
                key: 'video',
                ref: videoRef,
                'data-drop-scanner': 'true',
                autoPlay: true,
                muted: true,
                playsInline: true,
                style: { width:'100%', height:'100%', objectFit:'cover', minHeight:320, display:'block' }
              }),
              h('div', {
                key: 'frame',
                style: {
                  position:'absolute', inset:'18% 18%',
                  border:'2px solid rgba(110,231,183,0.9)', borderRadius:20,
                  boxShadow:'0 0 0 999px rgba(0,0,0,0.18)', pointerEvents:'none'
                }
              })
            ]
      ),
      h('canvas', { ref: canvasRef, style: { display:'none' } }),
      h('div', {
        style: {
          marginTop:16, padding:'12px 14px', borderRadius:12,
          border:'1px solid var(--border)', background:'var(--surface-2)',
          color:error ? 'var(--danger)' : 'var(--text-dim)',
          fontFamily:"'DM Mono', monospace", fontSize:11, lineHeight:1.6
        }
      }, error || statusText),
      h('div', { style: { display:'flex', justifyContent:'flex-end', marginTop:16 } },
        h('button', {
          onClick: onClose,
          style: {
            padding:'10px 16px', borderRadius:10, border:'1px solid var(--border)',
            background:'var(--surface-2)', color:'var(--text-dim)', cursor:'pointer',
            fontFamily:"'Outfit', sans-serif", fontSize:14, fontWeight:500
          }
        }, 'Close')
      )
    )
  );
}

function ScannerPanel({ title, subtitle, onScan, enabled }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const frameRef = useRef(null);
  const streamRef = useRef(null);
  const onScanRef = useRef(onScan);
  const [statusText, setStatusText] = useState('Requesting camera access...');
  const [error, setError] = useState('');

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    var cancelled = false;

    function stopStream(stream) {
      if (!stream) return;
      var tracks = stream.getTracks ? stream.getTracks() : [];
      for (var i = 0; i < tracks.length; i++) {
        tracks[i].stop();
      }
    }

    if (enabled === false) {
      setStatusText('');
      setError('');
      return function() {
        if (frameRef.current) cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
        if (videoRef.current) {
          videoRef.current.srcObject = null;
        }
        stopStream(streamRef.current);
        streamRef.current = null;
      };
    }

    async function start() {
      if (!window.isSecureContext) {
        setError('Camera scanning requires HTTPS or localhost. This page is not running in a secure context.');
        setStatusText('');
        return;
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError('Camera APIs are unavailable in this browser context.');
        setStatusText('');
        return;
      }

      if (!window.jsQR) {
        setError('QR scanning failed to load.');
        setStatusText('');
        return;
      }

      try {
        var stream;

        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: 'environment' } },
            audio: false
          });
        } catch (primaryErr) {
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        }

        if (cancelled) {
          stopStream(stream);
          return;
        }

        streamRef.current = stream;

        var video = videoRef.current;
        if (!video) {
          stopStream(stream);
          return;
        }

        video.srcObject = stream;
        video.setAttribute('playsinline', 'true');

        try {
          await video.play();
        } catch (err) {}

        setStatusText('Point the camera at the sender QR code.');

        function scanFrame() {
          var liveVideo = videoRef.current;
          var canvas = canvasRef.current;
          if (!liveVideo || !canvas) return;

          if (liveVideo.readyState >= 2 && liveVideo.videoWidth > 0 && liveVideo.videoHeight > 0) {
            canvas.width = liveVideo.videoWidth;
            canvas.height = liveVideo.videoHeight;

            var ctx = canvas.getContext('2d', { willReadFrequently: true });
            ctx.drawImage(liveVideo, 0, 0, canvas.width, canvas.height);

            var imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            var code = window.jsQR(imageData.data, imageData.width, imageData.height, {
              inversionAttempts: 'dontInvert'
            });

            if (code && code.data) {
              if (frameRef.current) cancelAnimationFrame(frameRef.current);
              frameRef.current = null;
              stopStream(streamRef.current);
              streamRef.current = null;
              if (videoRef.current) {
                videoRef.current.srcObject = null;
              }
              setStatusText('QR code detected. Connecting...');
              onScanRef.current(code.data);
              return;
            }
          }

          frameRef.current = requestAnimationFrame(scanFrame);
        }

        frameRef.current = requestAnimationFrame(scanFrame);
      } catch (err) {
        console.error('Failed to start camera preview:', err);
        if (err && err.name === 'NotAllowedError') {
          setError('Camera permission was denied.');
        } else if (err && err.name === 'NotFoundError') {
          setError('No camera was found on this device.');
        } else {
          setError('Unable to open the camera preview.');
        }
        setStatusText('');
      }
    }

    start();

    return function() {
      cancelled = true;
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      stopStream(streamRef.current);
      streamRef.current = null;
    };
  }, [enabled]);

  return h('div', { className: 'surface-card', style: { animation:'fadeUp 0.35s ease' } },
    h('h3', { style: { fontFamily:"'Outfit', sans-serif", fontWeight:600, fontSize:24, lineHeight:1.1, marginBottom:8 } }, title),
    subtitle && h('p', { className: 'card-copy', style: { marginBottom:18 } }, subtitle),
    h('div', { className: 'scanner-preview' },
      error
        ? h('div', { style: { padding:'24px', textAlign:'center', maxWidth:260 } },
            h('div', { style: { width:56, height:56, borderRadius:'50%', margin:'0 auto 16px', background:'rgba(248,113,113,0.12)', border:'1px solid rgba(248,113,113,0.35)', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--danger)' } }, h(CameraIcon)),
            h('p', { style: { color:'var(--text)', fontSize:14, lineHeight:1.6 } }, error)
          )
        : [
            h('video', {
              key: 'video',
              ref: videoRef,
              'data-drop-scanner': 'true',
              autoPlay: true,
              muted: true,
              playsInline: true,
              style: { width:'100%', height:'100%', objectFit:'cover', minHeight:320, display:'block' }
            }),
            h('div', {
              key: 'frame',
              className: 'scanner-frame'
            })
          ]
    ),
    h('canvas', { ref: canvasRef, style: { display:'none' } }),
    h('div', {
      style: {
        marginTop:16, padding:'12px 14px', borderRadius:12,
        border:'1px solid var(--border)', background:'var(--surface-2)',
        color:error ? 'var(--danger)' : 'var(--text-dim)',
        fontFamily:"'DM Mono', monospace", fontSize:11, lineHeight:1.6
      }
    }, error || statusText)
  );
}

/* ─── File Transfer Item ─── */
function TransferItem({ file, direction, onDownload }) {
  const isReceived = direction === 'received';
  const isDownloadable = isReceived && (file.url || file.fileHandle);
  const isHighlighted = isDownloadable && !file.isDownloaded;
  const download = async () => {
    if (!isDownloadable) return;

    try {
      await downloadTransferFile(file);
      if (typeof onDownload === 'function') {
        onDownload(file);
      }
    } catch (err) {
      console.error('Download failed:', err);
    }
  };
  return h('div', {
    className:
      'transfer-item' +
      (isDownloadable ? ' is-downloadable' : '') +
      (isHighlighted ? ' is-highlighted' : ''),
    role: isDownloadable ? 'button' : null,
    tabIndex: isDownloadable ? 0 : null,
    onClick: isDownloadable ? function() { download(); } : null,
    onKeyDown: isDownloadable
      ? function(e) {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            download();
          }
        }
      : null,
    'aria-label': isDownloadable ? 'Download ' + file.name : null
  },
    h('div', { className: 'transfer-item__icon' }, h(FileIcon)),
    h('div', { className: 'transfer-item__body' },
      h('div', { className: 'transfer-item__title' }, file.name),
      h('div', { className: 'transfer-item__meta' }, formatBytes(file.size) + ' · ' + (isReceived ? 'received' : 'sent'))
    ),
    isDownloadable && h('button', {
      type: 'button',
      onClick: function(e) {
        e.stopPropagation();
        download();
      },
      className: 'transfer-item__action',
      'aria-label': 'Download ' + file.name
    }, h(DownloadIcon))
  );
}
