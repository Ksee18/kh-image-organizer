import { app, BrowserWindow, Menu, dialog, ipcMain, shell } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { promises as fsPromises } from 'fs';
import sharp from 'sharp';
import { logger } from './logger';
import { processThumbnailRequest, processThumbnailBatch, ThumbnailRequest } from './thumbnail-generator';
import { getCacheSize } from './cache-utils';
import { runCacheEviction, clearAllCache, startPeriodicEviction } from './cache-eviction';
import { exec } from 'child_process';
import { promisify } from 'util';
const { imageHash } = require('image-hash');

const execPromise = promisify(exec);

let mainWindow: BrowserWindow | null = null;
let currentDirectory: string | null = null;
let destinationDirectories: string[] = [];

function createWindow() {
  logger.info('Creando ventana principal');
  
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    transparent: true,
    frame: false,
    backgroundColor: '#00000000',
    title: 'KH Image Organizer',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  
  logger.info('Ventana creada', { width: 1280, height: 720 });

  // Maximizar la ventana al iniciar
  mainWindow.maximize();

  mainWindow.loadFile(path.join(__dirname, '../src/index.html'));

  // Crear el menú
  const menuTemplate: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'Archivo',
      submenu: [
        {
          label: 'Abrir directorio',
          accelerator: 'CmdOrCtrl+O',
          click: async () => {
            logger.info('Menú: Abrir directorio - iniciando');
            try {
              const result = await dialog.showOpenDialog(mainWindow!, {
                properties: ['openDirectory'],
              });
              logger.debug('Resultado del diálogo', { canceled: result.canceled, filePaths: result.filePaths });
              
              if (!result.canceled && result.filePaths.length > 0) {
                currentDirectory = result.filePaths[0];
                logger.info('Directorio seleccionado', { path: currentDirectory });
                mainWindow?.webContents.send('directory-opened', currentDirectory);
              } else {
                logger.info('Selección de directorio cancelada');
              }
            } catch (error) {
              logger.error('Error al abrir directorio desde menú', error);
            }
          },
        },
        {
          label: 'Cerrar directorio',
          accelerator: 'CmdOrCtrl+W',
          click: () => {
            currentDirectory = null;
            mainWindow?.webContents.send('directory-closed');
          },
        },
        { type: 'separator' },
        {
          label: 'Agregar directorios destino',
          click: async () => {
            const result = await dialog.showOpenDialog(mainWindow!, {
              properties: ['openDirectory', 'multiSelections'],
            });
            if (!result.canceled && result.filePaths.length > 0) {
              destinationDirectories.push(...result.filePaths);
              mainWindow?.webContents.send('destination-directories-updated', destinationDirectories);
            }
          },
        },
        {
          label: 'Limpiar directorios destino',
          click: () => {
            destinationDirectories = [];
            mainWindow?.webContents.send('destination-directories-updated', destinationDirectories);
          },
        },
        { type: 'separator' },
        {
          label: 'Salir',
          accelerator: 'CmdOrCtrl+Q',
          click: () => {
            app.quit();
          },
        },
      ],
    },
    {
      label: 'Ayuda',
      submenu: [
        {
          label: 'Abrir carpeta de logs',
          click: () => {
            const logPath = logger.getLogPath();
            const logDir = path.dirname(logPath);
            logger.info('Abriendo carpeta de logs', { logDir });
            require('electron').shell.openPath(logDir);
          },
        },
        {
          label: 'Ver DevTools',
          accelerator: 'F12',
          click: () => {
            mainWindow?.webContents.openDevTools();
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Manejar solicitud de apertura de directorio desde el renderer
ipcMain.handle('open-directory-dialog', async () => {
  logger.info('IPC: open-directory-dialog - iniciando');
  try {
    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: ['openDirectory'],
    });
    logger.debug('Resultado del diálogo IPC', { canceled: result.canceled, filePaths: result.filePaths });
    
    if (!result.canceled && result.filePaths.length > 0) {
      currentDirectory = result.filePaths[0];
      logger.info('Directorio seleccionado desde viewer', { path: currentDirectory });
      return currentDirectory;
    }
    logger.info('Selección de directorio cancelada desde viewer');
    return null;
  } catch (error) {
    logger.error('Error al abrir directorio desde viewer', error);
    return null;
  }
});

// Obtener imágenes del directorio
ipcMain.handle('get-images-from-directory', async (event, directoryPath: string) => {
  logger.info('IPC: get-images-from-directory', { directoryPath });
  try {
    const files = await fs.promises.readdir(directoryPath);
    logger.debug('Archivos encontrados en directorio', { count: files.length, files: files.slice(0, 10) });
    
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg', '.ico'];
    
    const imageFiles = files
      .filter(file => {
        const ext = path.extname(file).toLowerCase();
        return imageExtensions.includes(ext);
      })
      .map(file => path.join(directoryPath, file));
    
    logger.info('Imágenes encontradas', { count: imageFiles.length, firstImage: imageFiles[0] });
    return imageFiles;
  } catch (error) {
    logger.error('Error leyendo directorio', error);
    return [];
  }
});

// Obtener subdirectorios
ipcMain.handle('get-subdirectories', async (event, directoryPath: string) => {
  logger.info('IPC: get-subdirectories', { directoryPath });
  try {
    const items = await fsPromises.readdir(directoryPath, { withFileTypes: true });
    const subdirectories = items
      .filter(item => item.isDirectory())
      .map(item => ({
        name: item.name,
        path: path.join(directoryPath, item.name)
      }));
    
    logger.info('Subdirectorios encontrados', { count: subdirectories.length });
    return subdirectories;
  } catch (error) {
    logger.error('Error leyendo subdirectorios', error);
    return [];
  }
});

// Obtener metadatos de imágenes
ipcMain.handle('get-image-metadata', async (event, imagePaths: string[]) => {
  logger.info('IPC: get-image-metadata', { count: imagePaths.length });
  try {
    const metadata = await Promise.all(
      imagePaths.map(async (imagePath) => {
        try {
          const stats = await fsPromises.stat(imagePath);
          const fileName = path.basename(imagePath);
          return {
            path: imagePath,
            name: fileName,
            size: stats.size,
            modifiedTime: stats.mtimeMs,
            createdTime: stats.birthtimeMs
          };
        } catch (error) {
          logger.error('Error obteniendo metadatos', { imagePath, error });
          return null;
        }
      })
    );
    
    return metadata.filter(m => m !== null);
  } catch (error) {
    logger.error('Error obteniendo metadatos de imágenes', error);
    return [];
  }
});

// Obtener orden de imágenes por fecha usando PowerShell (Explorer Date)
ipcMain.handle('get-explorer-date-order', async (event, directoryPath: string, descending: boolean) => {
  logger.info('IPC: get-explorer-date-order', { directoryPath, descending });
  try {
    const scriptPath = path.join(__dirname, '../scripts/get-explorer-date-order.ps1');
    const descendingFlag = descending ? '-Descending' : '';
    const command = `powershell -ExecutionPolicy Bypass -File "${scriptPath}" -FolderPath "${directoryPath}" ${descendingFlag}`;
    
    const { stdout, stderr } = await execPromise(command);
    
    if (stderr) {
      logger.warn('PowerShell stderr:', stderr);
    }
    
    // Parsear JSON devuelto por el script
    const paths = JSON.parse(stdout.trim());
    logger.info('Orden de Explorer obtenido', { count: Array.isArray(paths) ? paths.length : 0 });
    
    return paths;
  } catch (error) {
    logger.error('Error obteniendo orden de Explorer', error);
    return null;
  }
});

// Organizar imágenes por año
ipcMain.handle('organize-by-year', async (event, directoryPath: string) => {
  logger.info('IPC: organize-by-year', { directoryPath });
  try {
    const scriptPath = path.join(__dirname, '../scripts/organize-by-year.ps1');
    const command = `powershell -ExecutionPolicy Bypass -File "${scriptPath}" -sourceDir "${directoryPath}"`;
    
    const { stdout, stderr } = await execPromise(command);
    
    if (stderr) {
      logger.warn('PowerShell stderr:', stderr);
    }
    
    logger.info('Organización por año completada', { output: stdout.trim() });
    return { success: true, message: stdout.trim() };
  } catch (error) {
    logger.error('Error organizando por año', error);
    return { success: false, error: String(error) };
  }
});

// Generar thumbnail individual
ipcMain.handle('generate-thumbnail', async (event, request: ThumbnailRequest) => {
  logger.info('IPC: generate-thumbnail', request);
  try {
    const result = await processThumbnailRequest(request);
    return result;
  } catch (error) {
    logger.error('Error generando thumbnail', error);
    return null;
  }
});

// Generar lote de thumbnails
ipcMain.handle('generate-thumbnail-batch', async (event, requests: ThumbnailRequest[]) => {
  logger.info('IPC: generate-thumbnail-batch', { count: requests.length });
  try {
    const results = await processThumbnailBatch(requests);
    return results;
  } catch (error) {
    logger.error('Error generando lote de thumbnails', error);
    return [];
  }
});

// Controles de ventana
ipcMain.on('window-minimize', () => {
  if (mainWindow) {
    mainWindow.minimize();
    logger.info('Ventana minimizada');
  }
});

ipcMain.on('window-maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
      logger.info('Ventana restaurada');
    } else {
      mainWindow.maximize();
      logger.info('Ventana maximizada');
    }
  }
});

