import { contextBridge, ipcRenderer } from 'electron';

// Exponer APIs seguras al proceso renderer
contextBridge.exposeInMainWorld('electronAPI', {
  openDirectoryDialog: () => ipcRenderer.invoke('open-directory-dialog'),
  getImagesFromDirectory: (directoryPath: string) => 
    ipcRenderer.invoke('get-images-from-directory', directoryPath),
  getImageMetadata: (imagePaths: string[]) => 
    ipcRenderer.invoke('get-image-metadata', imagePaths),
  getExplorerDateOrder: (directoryPath: string, descending: boolean) =>
    ipcRenderer.invoke('get-explorer-date-order', directoryPath, descending),
  organizeByYear: (directoryPath: string) =>
    ipcRenderer.invoke('organize-by-year', directoryPath),
  getSubdirectories: (directoryPath: string) => 
    ipcRenderer.invoke('get-subdirectories', directoryPath),
  generateThumbnail: (request: any) => 
    ipcRenderer.invoke('generate-thumbnail', request),
  generateThumbnailBatch: (requests: any[]) => 
    ipcRenderer.invoke('generate-thumbnail-batch', requests),
  getCacheSize: () => 
    ipcRenderer.invoke('get-cache-size'),
  clearCache: () => 
    ipcRenderer.invoke('clear-cache'),
  runCacheEviction: () => 
    ipcRenderer.invoke('run-cache-eviction'),
  createFolder: (parentPath: string, folderName: string) => 
    ipcRenderer.invoke('create-folder', parentPath, folderName),
  renameFolder: (oldPath: string, newName: string) => 
    ipcRenderer.invoke('rename-folder', oldPath, newName),
  moveToTrash: (filePath: string) => 
    ipcRenderer.invoke('move-to-trash', filePath),
  moveFile: (filePath: string, targetDirectory: string, newFileName?: string) => 
    ipcRenderer.invoke('move-file', filePath, targetDirectory, newFileName),
  getSingleImageMetadata: (imagePath: string) =>
    ipcRenderer.invoke('get-single-image-metadata', imagePath),
  deleteFile: (filePath: string) =>
    ipcRenderer.invoke('delete-file', filePath),
  calculateHashes: (directoryPath: string, onProgress: (progress: any) => void) => {
    // Registrar listener para progreso
    ipcRenderer.on('hash-progress', (_event, progress) => onProgress(progress));
    // Iniciar cálculo
    return ipcRenderer.invoke('calculate-hashes', directoryPath);
  },
  findDuplicates: (hashes: any[], onProgress: (progress: any) => void) => {
    // El listener ya está registrado desde calculateHashes
    return ipcRenderer.invoke('find-duplicates', hashes);
  },
  getHashCacheSize: (directoryPath: string) =>
    ipcRenderer.invoke('get-hash-cache-size', directoryPath),
  saveHashCache: (directoryPath: string, hashes: any[]) =>
    ipcRenderer.invoke('save-hash-cache', directoryPath, hashes),
  showItemInFolder: (filePath: string) =>
    ipcRenderer.invoke('show-item-in-folder', filePath),
  openPath: (dirPath: string) =>
    ipcRenderer.invoke('open-path', dirPath),
  copyImageToClipboard: (filePath: string) =>
    ipcRenderer.invoke('copy-image-to-clipboard', filePath),
  clearHashCache: (directoryPath: string) =>
    ipcRenderer.invoke('clear-hash-cache', directoryPath),
  windowMinimize: () => ipcRenderer.send('window-minimize'),
  windowMaximize: () => ipcRenderer.send('window-maximize'),
  windowClose: () => ipcRenderer.send('window-close'),
  onDirectoryOpened: (callback: (directoryPath: string) => void) => 
    ipcRenderer.on('directory-opened', (_event, directoryPath) => callback(directoryPath)),
  onDirectoryClosed: (callback: () => void) => 
    ipcRenderer.on('directory-closed', () => callback()),
  onDestinationDirectoriesUpdated: (callback: (directories: string[]) => void) => 
    ipcRenderer.on('destination-directories-updated', (_event, directories) => callback(directories)),
  onOpenWithFile: (callback: (filePath: string) => void) => 
    ipcRenderer.on('open-with-file', (_event, filePath) => callback(filePath)),
});
