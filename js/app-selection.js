var DropApp = window.DropApp || (window.DropApp = {});

DropApp.createSelectionController = function createSelectionController(options) {
  var showToast = options.showToast;
  var setZipProgress = options.setZipProgress;
  var zipTaskIdRef = options.zipTaskIdRef;
  var zipBusyRef = options.zipBusyRef;

  function getSelectedFiles(fileList) {
    return Array.prototype.slice.call(fileList || []).filter(function(file) {
      return !!file && typeof file.size === 'number' && typeof file.name === 'string';
    });
  }

  function totalSizeFromFiles(files) {
    var total = 0;

    for (var i = 0; i < files.length; i++) {
      total += files[i].size || 0;
    }

    return total;
  }

  function describeSelection(selection) {
    if (!selection || !selection.itemCount) return '0 items';
    if (selection.folderCount === 1 && selection.itemCount === 1) return '1 folder';
    if (selection.folderCount > 0) return selection.itemCount + ' items';
    return selection.itemCount + ' files';
  }

  function finalizeSelection(selection) {
    var next = selection || {
      entries: [],
      directories: [],
      itemCount: 0,
      folderCount: 0,
      looseFileCount: 0,
      topLevelNames: []
    };

    next.entries = next.entries || [];
    next.directories = next.directories || [];
    next.topLevelNames = next.topLevelNames || [];
    next.itemCount = next.itemCount || next.topLevelNames.length;
    next.folderCount = next.folderCount || 0;
    next.looseFileCount = next.looseFileCount || 0;
    next.isSinglePlainFile =
      next.folderCount === 0 &&
      next.looseFileCount === 1 &&
      next.itemCount === 1 &&
      next.entries.length === 1;
    next.isSingleFolder =
      next.folderCount === 1 &&
      next.looseFileCount === 0 &&
      next.itemCount === 1;

    return next;
  }

  function buildSelectionFromFileList(fileList) {
    var files = getSelectedFiles(fileList);
    var selection = {
      entries: [],
      directories: [],
      itemCount: 0,
      folderCount: 0,
      looseFileCount: 0,
      topLevelNames: []
    };
    var folderRoots = {};

    for (var i = 0; i < files.length; i++) {
      var file = files[i];
      var relativePath = file.webkitRelativePath || '';

      if (relativePath && relativePath.indexOf('/') !== -1) {
        var archivePath = normalizeArchivePath(relativePath, file.name);
        var rootName = archivePath.split('/')[0];

        selection.entries.push({
          file: file,
          archivePath: archivePath,
          label: relativePath
        });

        if (!folderRoots[rootName]) {
          folderRoots[rootName] = true;
          selection.folderCount += 1;
          selection.itemCount += 1;
          selection.topLevelNames.push(rootName);
        }
      } else {
        selection.entries.push({
          file: file,
          archivePath: normalizeArchivePath(file.name, file.name),
          label: file.name
        });
        selection.looseFileCount += 1;
        selection.itemCount += 1;
        selection.topLevelNames.push(file.name);
      }
    }

    return finalizeSelection(selection);
  }

  function getDataTransferItemEntry(item) {
    if (!item) return null;
    if (typeof item.getAsEntry === 'function') return item.getAsEntry();
    if (typeof item.webkitGetAsEntry === 'function') return item.webkitGetAsEntry();
    return null;
  }

  function readFileFromEntry(entry) {
    return new Promise(function(resolve, reject) {
      entry.file(resolve, reject);
    });
  }

  function readAllDirectoryEntries(reader) {
    return new Promise(function(resolve, reject) {
      var entries = [];

      function readBatch() {
        reader.readEntries(
          function(batch) {
            if (!batch || !batch.length) {
              resolve(entries);
              return;
            }

            entries = entries.concat(Array.prototype.slice.call(batch));
            readBatch();
          },
          function(err) {
            reject(err);
          }
        );
      }

      readBatch();
    });
  }

  async function collectDroppedEntry(entry, parentPath, selection) {
    var nextPath = parentPath ? parentPath + '/' + entry.name : entry.name;

    if (entry.isDirectory) {
      selection.directories.push(normalizeArchivePath(nextPath, entry.name));

      var children = await readAllDirectoryEntries(entry.createReader());
      for (var i = 0; i < children.length; i++) {
        await collectDroppedEntry(children[i], nextPath, selection);
      }
      return;
    }

    if (!entry.isFile) return;

    var file = await readFileFromEntry(entry);
    selection.entries.push({
      file: file,
      archivePath: normalizeArchivePath(nextPath, file.name),
      label: nextPath
    });
  }

  async function buildSelectionFromDrop(dataTransfer) {
    var items = Array.prototype.slice.call((dataTransfer && dataTransfer.items) || []).filter(function(item) {
      return item && item.kind === 'file';
    });
    var droppedEntries = [];

    for (var i = 0; i < items.length; i++) {
      var entry = getDataTransferItemEntry(items[i]);
      if (entry) {
        droppedEntries.push(entry);
      }
    }

    if (!droppedEntries.length) {
      return buildSelectionFromFileList(dataTransfer && dataTransfer.files);
    }

    var selection = {
      entries: [],
      directories: [],
      itemCount: 0,
      folderCount: 0,
      looseFileCount: 0,
      topLevelNames: []
    };

    for (var j = 0; j < droppedEntries.length; j++) {
      var droppedEntry = droppedEntries[j];

      selection.itemCount += 1;
      selection.topLevelNames.push(droppedEntry.name || 'item');

      if (droppedEntry.isDirectory) {
        selection.folderCount += 1;
      } else {
        selection.looseFileCount += 1;
      }

      await collectDroppedEntry(droppedEntry, '', selection);
    }

    return finalizeSelection(selection);
  }

  async function buildSelectionFile(selection, action) {
    var nextSelection = finalizeSelection(selection);

    if (!nextSelection.entries.length && !nextSelection.directories.length) {
      showToast('No files were found in that selection.', 'error');
      return null;
    }

    if (nextSelection.isSinglePlainFile) {
      return {
        file: nextSelection.entries[0].file,
        sourceCount: 1,
        folderCount: 0
      };
    }

    if (!window.JSZip || typeof window.JSZip !== 'function') {
      showToast('Zip support is unavailable right now. Refresh and try again.', 'error');
      return null;
    }

    if (zipBusyRef.current) {
      showToast('A zip archive is already being prepared.', 'info');
      return null;
    }

    var archiveName = nextSelection.isSingleFolder
      ? buildNamedArchiveFileName(nextSelection.topLevelNames[0])
      : buildArchiveFileName(
          nextSelection.itemCount || nextSelection.entries.length || 1,
          nextSelection.folderCount > 0 ? 'items' : 'files'
        );
    var totalBytes = totalSizeFromFiles(
      nextSelection.entries.map(function(entry) { return entry.file; })
    );
    var jobId = ++zipTaskIdRef.current;
    var zip = new window.JSZip();
    var usedNames = {};
    var directories = nextSelection.directories.slice().sort(function(a, b) {
      return a.length - b.length;
    });

    zipBusyRef.current = true;
    setZipProgress({
      action: action,
      name: archiveName,
      sourceLabel: describeSelection(nextSelection),
      totalBytes: totalBytes,
      percent: 0,
      currentFile: nextSelection.entries[0]
        ? nextSelection.entries[0].label
        : nextSelection.topLevelNames[0] || archiveName
    });

    try {
      for (var d = 0; d < directories.length; d++) {
        zip.folder(directories[d]);
      }

      for (var f = 0; f < nextSelection.entries.length; f++) {
        var sourceEntry = nextSelection.entries[f];
        zip.file(
          ensureUniqueArchiveEntryName(sourceEntry.archivePath, usedNames),
          sourceEntry.file,
          { binary: true }
        );
      }

      var blob = await zip.generateAsync(
        {
          type: 'blob',
          compression: 'DEFLATE',
          compressionOptions: { level: 6 }
        },
        function(metadata) {
          if (zipTaskIdRef.current !== jobId) return;

          setZipProgress({
            action: action,
            name: archiveName,
            sourceLabel: describeSelection(nextSelection),
            totalBytes: totalBytes,
            percent: Math.max(1, Math.min(100, Math.round(metadata.percent || 0))),
            currentFile: metadata.currentFile || ''
          });
        }
      );

      var archiveFile;

      try {
        archiveFile = new File([blob], archiveName, {
          type: 'application/zip',
          lastModified: Date.now()
        });
      } catch (fileErr) {
        archiveFile = blob;
        archiveFile.name = archiveName;
        archiveFile.lastModified = Date.now();
      }

      return {
        file: archiveFile,
        sourceCount: nextSelection.itemCount,
        folderCount: nextSelection.folderCount
      };
    } catch (err) {
      console.error('Failed to create zip archive:', err);
      showToast('Failed to create the zip archive.', 'error');
      return null;
    } finally {
      if (zipTaskIdRef.current === jobId) {
        zipBusyRef.current = false;
        setZipProgress(null);
      }
    }
  }

  return {
    buildSelectionFile: buildSelectionFile,
    buildSelectionFromDrop: buildSelectionFromDrop,
    buildSelectionFromFileList: buildSelectionFromFileList
  };
};
