/**
 * LRU Cache genérico para almacenar datos en memoria
 */
export class LRUCache<K, V> {
  private cache: Map<K, V>;
  private accessOrder: K[];
  private maxSize: number;

  constructor(maxSize: number = 200) {
    this.cache = new Map();
    this.accessOrder = [];
    this.maxSize = maxSize;
  }

  /**
   * Obtiene un valor del caché
   */
  get(key: K): V | undefined {
    if (!this.cache.has(key)) {
      return undefined;
    }

    // Actualizar orden de acceso
    this.updateAccessOrder(key);

    return this.cache.get(key);
  }

  /**
   * Agrega o actualiza un valor en el caché
   */
  set(key: K, value: V): void {
    // Si ya existe, actualizar
    if (this.cache.has(key)) {
      this.cache.set(key, value);
      this.updateAccessOrder(key);
      return;
    }

    // Si el caché está lleno, eliminar el menos usado
    if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }

    // Agregar nuevo valor
    this.cache.set(key, value);
    this.accessOrder.push(key);
  }

  /**
   * Verifica si existe una clave en el caché
   */
  has(key: K): boolean {
    return this.cache.has(key);
  }

  /**
   * Elimina una clave del caché
   */
  delete(key: K): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      const index = this.accessOrder.indexOf(key);
      if (index > -1) {
        this.accessOrder.splice(index, 1);
      }
    }
    return deleted;
  }

  /**
   * Limpia todo el caché
   */
  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
  }

  /**
   * Obtiene el tamaño actual del caché
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Actualiza el orden de acceso de una clave
   */
  private updateAccessOrder(key: K): void {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
    this.accessOrder.push(key);
  }

  /**
   * Elimina el elemento menos recientemente usado
   */
  private evictLRU(): void {
    if (this.accessOrder.length === 0) return;

    const lruKey = this.accessOrder.shift();
    if (lruKey !== undefined) {
      this.cache.delete(lruKey);
    }
  }

  /**
   * Obtiene las claves en orden de acceso (más reciente al final)
   */
  keys(): K[] {
    return [...this.accessOrder];
  }

  /**
   * Obtiene los valores en orden de acceso
   */
  values(): V[] {
    return this.accessOrder.map(key => this.cache.get(key)!).filter(v => v !== undefined);
  }
}

/**
 * Caché en memoria específico para thumbnails decodificados
 */
export interface ThumbnailCacheEntry {
  cacheKey: string;
  dataUrl: string;
  size: number;
}

export class ThumbnailMemoryCache {
  private cache: LRUCache<string, ThumbnailCacheEntry>;
  private totalSize: number;
  private maxTotalSize: number; // en bytes

  constructor(maxItems: number = 200, maxTotalSizeMB: number = 100) {
    this.cache = new LRUCache(maxItems);
    this.totalSize = 0;
    this.maxTotalSize = maxTotalSizeMB * 1024 * 1024; // Convertir MB a bytes
  }

  /**
   * Obtiene un thumbnail del caché en memoria
   */
  get(cacheKey: string): string | undefined {
    const entry = this.cache.get(cacheKey);
    return entry?.dataUrl;
  }

  /**
   * Agrega un thumbnail al caché en memoria
   */
  set(cacheKey: string, dataUrl: string): void {
    // Estimar tamaño del dataUrl (base64 es ~1.37x del tamaño original)
    const size = Math.ceil(dataUrl.length * 0.75);

    // Si el thumbnail es muy grande, no almacenarlo
    if (size > this.maxTotalSize * 0.1) {
      return;
    }

    // Evictar hasta tener espacio
    while (this.totalSize + size > this.maxTotalSize && this.cache.size() > 0) {
      this.evictOldest();
    }

    const entry: ThumbnailCacheEntry = { cacheKey, dataUrl, size };
    this.cache.set(cacheKey, entry);
    this.totalSize += size;
  }

  /**
   * Verifica si existe un thumbnail en memoria
   */
  has(cacheKey: string): boolean {
    return this.cache.has(cacheKey);
  }

  /**
   * Elimina un thumbnail del caché
   */
  delete(cacheKey: string): boolean {
    const entry = this.cache.get(cacheKey);
    if (entry) {
      this.totalSize -= entry.size;
      return this.cache.delete(cacheKey);
    }
    return false;
  }

  /**
   * Limpia todo el caché
   */
  clear(): void {
    this.cache.clear();
    this.totalSize = 0;
  }

  /**
   * Obtiene estadísticas del caché
   */
  getStats(): { items: number; totalSizeMB: number; maxSizeMB: number } {
    return {
      items: this.cache.size(),
      totalSizeMB: this.totalSize / (1024 * 1024),
      maxSizeMB: this.maxTotalSize / (1024 * 1024),
    };
  }

  /**
   * Elimina el thumbnail más antiguo
   */
  private evictOldest(): void {
    const keys = this.cache.keys();
    if (keys.length > 0) {
      const oldestKey = keys[0];
      this.delete(oldestKey);
    }
  }
}

// Instancia global del caché en memoria
export const thumbnailMemoryCache = new ThumbnailMemoryCache(200, 100);
