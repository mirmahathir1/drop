const { useState, useEffect, useRef, useCallback } = React;

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

/* ─── Connection Request Modal ─── */
function ConnectionModal({ fromId, onAccept, onReject }) {
  return h('div', {
    style: {
      position:'fixed', inset:0, zIndex:999,
      background:'rgba(0,0,0,0.7)', backdropFilter:'blur(8px)',
      display:'flex', alignItems:'center', justifyContent:'center',
      animation:'fadeIn 0.2s ease'
    }
  },
    h('div', {
      style: {
        background:'var(--surface)', border:'1px solid var(--border)',
        borderRadius:20, padding:'36px 40px', maxWidth:420, width:'90%',
        animation:'scaleIn 0.3s ease', textAlign:'center'
      }
    },
      h('div', {
        style: {
          width:56, height:56, borderRadius:'50%',
          background:'var(--accent-glow)', border:'1px solid var(--accent)',
          display:'flex', alignItems:'center', justifyContent:'center',
          margin:'0 auto 20px', animation:'ripple 2s infinite'
        }
      }, h(LinkIcon)),
      h('h3', {
        style: { fontFamily:"'Outfit', sans-serif", fontWeight:600, fontSize:20, marginBottom:8 }
      }, 'Incoming Connection'),
      h('p', {
        style: { color:'var(--text-dim)', fontSize:14, marginBottom:6 }
      }, 'Someone wants to connect with you'),
      h('p', {
        style: {
          fontFamily:"'DM Mono', monospace", fontSize:15,
          color:'var(--accent)', background:'var(--accent-glow)',
          padding:'8px 16px', borderRadius:8, display:'inline-block',
          marginBottom:28
        }
      }, fromId),
      h('div', { style: { display:'flex', gap:12, justifyContent:'center' } },
        h('button', {
          onClick: onReject,
          style: {
            fontFamily:"'Outfit', sans-serif", fontSize:14, fontWeight:500,
            padding:'10px 28px', borderRadius:10, border:'1px solid var(--border)',
            background:'var(--surface-2)', color:'var(--text-dim)', cursor:'pointer',
            transition:'all 0.2s'
          },
          onMouseEnter: function(e) { e.target.style.borderColor='var(--danger)'; e.target.style.color='var(--danger)'; },
          onMouseLeave: function(e) { e.target.style.borderColor='var(--border)'; e.target.style.color='var(--text-dim)'; }
        }, 'Decline'),
        h('button', {
          onClick: onAccept,
          style: {
            fontFamily:"'Outfit', sans-serif", fontSize:14, fontWeight:500,
            padding:'10px 28px', borderRadius:10, border:'1px solid var(--accent)',
            background:'var(--accent)', color:'#0a0a0c', cursor:'pointer',
            transition:'all 0.2s'
          },
          onMouseEnter: function(e) { e.target.style.background='#5dd4a6'; },
          onMouseLeave: function(e) { e.target.style.background='var(--accent)'; }
        }, 'Accept')
      )
    )
  );
}

/* ─── File Transfer Item ─── */
function TransferItem({ file, direction }) {
  const isReceived = direction === 'received';
  const download = async () => {
    try {
      await downloadTransferFile(file);
    } catch (err) {
      console.error('Download failed:', err);
    }
  };
  return h('div', {
    style: {
      display:'flex', alignItems:'center', gap:14,
      padding:'14px 18px', background:'var(--surface-2)',
      border:'1px solid var(--border)', borderRadius:14,
      animation:'fadeUp 0.3s ease', marginBottom:10
    }
  },
    h('div', {
      style: {
        width:42, height:42, borderRadius:10,
        background: isReceived ? 'var(--accent-glow)' : 'rgba(99,102,241,0.1)',
        border: '1px solid ' + (isReceived ? 'var(--accent-dim)' : 'rgba(99,102,241,0.3)'),
        display:'flex', alignItems:'center', justifyContent:'center',
        color: isReceived ? 'var(--accent)' : '#818cf8', flexShrink:0
      }
    }, h(FileIcon)),
    h('div', { style: { flex:1, minWidth:0 } },
      h('div', {
        style: { fontWeight:500, fontSize:14, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }
      }, file.name),
      h('div', {
        style: { color:'var(--text-dim)', fontSize:12, fontFamily:"'DM Mono', monospace", marginTop:2 }
      }, formatBytes(file.size) + ' · ' + (isReceived ? 'received' : 'sent'))
    ),
    isReceived && (file.url || file.fileHandle) && h('button', {
      onClick: download,
      style: {
        width:36, height:36, borderRadius:8,
        background:'var(--accent-glow)', border:'1px solid var(--accent-dim)',
        color:'var(--accent)', cursor:'pointer',
        display:'flex', alignItems:'center', justifyContent:'center',
        transition:'all 0.2s', flexShrink:0
      },
      onMouseEnter: function(e) { e.currentTarget.style.background='var(--accent-dim)'; },
      onMouseLeave: function(e) { e.currentTarget.style.background='var(--accent-glow)'; }
    }, h(DownloadIcon))
  );
}
