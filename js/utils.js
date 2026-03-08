/* ─── Utility ─── */
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatEta(startTime, percent) {
  if (!startTime || percent <= 0) return '';
  const elapsed = (Date.now() - startTime) / 1000;
  const total = elapsed / (percent / 100);
  const remaining = Math.max(0, Math.ceil(total - elapsed));
  if (remaining < 1) return '< 1s';
  if (remaining < 60) return `${remaining}s`;
  const m = Math.floor(remaining / 60);
  const s = remaining % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

function generateId() {
  const words = [
    'amber','blaze','cedar','dawn','echo','frost','glow','haze','iris','jade',
    'kite','luna','mist','nova','opal','pine','quill','rain','sage','tide',
    'vale','wave','zeal','apex','bolt','core','dusk','edge','flux','grid'
  ];
  const w1 = words[Math.floor(Math.random() * words.length)];
  const w2 = words[Math.floor(Math.random() * words.length)];
  const num = Math.floor(Math.random() * 90 + 10);
  return `${w1}-${w2}-${num}`;
}

function sanitizeFileName(name) {
  return (name || 'download').replace(/[^a-zA-Z0-9._-]+/g, '_');
}

function triggerDownloadUrl(url, name) {
  var a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
}

async function triggerDownloadFromHandle(fileHandle, name) {
  var file = await fileHandle.getFile();
  var url = URL.createObjectURL(file);
  try {
    triggerDownloadUrl(url, name);
  } finally {
    setTimeout(function() { URL.revokeObjectURL(url); }, 1000);
  }
}

async function downloadTransferFile(file) {
  if (file.fileHandle) {
    return triggerDownloadFromHandle(file.fileHandle, file.name);
  }
  if (file.url) {
    triggerDownloadUrl(file.url, file.name);
  }
}
