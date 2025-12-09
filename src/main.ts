import { app, BrowserWindow, Menu, dialog, ipcMain, shell } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { promises as fsPromises } from 'fs';
import { logger } from './logger';
import { processThumbnailRequest, processThumbnailBatch, ThumbnailRequest } from './thumbnail-generator';
import { getCacheSize } from './cache-utils';
import { runCacheEviction, clearAllCache, startPeriodicEviction } from './cache-eviction';

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
    
    await fs.promises.rename(filePath, targetPath);
    logger.info('Archivo movido exitosamente', { from: filePath, to: targetPath });
    return { success: true, exists: false };
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