ipcMain.on('window-close', () => {
  if (mainWindow) {
    mainWindow.close();
    logger.info('Ventana cerrada');
  }
});

// Obtener tamaño del caché
ipcMain.handle('get-cache-size', async () => {
  try {
    const size = await getCacheSize();
    return size;
  } catch (error) {
    logger.error('Error obteniendo tamaño de caché', error);
    return 0;
  }
});

// Limpiar caché
ipcMain.handle('clear-cache', async () => {
  try {
    await clearAllCache();
    return true;
  } catch (error) {
    logger.error('Error limpiando caché', error);
    return false;
  }
});

// Crear carpeta
ipcMain.handle('create-folder', async (event, parentPath: string, folderName: string) => {
  logger.info('IPC: create-folder', { parentPath, folderName });
  try {
    const folderPath = path.join(parentPath, folderName);
    await fs.promises.mkdir(folderPath, { recursive: false });
    logger.info('Carpeta creada exitosamente', { folderPath });
    return true;
  } catch (error) {
    logger.error('Error creando carpeta', error);
    return false;
  }
});

// Renombrar carpeta
ipcMain.handle('rename-folder', async (event, oldPath: string, newName: string) => {
  logger.info('IPC: rename-folder', { oldPath, newName });
  try {
    const parentPath = path.dirname(oldPath);
    const newPath = path.join(parentPath, newName);
    
    // Verificar que la nueva ruta no existe
    if (fs.existsSync(newPath)) {
      logger.error('La carpeta de destino ya existe', { newPath });
      return false;
    }
    
    await fs.promises.rename(oldPath, newPath);
    logger.info('Carpeta renombrada exitosamente', { oldPath, newPath });
    return true;
  } catch (error) {
    logger.error('Error renombrando carpeta', error);
    return false;
  }
});

