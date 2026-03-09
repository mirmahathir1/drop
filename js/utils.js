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

function buildArchiveTimestamp() {
  var now = new Date();
  return (
    String(now.getFullYear()) +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0') +
    '-' +
    String(now.getHours()).padStart(2, '0') +
    String(now.getMinutes()).padStart(2, '0') +
    String(now.getSeconds()).padStart(2, '0')
  );
}

function normalizeArchiveSegment(name, fallback) {
  var value = String(name || '')
    .replace(/[\\/]+/g, ' ')
    .replace(/[\u0000-\u001f\u007f]+/g, '')
    .trim();

  return value || (fallback || 'file');
}

function normalizeArchivePath(path, fallback) {
  var raw = String(path || '');
  var normalized = raw
    .split('/')
    .map(function(part) { return normalizeArchiveSegment(part, ''); })
    .filter(function(part) { return !!part; })
    .join('/');

  return normalized || normalizeArchiveSegment(fallback || 'file');
}

function buildArchiveFileName(itemCount, noun) {
  var label = normalizeArchiveSegment(noun || 'files', 'files');
  var timestamp = buildArchiveTimestamp();

  return 'drop-' + Math.max(1, itemCount || 0) + '-' + label + '-' + timestamp + '.zip';
}

function buildNamedArchiveFileName(name) {
  return normalizeArchiveSegment(name, 'folder') + '.zip';
}

function ensureUniqueArchiveEntryName(name, usedNames) {
  var taken = usedNames || {};
  var safeName = normalizeArchivePath(name, 'file');

  if (!taken[safeName]) {
    taken[safeName] = true;
    return safeName;
  }

  var slashIndex = safeName.lastIndexOf('/');
  var dir = slashIndex >= 0 ? safeName.slice(0, slashIndex + 1) : '';
  var leaf = slashIndex >= 0 ? safeName.slice(slashIndex + 1) : safeName;
  var dotIndex = leaf.lastIndexOf('.');
  var base = dotIndex > 0 ? leaf.slice(0, dotIndex) : leaf;
  var ext = dotIndex > 0 ? leaf.slice(dotIndex) : '';
  var suffix = 2;
  var candidate = dir + base + '-' + suffix + ext;

  while (taken[candidate]) {
    suffix += 1;
    candidate = dir + base + '-' + suffix + ext;
  }

  taken[candidate] = true;
  return candidate;
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
  return buildConnectLink(peerId);
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
  return buildDownloadLink(peerId, fileId);
}

async function copyTextToClipboard(value) {
  var text = String(value || '');

  if (!text) {
    throw new Error('Nothing to copy.');
  }

  if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function' && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }

  var textarea = document.createElement('textarea');
  var selection = document.getSelection ? document.getSelection() : null;
  var originalRange = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
  var activeElement = document.activeElement;

  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.top = '-1000px';
  textarea.style.left = '-1000px';
  textarea.style.opacity = '0';

  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  textarea.setSelectionRange(0, textarea.value.length);

  var copied = false;
  try {
    copied = document.execCommand('copy');
  } finally {
    document.body.removeChild(textarea);

    if (selection) {
      selection.removeAllRanges();
      if (originalRange) {
        selection.addRange(originalRange);
      }
    }

    if (activeElement && typeof activeElement.focus === 'function') {
      activeElement.focus();
    }
  }

  if (!copied) {
    throw new Error('Clipboard copy failed.');
  }
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

function renderDownloadPromptWindow(win) {
  if (!win || win.closed) return;

  try {
    win.document.open();
    win.document.write(
      '<!DOCTYPE html><html><head><title>Drop download helper</title></head><body style="margin:0;font-family:Outfit,sans-serif;background:#0a0a0c;color:#e8e8ed;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:24px;text-align:center;"><div><div style="font-family:DM Mono,monospace;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#6ee7b7;margin-bottom:12px;">drop</div><h1 style="margin:0 0 12px;font-size:24px;font-weight:600;">Waiting for file</h1><p style="margin:0;color:#8888a0;line-height:1.6;max-width:320px;">Keep this small window open. It will be used to trigger the browser download prompt when a file finishes receiving.</p></div></body></html>'
    );
    win.document.close();
  } catch (err) {}
}

function primeDownloadPromptWindow(existingWindow) {
  var popup = existingWindow && !existingWindow.closed
    ? existingWindow
    : window.open('', 'drop-download-helper', 'popup,width=420,height=360');

  if (!popup) return null;

  renderDownloadPromptWindow(popup);
  return popup;
}

window.primeDownloadPromptWindow = primeDownloadPromptWindow;

function triggerDownloadWithHelperWindow(url, name, helperWindowRef) {
  var helper = helperWindowRef && helperWindowRef.current;
  if (!helper || helper.closed) return false;

  try {
    helper.focus();

    var doc = helper.document;
    doc.open();
    doc.write(
      '<!DOCTYPE html><html><head><title>Starting download</title></head><body style="margin:0;font-family:Outfit,sans-serif;background:#0a0a0c;color:#e8e8ed;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:24px;text-align:center;"><div><h1 style="margin:0 0 12px;font-size:22px;font-weight:600;">Starting download</h1><p style="margin:0;color:#8888a0;line-height:1.6;">If your browser asks, confirm the download.</p></div></body></html>'
    );
    doc.close();

    var link = doc.createElement('a');
    link.href = url;
    link.download = name || '';
    link.style.display = 'none';
    doc.body.appendChild(link);
    link.click();

    setTimeout(function() {
      if (helperWindowRef && helperWindowRef.current === helper && !helper.closed) {
        renderDownloadPromptWindow(helper);
      }
    }, 1200);

    return true;
  } catch (err) {
    console.error('Failed to trigger download in helper window:', err);
    return false;
  }
}

function triggerDownloadUrl(url, name, optionsArg) {
  var options = optionsArg || {};

  if (triggerDownloadWithHelperWindow(url, name, options.helperWindowRef)) {
    return;
  }

  var a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.style.display = 'none';
  document.body.appendChild(a);
  try {
    a.click();
  } finally {
    document.body.removeChild(a);
  }
}

async function triggerDownloadFromHandle(fileHandle, name, optionsArg) {
  var file = await fileHandle.getFile();
  var url = URL.createObjectURL(file);
  try {
    triggerDownloadUrl(url, name, optionsArg);
  } finally {
    setTimeout(function() { URL.revokeObjectURL(url); }, 4000);
  }
}

async function downloadTransferFile(file, optionsArg) {
  if (file.fileHandle) {
    return triggerDownloadFromHandle(file.fileHandle, file.name, optionsArg);
  }
  if (file.url) {
    triggerDownloadUrl(file.url, file.name, optionsArg);
  }
}
