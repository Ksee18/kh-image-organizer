import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';

export interface ThumbnailMetadata {
  originalPath: string;
  size: number;
  mtime: number;
  lastSeen: number;
  cacheKey: string;
}

export interface CacheKeyParams {
  filePath: string;
  thumbnailSize: number;
}

/**
 * Calcula un hash parcial del archivo (primeros 8KB + últimos 8KB)
 * para detectar cambios sin leer todo el archivo
 */
async function getPartialHash(filePath: string): Promise<string> {
  const CHUNK_SIZE = 8192; // 8KB
  const handle = await fs.promises.open(filePath, 'r');
  
  try {
    const stat = await handle.stat();
    const hash = crypto.createHash('md5');
    
    // Hash del inicio del archivo
    const startBuffer = Buffer.alloc(Math.min(CHUNK_SIZE, stat.size));
    await handle.read(startBuffer, 0, startBuffer.length, 0);
    hash.update(startBuffer);
    
    // Hash del final del archivo (si es lo suficientemente grande)
    if (stat.size > CHUNK_SIZE * 2) {
      const endBuffer = Buffer.alloc(CHUNK_SIZE);
      await handle.read(endBuffer, 0, CHUNK_SIZE, stat.size - CHUNK_SIZE);
      hash.update(endBuffer);
    }
    
    return hash.digest('hex').substring(0, 16);
  } finally {
    await handle.close();
  }
}

/**
 * Genera una clave de caché única basada en tamaño, mtime y hash parcial
 */
export async function generateCacheKey(params: CacheKeyParams): Promise<string> {
  try {
    const stat = await fs.promises.stat(params.filePath);
    const partialHash = await getPartialHash(params.filePath);
    
    // Combinar tamaño del thumbnail, tamaño del archivo, mtime y hash parcial
    const content = `${params.thumbnailSize}-${stat.size}-${stat.mtimeMs}-${partialHash}`;
    const hash = crypto.createHash('sha256').update(content).digest('hex');
    
    return hash;
  } catch (error) {
    throw new Error(`Error generando cache key: ${error}`);
  }
}

/**
 * Obtiene la ruta del directorio de caché
 */
export function getCacheDir(): string {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, 'cache');
}

/**
 * Convierte un cacheKey en una ruta de archivo en el sistema de caché
 * Usa estructura cache/{aa}/{cacheKey}.webp donde aa son los primeros 2 chars del hash
 */
export function getCachePath(cacheKey: string): { dir: string; thumbPath: string; metaPath: string } {
  const cacheDir = getCacheDir();
  const subdir = cacheKey.substring(0, 2);
  const dir = path.join(cacheDir, subdir);
  const thumbPath = path.join(dir, `${cacheKey}.webp`);
  const metaPath = path.join(dir, `${cacheKey}.meta.json`);
  
  return { dir, thumbPath, metaPath };
}

/**
 * Guarda metadata de un thumbnail
 */
export async function saveMetadata(cacheKey: string, metadata: ThumbnailMetadata): Promise<void> {
  const { dir, metaPath } = getCachePath(cacheKey);
  
  // Crear directorio si no existe
  await fs.promises.mkdir(dir, { recursive: true });
  
  // Guardar metadata
  await fs.promises.writeFile(metaPath, JSON.stringify(metadata, null, 2), 'utf-8');
}

/**
 * Carga metadata de un thumbnail
 */
export async function loadMetadata(cacheKey: string): Promise<ThumbnailMetadata | null> {
  try {
    const { metaPath } = getCachePath(cacheKey);
    const content = await fs.promises.readFile(metaPath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    return null;
  }
}

/**
 * Actualiza el campo lastSeen de la metadata
 */
export async function updateLastSeen(cacheKey: string): Promise<void> {
  const metadata = await loadMetadata(cacheKey);
  if (metadata) {
    metadata.lastSeen = Date.now();
    await saveMetadata(cacheKey, metadata);
  }
}

/**
 * Verifica si un thumbnail existe en caché
 */
export async function thumbnailExists(cacheKey: string): Promise<boolean> {
  try {
    const { thumbPath } = getCachePath(cacheKey);
    await fs.promises.access(thumbPath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Obtiene el tamaño total del caché en bytes
 */
export async function getCacheSize(): Promise<number> {
  const cacheDir = getCacheDir();
  let totalSize = 0;
  
  try {
    const subdirs = await fs.promises.readdir(cacheDir);
    
    for (const subdir of subdirs) {
      const subdirPath = path.join(cacheDir, subdir);
      const stat = await fs.promises.stat(subdirPath);
      
      if (stat.isDirectory()) {
        const files = await fs.promises.readdir(subdirPath);
        
        for (const file of files) {
          const filePath = path.join(subdirPath, file);
          const fileStat = await fs.promises.stat(filePath);
          totalSize += fileStat.size;
        }
      }
    }
  } catch (error) {
    // Si el directorio no existe, retornar 0
    return 0;
  }
  
  return totalSize;
}

/**
 * Lista todos los thumbnails en caché con su metadata
 */
export async function listCachedThumbnails(): Promise<Array<{ cacheKey: string; metadata: ThumbnailMetadata; size: number }>> {
  const cacheDir = getCacheDir();
  const thumbnails: Array<{ cacheKey: string; metadata: ThumbnailMetadata; size: number }> = [];
  
  try {
    const subdirs = await fs.promises.readdir(cacheDir);
    
    for (const subdir of subdirs) {
      const subdirPath = path.join(cacheDir, subdir);
      const stat = await fs.promises.stat(subdirPath);
      
      if (stat.isDirectory()) {
        const files = await fs.promises.readdir(subdirPath);
        
        for (const file of files) {
          if (file.endsWith('.meta.json')) {
            const cacheKey = file.replace('.meta.json', '');
            const metadata = await loadMetadata(cacheKey);
            
            if (metadata) {
              const { thumbPath } = getCachePath(cacheKey);
              try {
                const thumbStat = await fs.promises.stat(thumbPath);
                thumbnails.push({ cacheKey, metadata, size: thumbStat.size });
              } catch {
                // Thumbnail no existe, omitir
              }
            }
          }
        }
      }
    }
  } catch (error) {
    // Directorio no existe
  }
  
  return thumbnails;
}

/**
 * Elimina un thumbnail del caché
 */
export async function deleteThumbnail(cacheKey: string): Promise<void> {
  const { thumbPath, metaPath } = getCachePath(cacheKey);
  
  try {
    await fs.promises.unlink(thumbPath);
  } catch {
    // Ignorar si no existe
  }
  
  try {
    await fs.promises.unlink(metaPath);
  } catch {
    // Ignorar si no existe
  }
}