// Mover archivo a la papelera
ipcMain.handle('move-to-trash', async (event, filePath: string) => {
  logger.info('IPC: move-to-trash', { filePath });
  try {
    await shell.trashItem(filePath);
    logger.info('Archivo movido a la papelera', { filePath });
    return true;
  } catch (error) {
    logger.error('Error moviendo archivo a la papelera', error);
    return false;
  }
});

// Mostrar archivo en el explorador
ipcMain.handle('show-item-in-folder', async (event, filePath: string) => {
  logger.info('IPC: show-item-in-folder', { filePath });
  try {
    shell.showItemInFolder(filePath);
    return true;
  } catch (error) {
    logger.error('Error mostrando archivo en explorador', error);
    return false;
  }
});

// Abrir ruta en el explorador
ipcMain.handle('open-path', async (event, dirPath: string) => {
  logger.info('IPC: open-path', { dirPath });
  try {
    await shell.openPath(dirPath);
    return true;
  } catch (error) {
    logger.error('Error abriendo ruta', error);
    return false;
  }
});

// Copiar imagen al portapapeles
ipcMain.handle('copy-image-to-clipboard', async (event, filePath: string) => {
  logger.info('IPC: copy-image-to-clipboard', { filePath });
  try {
    const { nativeImage, clipboard } = require('electron');
    
    // Procesar imagen con Sharp para aplicar rotación EXIF
    const buffer = await sharp(filePath)
      .rotate() // Auto-rotate based on EXIF Orientation
      .toBuffer();
    
    // Crear nativeImage desde el buffer procesado
    const image = nativeImage.createFromBuffer(buffer);
    clipboard.writeImage(image);
    logger.info('Imagen copiada al portapapeles con orientación correcta', { filePath });
    return true;
  } catch (error) {
    logger.error('Error copiando imagen al portapapeles', error);
    return false;
  }
});

