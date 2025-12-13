// Declaración de tipos para TypeScript
export interface Subdirectory {
  name: string;
  path: string;
}

export interface ImageMetadata {
  path: string;
  name: string;
  size: number;
  modifiedTime: number;
  createdTime: number;
  modified?: number;
  width?: number;
  height?: number;
}

export interface ThumbnailRequest {
  filePath: string;
  thumbnailSize: number;
}

export interface ThumbnailResult {
  cacheKey: string;
  thumbPath: string;
  fromCache: boolean;
}

export interface MoveFileResult {
  success: boolean;
  exists: boolean;
  targetPath?: string;
  error?: string;
}

export interface ElectronAPI {
  openDirectoryDialog: () => Promise<string | null>;
  getImagesFromDirectory: (directoryPath: string) => Promise<string[]>;
  getImageMetadata: (imagePaths: string[]) => Promise<ImageMetadata[]>;
  getExplorerDateOrder: (directoryPath: string, descending: boolean) => Promise<string[] | null>;
  organizeByYear: (directoryPath: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  getSingleImageMetadata: (imagePath: string) => Promise<ImageMetadata | null>;
  getSubdirectories: (directoryPath: string) => Promise<Subdirectory[]>;
  generateThumbnail: (request: ThumbnailRequest) => Promise<ThumbnailResult | null>;
  generateThumbnailBatch: (requests: ThumbnailRequest[]) => Promise<ThumbnailResult[]>;
  getCacheSize: () => Promise<number>;
  clearCache: () => Promise<boolean>;
  runCacheEviction: () => Promise<boolean>;
  createFolder: (parentPath: string, folderName: string) => Promise<boolean>;
  moveToTrash: (filePath: string) => Promise<boolean>;
  moveFile: (filePath: string, targetDirectory: string, newFileName?: string) => Promise<MoveFileResult>;
  deleteFile: (filePath: string) => Promise<boolean>;
  windowMinimize: () => void;
  windowMaximize: () => void;
  windowClose: () => void;
  onDirectoryOpened: (callback: (directoryPath: string) => void) => void;
  onDirectoryClosed: (callback: () => void) => void;
  onDestinationDirectoriesUpdated: (callback: (directories: string[]) => void) => void;
  onOpenWithFile: (callback: (filePath: string) => void) => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
