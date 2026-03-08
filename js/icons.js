/* ─── Icons (inline SVG) ─── */
const h = React.createElement;

const CopyIcon = () => (
  h('svg', { width:16, height:16, viewBox:'0 0 24 24', fill:'none', stroke:'currentColor', strokeWidth:2, strokeLinecap:'round', strokeLinejoin:'round' },
    h('rect', { x:9, y:9, width:13, height:13, rx:2, ry:2 }),
    h('path', { d:'M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1' })
  )
);
const CheckIcon = () => (
  h('svg', { width:16, height:16, viewBox:'0 0 24 24', fill:'none', stroke:'currentColor', strokeWidth:2, strokeLinecap:'round', strokeLinejoin:'round' },
    h('polyline', { points:'20 6 9 17 4 12' })
  )
);
const FileIcon = () => (
  h('svg', { width:20, height:20, viewBox:'0 0 24 24', fill:'none', stroke:'currentColor', strokeWidth:1.5, strokeLinecap:'round', strokeLinejoin:'round' },
    h('path', { d:'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z' }),
    h('polyline', { points:'14 2 14 8 20 8' })
  )
);
const DownloadIcon = () => (
  h('svg', { width:16, height:16, viewBox:'0 0 24 24', fill:'none', stroke:'currentColor', strokeWidth:2, strokeLinecap:'round', strokeLinejoin:'round' },
    h('path', { d:'M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4' }),
    h('polyline', { points:'7 10 12 15 17 10' }),
    h('line', { x1:12, y1:15, x2:12, y2:3 })
  )
);
const XIcon = () => (
  h('svg', { width:16, height:16, viewBox:'0 0 24 24', fill:'none', stroke:'currentColor', strokeWidth:2, strokeLinecap:'round', strokeLinejoin:'round' },
    h('line', { x1:18, y1:6, x2:6, y2:18 }),
    h('line', { x1:6, y1:6, x2:18, y2:18 })
  )
);
const LinkIcon = () => (
  h('svg', { width:18, height:18, viewBox:'0 0 24 24', fill:'none', stroke:'currentColor', strokeWidth:2, strokeLinecap:'round', strokeLinejoin:'round' },
    h('path', { d:'M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71' }),
    h('path', { d:'M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71' })
  )
);
const ShareIcon = () => (
  h('svg', { width:20, height:20, viewBox:'0 0 24 24', fill:'none', stroke:'currentColor', strokeWidth:1.5, strokeLinecap:'round', strokeLinejoin:'round' },
    h('circle', { cx:18, cy:5, r:3 }),
    h('circle', { cx:6, cy:12, r:3 }),
    h('circle', { cx:18, cy:19, r:3 }),
    h('line', { x1:8.59, y1:13.51, x2:15.42, y2:17.49 }),
    h('line', { x1:15.41, y1:6.51, x2:8.59, y2:10.49 })
  )
);
const UploadIcon = (props) => (
  h('svg', { width:40, height:40, viewBox:'0 0 24 24', fill:'none', stroke: props.stroke || 'var(--text-dim)', strokeWidth:1.5, strokeLinecap:'round', strokeLinejoin:'round', style: props.style },
    h('path', { d:'M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4' }),
    h('polyline', { points:'17 8 12 3 7 8' }),
    h('line', { x1:12, y1:3, x2:12, y2:15 })
  )
);
const LinkDropIcon = (props) => (
  h('svg', { width:28, height:28, viewBox:'0 0 24 24', fill:'none', stroke: props.stroke || 'var(--text-dim)', strokeWidth:1.5, strokeLinecap:'round', strokeLinejoin:'round', style: props.style },
    h('path', { d:'M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71' }),
    h('path', { d:'M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71' })
  )
);