// Mover archivo a directorio
ipcMain.handle('move-file', async (event, filePath: string, targetDirectory: string, newFileName?: string) => {
  logger.info('IPC: move-file', { filePath, targetDirectory, newFileName });
  try {
    const fileName = newFileName || path.basename(filePath);
    const targetPath = path.join(targetDirectory, fileName);
    
    // Verificar si el archivo destino ya existe
    if (fs.existsSync(targetPath)) {
      logger.warn('El archivo ya existe en el destino', { targetPath });
      return { success: false, exists: true, targetPath };
    }
    
    // Intentar rename primero (rápido para mismo disco)
    try {
      await fs.promises.rename(filePath, targetPath);
      logger.info('Archivo movido exitosamente con rename', { from: filePath, to: targetPath });
      return { success: true, exists: false };
    } catch (renameError: any) {
      // Si falla por cross-device (EXDEV), copiar y eliminar
      if (renameError.code === 'EXDEV') {
        logger.info('Movimiento entre discos detectado, usando copy+delete', { from: filePath, to: targetPath });
        await fs.promises.copyFile(filePath, targetPath);
        await fs.promises.unlink(filePath);
        logger.info('Archivo movido exitosamente con copy+delete', { from: filePath, to: targetPath });
        return { success: true, exists: false };
      }
      // Si es otro error, lanzarlo
      throw renameError;
    }
  } catch (error) {
    logger.error('Error moviendo archivo', error);
    return { success: false, exists: false, error: String(error) };
  }
});

// Obtener metadatos de una imagen específica
ipcMain.handle('get-single-image-metadata', async (event, imagePath: string) => {
  logger.info('IPC: get-single-image-metadata', { imagePath });
  try {
    const stats = await fs.promises.stat(imagePath);
    const metadata: any = {
      path: imagePath,
      size: stats.size,
      modified: stats.mtime.getTime()
    };
    
    // Intentar obtener dimensiones usando Sharp
    try {
      const sharp = require('sharp');
      const imageInfo = await sharp(imagePath).metadata();
      metadata.width = imageInfo.width;
      metadata.height = imageInfo.height;
    } catch (sharpError) {
      logger.warn('No se pudieron obtener dimensiones', { imagePath, error: sharpError });
      metadata.width = 0;
      metadata.height = 0;
    }
    
    return metadata;
  } catch (error) {
    logger.error('Error obteniendo metadatos de imagen', error);
    return null;
  }
});

// Eliminar archivo
ipcMain.handle('delete-file', async (event, filePath: string) => {
  logger.info('IPC: delete-file', { filePath });
  try {
    await fs.promises.unlink(filePath);
    logger.info('Archivo eliminado exitosamente', { filePath });
    return true;
  } catch (error) {
    logger.error('Error eliminando archivo', error);
    return false;
  }
});

