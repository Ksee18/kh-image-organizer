import { listCachedThumbnails, deleteThumbnail, getCacheSize } from './cache-utils';
import { logger } from './logger';

export interface EvictionPolicy {
  maxCacheSizeGB: number;
  maxAgeMs: number; // Edad máxima sin ser accedido
}

const DEFAULT_POLICY: EvictionPolicy = {
  maxCacheSizeGB: 2,
  maxAgeMs: 30 * 24 * 60 * 60 * 1000, // 30 días
};

/**
 * Ejecuta la política de evicción del caché
 * Elimina thumbnails viejos y controla el tamaño total
 */
export async function runCacheEviction(policy: EvictionPolicy = DEFAULT_POLICY): Promise<void> {
  logger.info('Iniciando evicción de caché', policy);
  
  try {
    // Obtener todos los thumbnails
    const thumbnails = await listCachedThumbnails();
    logger.info('Thumbnails en caché', { count: thumbnails.length });
    
    if (thumbnails.length === 0) {
      logger.info('Caché vacío, no hay nada que evictar');
      return;
    }
    
    const now = Date.now();
    const maxCacheSizeBytes = policy.maxCacheSizeGB * 1024 * 1024 * 1024;
    
    // Filtrar thumbnails a eliminar por edad
    const toDeleteByAge = thumbnails.filter(thumb => {
      const age = now - thumb.metadata.lastSeen;
      return age > policy.maxAgeMs;
    });
    
    logger.info('Thumbnails a eliminar por edad', { count: toDeleteByAge.length });
    
    // Eliminar por edad
    for (const thumb of toDeleteByAge) {
      await deleteThumbnail(thumb.cacheKey);
      logger.debug('Thumbnail eliminado por edad', { cacheKey: thumb.cacheKey });
    }
    
    // Verificar tamaño total del caché
    let currentSize = await getCacheSize();
    logger.info('Tamaño actual del caché', { sizeMB: currentSize / (1024 * 1024) });
    
    if (currentSize <= maxCacheSizeBytes) {
      logger.info('Caché dentro del límite de tamaño');
      return;
    }
    
    // Si excede el límite, eliminar los menos usados (LRU)
    const remainingThumbnails = thumbnails.filter(
      thumb => !toDeleteByAge.some(t => t.cacheKey === thumb.cacheKey)
    );
    
    // Ordenar por lastSeen (más antiguos primero)
    remainingThumbnails.sort((a, b) => a.metadata.lastSeen - b.metadata.lastSeen);
    
    logger.info('Reduciendo tamaño del caché', { 
      currentMB: currentSize / (1024 * 1024),
      targetMB: maxCacheSizeBytes / (1024 * 1024)
    });
    
    // Eliminar hasta llegar al límite
    for (const thumb of remainingThumbnails) {
      if (currentSize <= maxCacheSizeBytes) {
        break;
      }
      
      await deleteThumbnail(thumb.cacheKey);
      currentSize -= thumb.size;
      logger.debug('Thumbnail eliminado por tamaño', { 
        cacheKey: thumb.cacheKey,
        savedMB: thumb.size / (1024 * 1024)
      });
    }
    
    const finalSize = await getCacheSize();
    logger.info('Evicción completada', { 
      finalSizeMB: finalSize / (1024 * 1024),
      deletedCount: toDeleteByAge.length + (thumbnails.length - remainingThumbnails.length)
    });
    
  } catch (error) {
    logger.error('Error durante evicción de caché', error);
  }
}

/**
 * Limpia todo el caché
 */
export async function clearAllCache(): Promise<void> {
  logger.info('Limpiando todo el caché');
  
  try {
    const thumbnails = await listCachedThumbnails();
    
    for (const thumb of thumbnails) {
      await deleteThumbnail(thumb.cacheKey);
    }
    
    logger.info('Caché limpiado completamente', { deletedCount: thumbnails.length });
  } catch (error) {
    logger.error('Error limpiando caché', error);
  }
}

/**
 * Inicia un job periódico de evicción
 */
export function startPeriodicEviction(intervalHours: number = 24): NodeJS.Timeout {
  logger.info('Iniciando evicción periódica', { intervalHours });
  
  // Ejecutar inmediatamente
  runCacheEviction();
  
  // Programar ejecución periódica
  const intervalMs = intervalHours * 60 * 60 * 1000;
  return setInterval(() => {
    runCacheEviction();
  }, intervalMs);
}
