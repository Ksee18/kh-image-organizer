import sharp from 'sharp';
import * as fs from 'fs';
import { 
  generateCacheKey, 
  getCachePath, 
  saveMetadata, 
  thumbnailExists,
  updateLastSeen,
  ThumbnailMetadata 
} from './cache-utils';
import { logger } from './logger';

export interface ThumbnailRequest {
  filePath: string;
  thumbnailSize: number;
}

export interface ThumbnailResult {
  cacheKey: string;
  thumbPath: string;
  fromCache: boolean;
}

/**
 * Genera un thumbnail de una imagen usando sharp
 */
async function generateThumbnail(
  inputPath: string, 
  outputPath: string, 
  size: number
): Promise<void> {
  await sharp(inputPath)
    .rotate() // Auto-rotate based on EXIF Orientation
    .resize(size, size, {
      fit: 'cover',
      position: 'center',
    })
    .webp({ quality: 85, effort: 4 })
    .toFile(outputPath);
}

/**
 * Procesa una solicitud de thumbnail
 * Retorna el thumbnail desde caché o lo genera si no existe
 */
export async function processThumbnailRequest(
  request: ThumbnailRequest
): Promise<ThumbnailResult> {
  const { filePath, thumbnailSize } = request;
  
  // logger.info('Procesando thumbnail', { filePath, thumbnailSize });
  
  try {
    // Generar cache key
    const cacheKey = await generateCacheKey({ filePath, thumbnailSize });
    const { dir, thumbPath, metaPath } = getCachePath(cacheKey);
    
    // Verificar si existe en caché
    const exists = await thumbnailExists(cacheKey);
    
    if (exists) {
      // logger.debug('Thumbnail encontrado en caché', { cacheKey });
      // Actualizar lastSeen
      await updateLastSeen(cacheKey);
      return { cacheKey, thumbPath, fromCache: true };
    }
    
    // No existe, generar thumbnail
    // logger.info('Generando nuevo thumbnail', { cacheKey, filePath });
    
    // Crear directorio si no existe
    await fs.promises.mkdir(dir, { recursive: true });
    
    // Generar thumbnail
    await generateThumbnail(filePath, thumbPath, thumbnailSize);
    
    // Guardar metadata
    const stat = await fs.promises.stat(filePath);
    const metadata: ThumbnailMetadata = {
      originalPath: filePath,
      size: stat.size,
      mtime: stat.mtimeMs,
      lastSeen: Date.now(),
      cacheKey,
    };
    
    await saveMetadata(cacheKey, metadata);
    
    // logger.info('Thumbnail generado exitosamente', { cacheKey });
    
    return { cacheKey, thumbPath, fromCache: false };
    
  } catch (error) {
    logger.error('Error procesando thumbnail', error);
    throw error;
  }
}

/**
 * Procesa múltiples thumbnails en lote
 */
export async function processThumbnailBatch(
  requests: ThumbnailRequest[]
): Promise<ThumbnailResult[]> {
  logger.info('Procesando lote de thumbnails', { count: requests.length });
  
  const results: ThumbnailResult[] = [];
  
  // Procesar en paralelo con límite de concurrencia
  const BATCH_SIZE = 5;
  
  for (let i = 0; i < requests.length; i += BATCH_SIZE) {
    const batch = requests.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(req => processThumbnailRequest(req).catch(error => {
        logger.error('Error en thumbnail del lote', { filePath: req.filePath, error });
        return null;
      }))
    );
    
    results.push(...batchResults.filter(r => r !== null) as ThumbnailResult[]);
    
    // Log de progreso
    logger.debug('Lote procesado', { 
      processed: Math.min(i + BATCH_SIZE, requests.length), 
      total: requests.length 
    });
  }
  
  logger.info('Lote de thumbnails completado', { 
    total: requests.length, 
    successful: results.length 
  });
  
  return results;
}