// ===== HANDLERS PARA ESCANEO DE DUPLICADOS =====

// Calcular hashes de imágenes recursivamente
ipcMain.handle('calculate-hashes', async (event, directoryPath: string) => {
  logger.info('IPC: calculate-hashes', { directoryPath });
  
  try {
    const imageExtensions = ['.jpg', '.jpeg', '.jfif', '.png', '.gif', '.bmp', '.webp', '.svg', '.ico'];
    const hashes: Array<{ path: string; hash: string; mtime: number }> = [];
    
    // Intentar cargar caché existente
    const cacheDir = path.join(app.getPath('userData'), 'hash-cache');
    const encodedDirName = Buffer.from(directoryPath).toString('base64').replace(/[/+=]/g, '_');
    const cacheFilePath = path.join(cacheDir, `${encodedDirName}.json`);
    
    let cachedHashes: Map<string, { hash: string; mtime: number }> = new Map();
    
    try {
      if (fs.existsSync(cacheFilePath)) {
        const cacheData = await fsPromises.readFile(cacheFilePath, 'utf-8');
        const parsedCache = JSON.parse(cacheData);
        parsedCache.forEach((item: { path: string; hash: string; mtime: number }) => {
          cachedHashes.set(item.path, { hash: item.hash, mtime: item.mtime });
        });
        logger.info('Caché de hashes cargado', { count: cachedHashes.size });
      }
    } catch (cacheError) {
      logger.warn('No se pudo cargar caché de hashes', { error: cacheError });
    }
    
    // Función recursiva para obtener todas las imágenes
    async function getAllImages(dir: string): Promise<string[]> {
      const images: string[] = [];
      const items = await fsPromises.readdir(dir, { withFileTypes: true });
      
      for (const item of items) {
        const fullPath = path.join(dir, item.name);
        
        if (item.isDirectory()) {
          const subImages = await getAllImages(fullPath);
          images.push(...subImages);
        } else if (item.isFile()) {
          const ext = path.extname(item.name).toLowerCase();
          if (imageExtensions.includes(ext)) {
            images.push(fullPath);
          }
        }
      }
      
      return images;
    }
    
    const allImages = await getAllImages(directoryPath);
    logger.info('Imágenes encontradas para hash', { count: allImages.length });
    
    let successCount = 0;
    let errorCount = 0;
    let cacheHits = 0;
    
    // Calcular hash de cada imagen
    for (let i = 0; i < allImages.length; i++) {
      const imagePath = allImages[i];
      
      try {
        // Verificar que el archivo existe y es legible
        const stats = await fsPromises.stat(imagePath);
        
        // Verificar que el archivo no está vacío
        if (stats.size === 0) {
          logger.warn('Archivo vacío, saltando', { imagePath });
          continue;
        }
        
        // Verificar que el archivo es realmente una imagen válida
        try {
          await fsPromises.access(imagePath, fs.constants.R_OK);
        } catch (accessError) {
          logger.error('Archivo no accesible', { imagePath, error: accessError });
          continue;
        }
        
        let hash: string;
        
        // Verificar si tenemos un hash en caché y el archivo no ha sido modificado
        const cached = cachedHashes.get(imagePath);
        if (cached && Math.abs(cached.mtime - stats.mtimeMs) < 1000) {
          // Usar hash del caché
          hash = cached.hash;
          cacheHits++;
        } else {
          // Calcular phash con timeout
          hash = await new Promise<string>((resolve, reject) => {
            const timeout = setTimeout(() => {
              reject(new Error('Timeout calculando hash (5s)'));
            }, 5000); // 5 segundos timeout
            
            try {
              imageHash(imagePath, 16, true, (error: Error | null, data: string) => {
                clearTimeout(timeout);
                if (error) {
                  reject(error);
                } else if (!data || data.length === 0) {
                  reject(new Error('Hash vacío retornado'));
                } else {
                  resolve(data);
                }
              });
            } catch (syncError) {
              clearTimeout(timeout);
              reject(syncError);
            }
          });
        }
        
        hashes.push({
          path: imagePath,
          hash: hash,
          mtime: stats.mtimeMs
        });
        
        successCount++;
        
        // Enviar progreso al renderer
        event.sender.send('hash-progress', {
          current: i + 1,
          total: allImages.length,
          phase: 'hashing'
        });
        
      } catch (error) {
        errorCount++;
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : undefined;
        
        // Solo logear si no es un error de mime type (muy común)
        if (!errorMessage.includes('mime type or mismatch')) {
          logger.error('Error calculando hash', { 
            imagePath, 
            error: errorMessage,
            stack: errorStack
          });
        }
        
        // Continuar con la siguiente imagen
        event.sender.send('hash-progress', {
          current: i + 1,
          total: allImages.length,
          phase: 'hashing'
        });
      }
    }
    
    logger.info('Hashes calculados', { 
      count: hashes.length,
      success: successCount,
      errors: errorCount,
      cacheHits: cacheHits,
      calculated: successCount - cacheHits,
      total: allImages.length
    });
    return hashes;
    
  } catch (error) {
    logger.error('Error en calculate-hashes', error);
    return [];
  }
});

