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
  moveToTrash: (filePath: string) => 
    ipcRenderer.invoke('move-to-trash', filePath),
  moveFile: (filePath: string, targetDirectory: string, newFileName?: string) => 
    ipcRenderer.invoke('move-file', filePath, targetDirectory, newFileName),
  getSingleImageMetadata: (imagePath: string) =>
    ipcRenderer.invoke('get-single-image-metadata', imagePath),
  deleteFile: (filePath: string) =>
    ipcRenderer.invoke('delete-file', filePath),
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
