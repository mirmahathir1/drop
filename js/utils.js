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

function getAppBaseUrl() {
  return window.location.origin + window.location.pathname;
}

function isGeneratedPeerId(value) {
  return /^[a-z]+-[a-z]+-\d+$/i.test(value || '');
}

function buildConnectHash(peerId) {
  return '#connect=' + encodeURIComponent(peerId || '');
}

function buildConnectQrValue(peerId) {
  return 'c:' + (peerId || '');
}

function buildConnectLink(peerId) {
  return getAppBaseUrl() + buildConnectHash(peerId);
}

function buildDownloadHash(peerId, fileId) {
  var hash = '#dl=' + encodeURIComponent(peerId || '');
  if (fileId) {
    hash += '&file=' + encodeURIComponent(fileId);
  }
  return hash;
}

function buildDownloadQrValue(peerId, fileId) {
  return 'd:' + (peerId || '') + (fileId ? ':' + fileId : '');
}

function buildDownloadLink(peerId, fileId) {
  return getAppBaseUrl() + buildDownloadHash(peerId, fileId);
}

function parseDropLink(value) {
  if (!value) return null;

  var trimmed = String(value).trim();
  if (!trimmed) return null;

  var candidate = trimmed;
  if (candidate.indexOf('#') === 0) {
    candidate = getAppBaseUrl() + candidate;
  }

  if (trimmed.indexOf('c:') === 0) {
    var compactConnectId = trimmed.slice(2).trim();
    if (isGeneratedPeerId(compactConnectId)) {
      return { type: 'connect', id: compactConnectId, url: buildConnectLink(compactConnectId) };
    }
    return null;
  }

  if (trimmed.indexOf('d:') === 0) {
    var compactParts = trimmed.split(':');
    var compactDownloadId = compactParts[1] || '';
    var compactFileId = compactParts[2] || '';

    if (isGeneratedPeerId(compactDownloadId)) {
      return {
        type: 'download',
        id: compactDownloadId,
        fileId: compactFileId,
        url: buildDownloadLink(compactDownloadId, compactFileId)
      };
    }
    return null;
  }

  try {
    var url = new URL(candidate, window.location.href);
    var hash = url.hash || '';
    var params = new URLSearchParams(hash.charAt(0) === '#' ? hash.slice(1) : hash);
    var connectId = params.get('connect');
    var downloadId = params.get('dl');
    var fileId = params.get('file');

    if (connectId && isGeneratedPeerId(connectId)) {
      return { type: 'connect', id: connectId, url: url.toString() };
    }

    if (downloadId && isGeneratedPeerId(downloadId)) {
      return {
        type: 'download',
        id: downloadId,
        fileId: fileId || '',
        url: url.toString()
      };
    }
  } catch (err) {}

  if (isGeneratedPeerId(trimmed)) {
    return { type: 'connect', id: trimmed, url: buildConnectLink(trimmed) };
  }

  return null;
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