// Encontrar duplicados comparando hashes
ipcMain.handle('find-duplicates', async (event, hashes: Array<{ path: string; hash: string; mtime: number }>) => {
  logger.info('IPC: find-duplicates', { hashCount: hashes.length });
  
  try {
    const duplicateGroups: Array<{ hash: string; images: string[]; distance: number }> = [];
    const processed = new Set<number>();
    
    // Función para calcular distancia de Hamming
    function hammingDistance(hash1: string, hash2: string): number {
      let distance = 0;
      for (let i = 0; i < hash1.length; i++) {
        if (hash1[i] !== hash2[i]) distance++;
      }
      return distance;
    }
    
    const totalComparisons = (hashes.length * (hashes.length - 1)) / 2;
    let currentComparison = 0;
    
    // Comparar cada par de imágenes
    for (let i = 0; i < hashes.length; i++) {
      if (processed.has(i)) continue;
      
      const group: string[] = [hashes[i].path];
      
      for (let j = i + 1; j < hashes.length; j++) {
        if (processed.has(j)) continue;
        
        const distance = hammingDistance(hashes[i].hash, hashes[j].hash);
        
        // Considerar duplicado si distancia <= 5
        if (distance <= 5) {
          group.push(hashes[j].path);
          processed.add(j);
        }
        
        currentComparison++;
        
        // Enviar progreso cada 100 comparaciones
        if (currentComparison % 100 === 0) {
          event.sender.send('hash-progress', {
            current: currentComparison,
            total: totalComparisons,
            phase: 'comparing',
            percentage: Math.round((currentComparison / totalComparisons) * 100)
          });
        }
      }
      
      if (group.length > 1) {
        duplicateGroups.push({
          hash: hashes[i].hash,
          images: group,
          distance: 0
        });
      }
      
      processed.add(i);
    }
    
    // Enviar progreso final
    event.sender.send('hash-progress', {
      current: totalComparisons,
      total: totalComparisons,
      phase: 'comparing',
      percentage: 100
    });
    
    logger.info('Duplicados encontrados', { groups: duplicateGroups.length });
    return duplicateGroups;
    
  } catch (error) {
    logger.error('Error en find-duplicates', error);
    return [];
  }
});

// Obtener tamaño del caché de hashes
ipcMain.handle('get-hash-cache-size', async (event, directoryPath: string) => {
  try {
    const cacheDir = path.join(app.getPath('userData'), 'hash-cache');
    const cacheFile = path.join(cacheDir, Buffer.from(directoryPath).toString('base64') + '.json');
    
    if (fs.existsSync(cacheFile)) {
      const stats = await fsPromises.stat(cacheFile);
      return stats.size;
    }
    
    return 0;
  } catch (error) {
    logger.error('Error obteniendo tamaño de caché', error);
    return 0;
  }
});

// Guardar caché de hashes
ipcMain.handle('save-hash-cache', async (event, directoryPath: string, hashes: Array<{ path: string; hash: string; mtime: number }>) => {
  try {
    const cacheDir = path.join(app.getPath('userData'), 'hash-cache');
    
    // Crear directorio si no existe
    if (!fs.existsSync(cacheDir)) {
      await fsPromises.mkdir(cacheDir, { recursive: true });
    }
    
    const cacheFile = path.join(cacheDir, Buffer.from(directoryPath).toString('base64') + '.json');
    await fsPromises.writeFile(cacheFile, JSON.stringify(hashes, null, 2));
    
    logger.info('Caché de hashes guardado', { cacheFile, count: hashes.length });
    return true;
  } catch (error) {
    logger.error('Error guardando caché', error);
    return false;
  }
});

// Limpiar caché de hashes
ipcMain.handle('clear-hash-cache', async (event, directoryPath: string) => {
  try {
    const cacheDir = path.join(app.getPath('userData'), 'hash-cache');
    const cacheFile = path.join(cacheDir, Buffer.from(directoryPath).toString('base64') + '.json');
    
    if (fs.existsSync(cacheFile)) {
      await fsPromises.unlink(cacheFile);
      logger.info('Caché eliminado', { cacheFile });
    }
    
    return true;
  } catch (error) {
    logger.error('Error eliminando caché', error);
    return false;
  }
});

// Ejecutar evicción de caché
ipcMain.handle('run-cache-eviction', async () => {
  try {
    await runCacheEviction();
    return true;
  } catch (error) {
    logger.error('Error ejecutando evicción', error);
    return false;
  }
});

// Evitar múltiples instancias
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  logger.info('Ya existe una instancia - saliendo');
  app.quit();
} else {
  // Manejar segunda instancia
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    logger.info('Segunda instancia detectada', { commandLine });
    
    // Enfocar la ventana existente
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
      
      // Verificar si la segunda instancia se abrió con un archivo
      const filePath = commandLine.find(arg => {
        try {
          const ext = path.extname(arg).toLowerCase();
          return ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff', '.svg'].includes(ext) && fs.existsSync(arg);
        } catch {
          return false;
        }
      });
      
      if (filePath) {
        logger.info('Segunda instancia con archivo', { filePath });
        mainWindow.webContents.send('open-with-file', filePath);
      }
    }
  });
  
  app.whenReady().then(() => {
    logger.info('App ready - iniciando aplicación');
    
    // Verificar si se abrió con un archivo como argumento
    const filePath = process.argv.find(arg => {
      try {
        const ext = path.extname(arg).toLowerCase();
        return ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff', '.svg'].includes(ext) && fs.existsSync(arg);
      } catch {
        return false;
      }
    });
    
    createWindow();
    
    if (filePath) {
      logger.info('Aplicación abierta con archivo', { filePath });
      // Esperar a que la ventana esté lista y enviar el archivo
      mainWindow?.webContents.once('did-finish-load', () => {
        mainWindow?.webContents.send('open-with-file', filePath);
      });
    } else {
      logger.info('Aplicación iniciada sin archivo');
    }
    
    // Iniciar evicción periódica del caché (cada 24 horas)
    startPeriodicEviction(24);

    app.on('activate', () => {
      logger.info('App activate event');
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  });
}

app.on('window-all-closed', () => {
  logger.info('Todas las ventanas cerradas');
  if (process.platform !== 'darwin') {
    logger.close();
    app.quit();
  }
});

// Manejar apertura de archivo en macOS
app.on('open-file', (event, filePath) => {
  event.preventDefault();
  logger.info('open-file event', { filePath });
  
  if (mainWindow) {
    mainWindow.webContents.send('open-with-file', filePath);
  }
});

// Manejar errores no capturados
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', error);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', { reason, promise });
});
