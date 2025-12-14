let currentImages: string[] = [];
let imageMetadata: Map<string, any> = new Map();
let currentImageIndex: number = 0;
let currentDirectory: string | null = null;
let subdirectories: any[] = [];
let destinationDirectories: string[] = [];
let thumbnailCache: Map<string, string> = new Map();
let currentZoom: number = 1;
let isFitToWindow: boolean = true;
let isDragging: boolean = false;
let dragStartX: number = 0;
let dragStartY: number = 0;
let scrollStartX: number = 0;
let scrollStartY: number = 0;
let isRepositionMode: boolean = false; // false = MAA (mover archivos), true = REPO (reposicionar)
let imageOffsetX: number = 0; // Offset de posición en modo REPO
let imageOffsetY: number = 0; // Offset de posición en modo REPO

// Selección múltiple
let isMultiSelectMode: boolean = false;
let selectedImages: string[] = []; // Rutas de imágenes seleccionadas en orden
let justEnteredMultiSelect: boolean = false; // Flag para prevenir click después de long-press
let pendingConflicts: Array<{sourcePath: string, targetDirectory: string, targetPath: string}> = []; // Cola de conflictos pendientes
let isProcessingConflicts: boolean = false; // Flag para saber si estamos procesando conflictos

// Escaneo de duplicados (ED)
let isDuplicateScanMode: boolean = false;
let duplicateComparisons: Array<{leftImage: string, rightImage: string, groupIndex: number}> = [];
let currentDuplicateIndex: number = 0;
let calculatedHashes: Array<{path: string, hash: string, mtime: number}> = [];
let duplicateScanCancelled: boolean = false;
let duplicateGroups: Array<{hash: string, images: string[], distance: number}> = []; // Mantener grupos originales

// Navegación rápida por directorios
let lastPressedKey: string = '';
let lastKeyPressTime: number = 0;
let currentFocusIndex: number = -1;
let quickNavigationEnabled: boolean = true;
let directorySearchString: string = '';
let directorySearchTimeout: number | null = null;

// Sistema de lazy loading
let thumbnailGenerationQueue: Set<number> = new Set();
let generatingThumbnails: number = 0;
let isGeneratingBatch: boolean = false;

// Sistema de filtros
type SortOrder = 'name-asc' | 'name-desc' | 'created-asc' | 'created-desc' | 'date-asc' | 'date-desc' | 'size-asc' | 'size-desc';
let currentSortOrder: SortOrder = 'name-asc';

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 5;
const ZOOM_STEP = 0.2;
const VISIBLE_BUFFER = 25;
const MAX_CONCURRENT_THUMBNAILS = 3;

// Elementos del DOM  
const viewer = document.getElementById('viewer') as HTMLElement;
const emptyState = document.getElementById('empty-state') as HTMLElement;
const emptyStateText = emptyState.querySelector('.instruction-text') as HTMLParagraphElement;
const loadingOverlay = document.getElementById('loading-overlay') as HTMLElement;
const loadingText = document.getElementById('loading-text') as HTMLElement;
const imageView = document.getElementById('image-view') as HTMLElement;
const mainImageContainer = document.getElementById('main-image-container') as HTMLElement;
const currentImage = document.getElementById('current-image') as HTMLImageElement;
const fileNameDisplay = document.getElementById('file-name-display') as HTMLElement;
const subdirectoriesList = document.getElementById('subdirectories-list') as HTMLElement;
const destinationDirectoriesList = document.getElementById('destination-directories-list') as HTMLElement;
const destinationSection = document.getElementById('destination-section') as HTMLElement;
const parentDirectoryBtn = document.getElementById('parent-directory-btn') as HTMLButtonElement;
const carouselTrack = document.getElementById('carousel-track') as HTMLElement;
const carouselNavLeft = document.getElementById('carousel-nav-left') as HTMLButtonElement;
const carouselNavRight = document.getElementById('carousel-nav-right') as HTMLButtonElement;
const carouselNavFirst = document.getElementById('carousel-nav-first') as HTMLButtonElement;
const carouselNavLast = document.getElementById('carousel-nav-last') as HTMLButtonElement;
const sidebar = document.querySelector('.sidebar') as HTMLElement;
const sidebarScrollTopBtn = document.getElementById('sidebar-scroll-top-btn') as HTMLButtonElement;
const sidebarScrollBottomBtn = document.getElementById('sidebar-scroll-bottom-btn') as HTMLButtonElement;
const multiSelectThumbnails = document.getElementById('multi-select-thumbnails') as HTMLElement;

// Controles de ventana
const windowMinimizeBtn = document.getElementById('window-minimize') as HTMLButtonElement;
const windowMaximizeBtn = document.getElementById('window-maximize') as HTMLButtonElement;
const windowCloseBtn = document.getElementById('window-close') as HTMLButtonElement;

// Botones de zoom
const zoomInBtn = document.getElementById('zoom-in-btn') as HTMLButtonElement;
const zoomOutBtn = document.getElementById('zoom-out-btn') as HTMLButtonElement;
const zoomResetBtn = document.getElementById('zoom-reset-btn') as HTMLButtonElement;
const fitToWindowBtn = document.getElementById('fit-to-window-btn') as HTMLButtonElement;
const toggleDragModeBtn = document.getElementById('toggle-drag-mode-btn') as HTMLButtonElement;
const multiSelectBtn = document.getElementById('multi-select-btn') as HTMLButtonElement;
const organizeByYearBtn = document.getElementById('organize-by-year-btn') as HTMLButtonElement;
const duplicateScanBtn = document.getElementById('duplicate-scan-btn') as HTMLButtonElement;

// Filtro
const filterBtn = document.getElementById('filter-btn') as HTMLButtonElement;
const filterMenu = document.getElementById('filter-menu') as HTMLElement;

// Modal organizar por año
const organizeYearModal = document.getElementById('organize-year-modal') as HTMLElement;
const organizeYearYesBtn = document.getElementById('organize-year-yes-btn') as HTMLButtonElement;
const organizeYearNoBtn = document.getElementById('organize-year-no-btn') as HTMLButtonElement;

// Modal escaneo de duplicados
const duplicateScanModal = document.getElementById('duplicate-scan-modal') as HTMLElement;
const duplicateScanLeftSection = document.getElementById('duplicate-scan-left-section') as HTMLElement;
const duplicateScanRightSection = document.getElementById('duplicate-scan-right-section') as HTMLElement;
const duplicateScanLeftImg = document.getElementById('duplicate-scan-left-img') as HTMLImageElement;
const duplicateScanRightImg = document.getElementById('duplicate-scan-right-img') as HTMLImageElement;
const duplicateScanLeftPath = document.getElementById('duplicate-scan-left-path') as HTMLElement;
const duplicateScanRightPath = document.getElementById('duplicate-scan-right-path') as HTMLElement;
const duplicateScanLeftInfo = document.getElementById('duplicate-scan-left-info') as HTMLElement;
const duplicateScanRightInfo = document.getElementById('duplicate-scan-right-info') as HTMLElement;
const duplicateKeepBothBtn = document.getElementById('duplicate-keep-both-btn') as HTMLButtonElement;
const duplicateCancelScanBtn = document.getElementById('duplicate-cancel-scan-btn') as HTMLButtonElement;
const duplicateCounter = document.querySelector('.duplicate-counter') as HTMLElement;

// Log para debug
console.log('[ED] Elementos del modal cargados:', {
  modal: !!duplicateScanModal,
  leftSection: !!duplicateScanLeftSection,
  rightSection: !!duplicateScanRightSection,
  leftImg: !!duplicateScanLeftImg,
  rightImg: !!duplicateScanRightImg,
  keepBothBtn: !!duplicateKeepBothBtn,
  cancelBtn: !!duplicateCancelScanBtn
});

// Modal confirmación de caché
const cacheConfirmModal = document.getElementById('cache-confirm-modal') as HTMLElement;
const cacheConfirmText = document.getElementById('cache-size-info') as HTMLElement;
const cacheSaveBtn = document.getElementById('cache-save-btn') as HTMLButtonElement;
const cacheDontSaveBtn = document.getElementById('cache-dont-save-btn') as HTMLButtonElement;

// Menú contextual
const imageContextMenu = document.getElementById('image-context-menu') as HTMLElement;
const contextCopyImage = document.getElementById('context-copy-image') as HTMLElement;
const contextShowInExplorer = document.getElementById('context-show-in-explorer') as HTMLElement;

// Menú contextual de directorios
const directoryContextMenu = document.getElementById('directory-context-menu') as HTMLElement;
const contextOpenFolder = document.getElementById('context-open-folder') as HTMLElement;
const contextOpenInExplorer = document.getElementById('context-open-in-explorer') as HTMLElement;
const contextRenameFolder = document.getElementById('context-rename-folder') as HTMLElement;
const contextRemoveDestination = document.getElementById('context-remove-destination') as HTMLElement;

// Modal renombrar carpeta
const renameFolderModal = document.getElementById('rename-folder-modal') as HTMLElement;
const renameFolderInput = document.getElementById('rename-folder-input') as HTMLInputElement;
const cancelRenameBtn = document.getElementById('cancel-rename-btn') as HTMLButtonElement;
const saveRenameBtn = document.getElementById('save-rename-btn') as HTMLButtonElement;

// Variables para el menú contextual de directorios
let currentContextDirectory: string | null = null;
let currentContextIsDestination: boolean = false;

const THUMBNAIL_SIZE = 84;

// Event listeners para controles de ventana
if (windowMinimizeBtn) {
  windowMinimizeBtn.addEventListener('click', () => {
    window.electronAPI.windowMinimize();
  });
}

if (windowMaximizeBtn) {
  windowMaximizeBtn.addEventListener('click', () => {
    window.electronAPI.windowMaximize();
  });
}

if (windowCloseBtn) {
  windowCloseBtn.addEventListener('click', () => {
    window.electronAPI.windowClose();
  });
}

// Event listeners para menú contextual
if (currentImage) {
  // Mostrar menú contextual en clic derecho
  currentImage.addEventListener('contextmenu', (e: MouseEvent) => {
    e.preventDefault();
    
    // No mostrar menú si estamos en modo multi-selección o escaneo de duplicados
    if (isMultiSelectMode || isDuplicateScanMode) {
      return;
    }
    
    // Posicionar el menú en la ubicación del cursor
    if (imageContextMenu) {
      imageContextMenu.style.display = 'block';
      imageContextMenu.style.left = `${e.clientX}px`;
      imageContextMenu.style.top = `${e.clientY}px`;
    }
  });
}

// Ocultar menú contextual al hacer clic fuera
document.addEventListener('click', () => {
  if (imageContextMenu) {
    imageContextMenu.style.display = 'none';
  }
});

// Copiar imagen al portapapeles
if (contextCopyImage) {
  contextCopyImage.addEventListener('click', async () => {
    if (currentImages.length === 0) return;
    
    const currentImagePath = currentImages[currentImageIndex];
    try {
      await window.electronAPI.copyImageToClipboard(currentImagePath);
      console.log('[Context Menu] Imagen copiada al portapapeles');
    } catch (error) {
      console.error('[Context Menu] Error copiando imagen:', error);
    }
    
    // Ocultar menú
    if (imageContextMenu) {
      imageContextMenu.style.display = 'none';
    }
  });
}

// Mostrar imagen en explorador
if (contextShowInExplorer) {
  contextShowInExplorer.addEventListener('click', async () => {
    if (currentImages.length === 0) return;
    
    const currentImagePath = currentImages[currentImageIndex];
    try {
      await window.electronAPI.showItemInFolder(currentImagePath);
      console.log('[Context Menu] Mostrando imagen en explorador');
    } catch (error) {
      console.error('[Context Menu] Error mostrando imagen en explorador:', error);
    }
    
    // Ocultar menú
    if (imageContextMenu) {
      imageContextMenu.style.display = 'none';
    }
  });
}

// Funciones para el menú contextual de directorios
function showDirectoryContextMenu(e: MouseEvent, dirPath: string, isDestination: boolean) {
  if (!directoryContextMenu) return;
  
  currentContextDirectory = dirPath;
  currentContextIsDestination = isDestination;
  
  // Mostrar/ocultar opción "Quitar carpeta" según si es directorio destino
  if (contextRemoveDestination) {
    contextRemoveDestination.style.display = isDestination ? 'block' : 'none';
  }
  
  // Posicionar y mostrar menú
  directoryContextMenu.style.display = 'block';
  directoryContextMenu.style.left = `${e.clientX}px`;
  directoryContextMenu.style.top = `${e.clientY}px`;
}

// Ocultar menú contextual de directorios al hacer clic fuera
document.addEventListener('click', () => {
  if (directoryContextMenu) {
    directoryContextMenu.style.display = 'none';
  }
});

// Abrir carpeta
if (contextOpenFolder) {
  contextOpenFolder.addEventListener('click', () => {
    if (currentContextDirectory) {
      console.log('[Context Menu] Abrir carpeta:', currentContextDirectory);
      
      // Si es directorio destino, quitarlo de la lista antes de navegar
      if (currentContextIsDestination) {
        const index = destinationDirectories.indexOf(currentContextDirectory);
        if (index > -1) {
          destinationDirectories.splice(index, 1);
          displayDestinationDirectories();
        }
      }
      
      loadDirectory(currentContextDirectory);
    }
    if (directoryContextMenu) {
      directoryContextMenu.style.display = 'none';
    }
  });
}

// Abrir en Explorer
if (contextOpenInExplorer) {
  contextOpenInExplorer.addEventListener('click', async () => {
    if (currentContextDirectory) {
      try {
        await window.electronAPI.openPath(currentContextDirectory);
        console.log('[Context Menu] Abriendo en Explorer:', currentContextDirectory);
      } catch (error) {
        console.error('[Context Menu] Error abriendo en Explorer:', error);
      }
    }
    if (directoryContextMenu) {
      directoryContextMenu.style.display = 'none';
    }
  });
}

// Renombrar carpeta
if (contextRenameFolder) {
  contextRenameFolder.addEventListener('click', () => {
    if (currentContextDirectory) {
      openRenameFolderModal(currentContextDirectory);
    }
    if (directoryContextMenu) {
      directoryContextMenu.style.display = 'none';
    }
  });
}

// Quitar carpeta de destinos
if (contextRemoveDestination) {
  contextRemoveDestination.addEventListener('click', () => {
    if (currentContextDirectory && currentContextIsDestination) {
      const index = destinationDirectories.indexOf(currentContextDirectory);
      if (index > -1) {
        destinationDirectories.splice(index, 1);
        displayDestinationDirectories();
        console.log('[Context Menu] Carpeta quitada de destinos:', currentContextDirectory);
      }
    }
    if (directoryContextMenu) {
      directoryContextMenu.style.display = 'none';
    }
  });
}

// Modal de renombrar carpeta
function openRenameFolderModal(dirPath: string) {
  if (!renameFolderModal || !renameFolderInput) return;
  
  quickNavigationEnabled = false;
  const folderName = dirPath.split('\\').pop() || dirPath.split('/').pop() || '';
  renameFolderInput.value = folderName;
  renameFolderModal.style.display = 'flex';
  setTimeout(() => {
    renameFolderInput.focus();
    renameFolderInput.select();
  }, 100);
}

function closeRenameFolderModal() {
  if (!renameFolderModal || !renameFolderInput) return;
  
  quickNavigationEnabled = true;
  renameFolderModal.style.display = 'none';
  renameFolderInput.value = '';
  currentContextDirectory = null;
}

async function saveRenameFolder() {
  if (!currentContextDirectory || !renameFolderInput) return;
  
  const newName = renameFolderInput.value.trim();
  if (!newName) {
    alert('Debes ingresar un nombre para la carpeta');
    return;
  }
  
  const oldPath = currentContextDirectory;
  const parentPath = oldPath.substring(0, oldPath.lastIndexOf('\\')) || 
                     oldPath.substring(0, oldPath.lastIndexOf('/'));
  
  try {
    const success = await window.electronAPI.renameFolder(oldPath, newName);
    if (success) {
      console.log('[Rename] Carpeta renombrada:', oldPath, '->', newName);
      
      // Actualizar en destinos si existe
      const destIndex = destinationDirectories.indexOf(oldPath);
      if (destIndex > -1) {
        const newPath = `${parentPath}\\${newName}`;
        destinationDirectories[destIndex] = newPath;
        displayDestinationDirectories();
      }
      
      // Recargar subdirectorios si estamos en el padre
      if (currentDirectory === parentPath) {
        subdirectories = await window.electronAPI.getSubdirectories(currentDirectory);
        displaySubdirectories(subdirectories);
      }
      
      closeRenameFolderModal();
    } else {
      alert('Error al renombrar la carpeta');
    }
  } catch (error) {
    console.error('[Rename] Error:', error);
    alert('Error al renombrar la carpeta');
  }
}

// Event listeners para modal de renombrar
if (renameFolderInput) {
  renameFolderInput.addEventListener('input', (e) => {
    const target = e.target as HTMLInputElement;
    target.value = target.value.replace(/[<>:"/\\|?*\x00-\x1F]/g, '');
  });
  
  renameFolderInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveRenameFolder();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      closeRenameFolderModal();
    }
  });
}

if (cancelRenameBtn) {
  cancelRenameBtn.addEventListener('click', () => closeRenameFolderModal());
}

if (saveRenameBtn) {
  saveRenameBtn.addEventListener('click', () => saveRenameFolder());
}

if (renameFolderModal) {
  renameFolderModal.addEventListener('click', (e) => {
    if (e.target === renameFolderModal) {
      closeRenameFolderModal();
    }
  });
}

// Actualizar el mensaje del empty-state
function updateEmptyStateMessage(hasDirectory: boolean) {
  if (hasDirectory) {
    emptyStateText.textContent = 'Este directorio no tiene imágenes, prueba cambiar a otro';
  } else {
    emptyStateText.textContent = 'Haz click aquí para seleccionar el directorio a organizar';
  }
}

async function openDirectory() {
  console.log('[Renderer] Abriendo selector de directorio...');
  try {
    const directoryPath = await window.electronAPI.openDirectoryDialog();
    console.log('[Renderer] Directorio seleccionado:', directoryPath);
    if (directoryPath) {
      await loadDirectory(directoryPath);
    }
  } catch (error) {
    console.error('[Renderer] Error al abrir directorio:', error);
  }
}

async function openWithFile(filePath: string) {
  console.log('[Renderer] Abriendo con archivo:', filePath);
  try {
    // Obtener el directorio del archivo
    const directoryPath = filePath.substring(0, filePath.lastIndexOf('\\')) || 
                          filePath.substring(0, filePath.lastIndexOf('/'));
    
    if (directoryPath) {
      // Cargar el directorio normalmente
      await loadDirectory(directoryPath);
      
      // Buscar el índice de la imagen en la lista
      const imageIndex = currentImages.findIndex(img => img === filePath);
      
      if (imageIndex !== -1) {
        console.log('[Renderer] Imagen encontrada en índice:', imageIndex);
        // Navegar a la imagen específica
        navigateToImage(imageIndex);
      } else {
        console.warn('[Renderer] Imagen no encontrada en el directorio');
      }
    }
  } catch (error) {
    console.error('[Renderer] Error al abrir con archivo:', error);
  }
}

async function loadDirectory(directoryPath: string) {
  console.log('[Renderer] Cargando directorio:', directoryPath);
  
  // Salir de modo SM si está activo
  if (isMultiSelectMode) {
    exitMultiSelectMode();
  }
  
  // Cancelar generación previa
  thumbnailGenerationQueue.clear();
  isGeneratingBatch = false;
  
  currentDirectory = directoryPath;
  updateParentDirectoryButton();
  
  try {
    subdirectories = await window.electronAPI.getSubdirectories(directoryPath);
    displaySubdirectories(subdirectories);
    
    currentImages = await window.electronAPI.getImagesFromDirectory(directoryPath);
    console.log(`[RENDERER] Imágenes encontradas: ${currentImages.length}`);
    
    if (currentImages.length > 0) {
      // Obtener metadatos
      const metadata = await window.electronAPI.getImageMetadata(currentImages);
      imageMetadata.clear();
      metadata.forEach((m: any) => imageMetadata.set(m.path, m));
      
      // Ordenar según filtro actual
      await sortImages();
      
      currentImageIndex = 0;
      console.log('[RENDERER] currentImageIndex establecido a:', currentImageIndex);
      console.log('[RENDERER] Primera imagen:', currentImages[currentImageIndex]);
      emptyState.style.display = 'none';
      imageView.style.display = 'flex';
      showImage(currentImages[currentImageIndex]);
      await initializeCarousel();
    } else {
      // No hay imágenes en el directorio
      console.log('[RENDERER] No hay imágenes en el directorio');
      imageView.style.display = 'none';
      updateEmptyStateMessage(true);
      emptyState.style.display = 'flex';
    }
  } catch (error) {
    console.error('[Renderer] Error:', error);
  }
}

function showImage(imagePath: string) {
  console.log('=== [VIEWER] Mostrando imagen ===');
  console.log('[VIEWER] Ruta original:', imagePath);
  const fileUrl = `file:///${imagePath.replace(/\\/g, '/')}`;
  console.log('[VIEWER] URL de la imagen:', fileUrl);
  
  currentImage.onload = () => {
    console.log('[VIEWER] Imagen cargada correctamente');
  };
  
  currentImage.onerror = (e) => {
    console.error('[VIEWER] ERROR al cargar imagen:', e);
    console.error('[VIEWER] src que falló:', currentImage.src);
  };
  
  currentImage.src = fileUrl;
  
  // Ajustar la imagen al contenedor al cambiar de imagen
  fitToWindow();
  
  // Configurar comportamiento de drag según el modo actual
  updateImageDragBehavior();
  
  // Extraer y mostrar el nombre del archivo con tamaño
  const fileName = imagePath.split('\\').pop() || imagePath.split('/').pop() || '';
  const meta = imageMetadata.get(imagePath);
  const sizeText = meta ? ` (${formatFileSize(meta.size)})` : '';
  
  if (fileNameDisplay) {
    fileNameDisplay.textContent = fileName + sizeText;
    fileNameDisplay.title = fileName;
  }
  
  updateActiveCarouselItem();
  scrollCarouselToIndex(currentImageIndex);
}

async function initializeCarousel() {
  carouselTrack.innerHTML = '';
  thumbnailCache.clear();
  
  // Resetear scroll del carrusel
  carouselTrack.style.transform = 'translateX(0px)';
  
  // Crear items sin thumbnails
  currentImages.forEach((imagePath, index) => {
    const item = createCarouselItemPlaceholder(imagePath, index);
    carouselTrack.appendChild(item);
  });
  
  updateNavigationButtons();
  
  // Iniciar generación lazy
  generateVisibleThumbnails();
}

function createCarouselItemPlaceholder(imagePath: string, index: number): HTMLElement {
  const item = document.createElement('div');
  item.className = 'carousel-item';
  item.dataset.index = index.toString();
  item.dataset.imagePath = imagePath;
  item.dataset.loaded = 'false';
  
  if (index === currentImageIndex) {
    item.classList.add('active');
  }
  
  // Spinner
  item.innerHTML = '<div class="spinner"></div>';
  
  // Variables para long-press
  let pressTimer: number | null = null;
  
  // Mouse down - iniciar timer para long-press
  item.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return; // Solo botón izquierdo
    
    pressTimer = window.setTimeout(() => {
      // Long-press detectado - entrar en SM con esta imagen
      if (!isMultiSelectMode) {
        const idx = parseInt(item.dataset.index || '0', 10);
        currentImageIndex = idx;
        enterMultiSelectMode();
        justEnteredMultiSelect = true; // Activar flag
      }
    }, 500); // 500ms para long-press
  });
  
  // Mouse up o leave - cancelar timer
  item.addEventListener('mouseup', () => {
    if (pressTimer) {
      clearTimeout(pressTimer);
      pressTimer = null;
    }
  });
  
  item.addEventListener('mouseleave', () => {
    if (pressTimer) {
      clearTimeout(pressTimer);
      pressTimer = null;
    }
  });
  
  // Click normal
  item.addEventListener('click', () => {
    // Ignorar click si acabamos de entrar en SM vía long-press
    if (justEnteredMultiSelect) {
      justEnteredMultiSelect = false;
      return;
    }
    
    const idx = parseInt(item.dataset.index || '0', 10);
    
    if (isMultiSelectMode) {
      // En modo SM, toggle selección
      const imgPath = currentImages[idx];
      toggleImageSelection(imgPath);
    } else {
      // Modo normal, navegar
      navigateToImage(idx);
    }
  });
  
  return item;
}

// Generación lazy de thumbnails
function generateVisibleThumbnails() {
  if (currentImages.length === 0) return;
  
  const startIndex = Math.max(0, currentImageIndex - VISIBLE_BUFFER);
  const endIndex = Math.min(currentImages.length - 1, currentImageIndex + VISIBLE_BUFFER);
  
  // Agregar a cola
  for (let i = startIndex; i <= endIndex; i++) {
    const item = carouselTrack.children[i] as HTMLElement;
    if (item && item.dataset.loaded === 'false' && !thumbnailGenerationQueue.has(i)) {
      thumbnailGenerationQueue.add(i);
    }
  }
  
  // Procesar
  processThumbnailQueue();
}

async function processThumbnailQueue() {
  if (isGeneratingBatch) return;
  isGeneratingBatch = true;
  
  const queueArray = Array.from(thumbnailGenerationQueue);
  
  for (const index of queueArray) {
    if (generatingThumbnails >= MAX_CONCURRENT_THUMBNAILS) {
      break;
    }
    
    thumbnailGenerationQueue.delete(index);
    generateSingleThumbnail(index);
  }
  
  isGeneratingBatch = false;
}

async function generateSingleThumbnail(index: number) {
  const item = carouselTrack.children[index] as HTMLElement;
  if (!item || item.dataset.loaded === 'true') return;
  
  generatingThumbnails++;
  
  try {
    const imagePath = currentImages[index];
    const request = { filePath: imagePath, thumbnailSize: THUMBNAIL_SIZE };
    const result = await window.electronAPI.generateThumbnail(request);
    
    if (result) {
      item.innerHTML = '';
      const img = document.createElement('img');
      img.src = `file:///${result.thumbPath.replace(/\\/g, '/')}`;
      img.alt = 'Thumbnail';
      item.appendChild(img);
      item.dataset.loaded = 'true';
      
      thumbnailCache.set(imagePath, result.thumbPath);
    }
  } catch (error) {
    // Error silencioso
  } finally {
    generatingThumbnails--;
    
    // Continuar cola
    if (thumbnailGenerationQueue.size > 0) {
      setTimeout(() => processThumbnailQueue(), 10);
    }
  }
}

function navigateToImage(index: number) {
  if (index < 0 || index >= currentImages.length) return;
  currentImageIndex = index;
  
  // En modo SM, solo actualizar carrusel sin cambiar vista
  if (isMultiSelectMode) {
    updateActiveCarouselItem();
    scrollCarouselToIndex(currentImageIndex);
    generateVisibleThumbnails();
    return;
  }
  
  // Modo normal
  showImage(currentImages[currentImageIndex]);
  updateActiveCarouselItem();
  scrollCarouselToIndex(currentImageIndex);
  
  // Generar thumbnails visibles alrededor
  generateVisibleThumbnails();
}

function navigateNext() {
  if (currentImageIndex < currentImages.length - 1) {
    navigateToImage(currentImageIndex + 1);
    generateVisibleThumbnails();
  }
}

function navigatePrevious() {
  if (currentImageIndex > 0) {
    navigateToImage(currentImageIndex - 1);
    generateVisibleThumbnails();
  }
}

function navigateToFirst() {
  if (currentImages.length > 0) {
    navigateToImage(0);
  }
}

function navigateToLast() {
  if (currentImages.length > 0) {
    navigateToImage(currentImages.length - 1);
  }
}

function updateActiveCarouselItem() {
  const items = carouselTrack.querySelectorAll('.carousel-item');
  items.forEach((item, index) => {
    if (index === currentImageIndex) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });
}

function scrollCarouselToIndex(index: number) {
  const items = carouselTrack.querySelectorAll('.carousel-item');
  if (items.length === 0) return;
  
  const item = items[index] as HTMLElement;
  if (!item) return;
  
  const itemWidth = 84;
  const offset = itemWidth * index;
  const centerOffset = carouselTrack.offsetWidth / 2 - itemWidth / 2;
  
  carouselTrack.style.transform = `translateX(-${Math.max(0, offset - centerOffset)}px)`;
}

function updateNavigationButtons() {
  // Ya no deshabilitamos los botones, simplemente no harán nada si están en los extremos
  if (carouselNavLeft && carouselNavRight) {
    carouselNavLeft.disabled = false;
    carouselNavRight.disabled = false;
  }
}

function closeDirectory() {
  currentDirectory = null;
  currentImages = [];
  currentImageIndex = 0;
  subdirectories = [];
  thumbnailCache.clear();
  imageMetadata.clear();
  thumbnailGenerationQueue.clear();
  isGeneratingBatch = false;
  
  updateEmptyStateMessage(false);
  emptyState.style.display = 'flex';
  imageView.style.display = 'none';
  subdirectoriesList.innerHTML = '<p class="empty-message">No hay directorio abierto</p>';
  carouselTrack.innerHTML = '';
  
  // Resetear scroll del carrusel
  carouselTrack.style.transform = 'translateX(0px)';
  
  // Actualizar botón de directorio padre
  updateParentDirectoryButton();
}

// Funciones auxiliares
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
}

function showLoading(message: string = 'Procesando...') {
  loadingText.textContent = message;
  loadingOverlay.style.display = 'flex';
  imageView.style.display = 'none';
}

function hideLoading() {
  loadingOverlay.style.display = 'none';
  if (currentImages.length > 0) {
    imageView.style.display = 'flex';
  }
}

async function sortImages() {
  // Para ordenamiento por fecha de descarga (beta), usar PowerShell con Explorer Date
  if (currentSortOrder === 'date-asc' || currentSortOrder === 'date-desc') {
    if (!currentDirectory) return;
    
    console.log('[Renderer] Ordenando por fecha de descarga con Explorer...');
    showLoading('Ordenando por fecha de descarga...');
    
    try {
      const descending = currentSortOrder === 'date-desc';
      const sortedPaths = await window.electronAPI.getExplorerDateOrder(currentDirectory, descending);
      
      if (sortedPaths && Array.isArray(sortedPaths)) {
        // Reordenar currentImages según el orden devuelto por PowerShell
        const pathSet = new Set(sortedPaths);
        currentImages = sortedPaths.filter(p => currentImages.includes(p));
        console.log('[Renderer] Imágenes ordenadas por Explorer Date');
      } else {
        console.warn('[Renderer] No se pudo obtener orden de Explorer, usando fallback');
        // Fallback al ordenamiento normal
        currentImages.sort((a, b) => {
          const metaA = imageMetadata.get(a);
          const metaB = imageMetadata.get(b);
          if (!metaA || !metaB) return 0;
          return descending ? metaB.createdTime - metaA.createdTime : metaA.createdTime - metaB.createdTime;
        });
      }
    } finally {
      hideLoading();
    }
  } else {
    // Ordenamiento normal para nombre, tamaño y fecha de creación
    currentImages.sort((a, b) => {
      const metaA = imageMetadata.get(a);
      const metaB = imageMetadata.get(b);
      
      if (!metaA || !metaB) return 0;
      
      switch (currentSortOrder) {
        case 'name-asc':
          return metaA.name.localeCompare(metaB.name, undefined, { numeric: true });
        case 'name-desc':
          return metaB.name.localeCompare(metaA.name, undefined, { numeric: true });
        case 'created-asc':
          return metaA.createdTime - metaB.createdTime;
        case 'created-desc':
          return metaB.createdTime - metaA.createdTime;
        case 'size-asc':
          return metaA.size - metaB.size;
        case 'size-desc':
          return metaB.size - metaA.size;
        default:
          return 0;
      }
    });
  }
}

// Navegar al directorio padre
function navigateToParentDirectory() {
  if (!currentDirectory) return;
  
  console.log('[Renderer] Navegando al directorio padre...');
  
  // Obtener directorio padre
  const parentPath = currentDirectory.split('\\').slice(0, -1).join('\\') || 
                     currentDirectory.split('/').slice(0, -1).join('/');
  
  if (parentPath && parentPath !== currentDirectory) {
    loadDirectory(parentPath);
  }
}

// Actualizar estado del botón de directorio padre
function updateParentDirectoryButton() {
  if (!parentDirectoryBtn) return;
  
  if (!currentDirectory) {
    parentDirectoryBtn.style.display = 'none';
    return;
  }
  
  // Mostrar el botón si hay directorio activo
  parentDirectoryBtn.style.display = 'flex';
  
  // Verificar si estamos en la raíz (ej: C:\ o /)
  const isRoot = /^[A-Za-z]:\\?$/.test(currentDirectory) || currentDirectory === '/';
  parentDirectoryBtn.disabled = isRoot;
}

function displaySubdirectories(directories: any[]) {
  if (directories.length === 0) {
    subdirectoriesList.innerHTML = '<p class="empty-message">No hay subdirectorios</p>';
  } else {
    subdirectoriesList.innerHTML = directories
      .map(dir => `
        <div class="subdirectory-item" data-path="${dir.path}" data-is-destination="false" title="${dir.path}">
          <svg class="folder-icon-large" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
          </svg>
          <span class="subdirectory-name">${dir.name}</span>
        </div>
      `)
      .join('');
    
    // Agregar event listeners para doble clic y clic en subdirectorios
    const subdirItems = subdirectoriesList.querySelectorAll('.subdirectory-item');
    subdirItems.forEach((item) => {
      const htmlItem = item as HTMLElement;
      
      // Clic simple: centrar y parpadear
      htmlItem.addEventListener('click', () => {
        const isHorizontal = window.innerWidth <= 1200;
        if (isHorizontal) {
          htmlItem.scrollIntoView({ behavior: 'auto', inline: 'center' });
        } else {
          htmlItem.scrollIntoView({ behavior: 'auto', block: 'center' });
        }
        htmlItem.style.animation = 'directoryBlink 0.6s ease-in-out';
        setTimeout(() => {
          htmlItem.style.animation = '';
        }, 600);
      });
      
      // Clic derecho: menú contextual
      htmlItem.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        showDirectoryContextMenu(e, htmlItem.dataset.path || '', false);
      });
      
      // Configurar drop zone
      setupDropZone(htmlItem);
    });
  }
  
  // Actualizar botones de scroll después de cargar directorios
  setTimeout(() => updateSidebarScrollButtons(), 100);
}

function displayDestinationDirectories() {
  if (destinationDirectories.length === 0) {
    destinationDirectoriesList.innerHTML = '';
    destinationSection.style.display = 'none';
  } else {
    destinationDirectoriesList.innerHTML = destinationDirectories
      .map(dirPath => {
        const dirName = dirPath.split('\\').pop() || dirPath.split('/').pop() || dirPath;
        return `
          <div class="destination-item subdirectory-item" data-path="${dirPath}" data-is-destination="true" title="${dirPath}">
            <svg class="folder-icon-large" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
            </svg>
            <span class="subdirectory-name">${dirName}</span>
          </div>
        `;
      })
      .join('');
    destinationSection.style.display = 'block';
    
    // Agregar event listeners para clic y doble clic en directorios destino
    const destItems = destinationDirectoriesList.querySelectorAll('.destination-item');
    destItems.forEach((item) => {
      const htmlItem = item as HTMLElement;
      
      // Clic simple: centrar y parpadear
      htmlItem.addEventListener('click', () => {
        const isHorizontal = window.innerWidth <= 1200;
        if (isHorizontal) {
          htmlItem.scrollIntoView({ behavior: 'auto', inline: 'center' });
        } else {
          htmlItem.scrollIntoView({ behavior: 'auto', block: 'center' });
        }
        htmlItem.style.animation = 'directoryBlink 0.6s ease-in-out';
        setTimeout(() => {
          htmlItem.style.animation = '';
        }, 600);
      });
      
      // Clic derecho: menú contextual
      htmlItem.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        showDirectoryContextMenu(e, htmlItem.dataset.path || '', true);
      });
      
      // Configurar drop zone
      setupDropZone(htmlItem);
    });
  }
  
  // Actualizar botones de scroll después de cargar directorios destino
  setTimeout(() => updateSidebarScrollButtons(), 100);
}

// Configurar drag and drop
function setupDropZone(element: HTMLElement) {
  element.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
    element.classList.add('drag-over');
  });
  
  element.addEventListener('dragleave', (e) => {
    e.preventDefault();
    e.stopPropagation();
    element.classList.remove('drag-over');
  });
  
  element.addEventListener('drop', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    element.classList.remove('drag-over');
    
    const targetPath = element.dataset.path;
    if (!targetPath || currentImages.length === 0) return;
    
    // Verificar si es modo SM
    if (isMultiSelectMode && selectedImages.length > 0) {
      // Mover todas las imágenes seleccionadas
      await moveSelectedImages(targetPath);
    } else {
      // Modo normal - mover solo la imagen actual
      const currentImagePath = currentImages[currentImageIndex];
      await moveImageToDirectory(currentImagePath, targetPath);
    }
  });
}

// Configurar eventos de drag en la imagen principal
if (currentImage) {
  currentImage.addEventListener('dragstart', (e) => {
    // No permitir drag en modo SM (se arrastra desde miniaturas del viewer)
    if (isMultiSelectMode) {
      e.preventDefault();
      return;
    }
    
    if (currentImages.length === 0) {
      e.preventDefault();
      return;
    }
    
    // Establecer datos del drag
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', currentImages[currentImageIndex]);
    }
  });
  
  currentImage.addEventListener('dragend', () => {
    document.body.style.cursor = 'default';
  });
  
  // Configurar cursor grab por defecto
  currentImage.style.cursor = 'grab';
}

async function moveImageToDirectory(imagePath: string, targetDirectory: string) {
  try {
    const result = await window.electronAPI.moveFile(imagePath, targetDirectory);
    
    if (result.success) {
      console.log('[Renderer] Imagen movida a:', targetDirectory);
      
      // Encontrar y eliminar la miniatura del carrusel
      const thumbnails = carouselTrack.querySelectorAll('.carousel-item');
      if (thumbnails[currentImageIndex]) {
        thumbnails[currentImageIndex].remove();
      }
      
      // Eliminar de la lista actual
      currentImages.splice(currentImageIndex, 1);
      
      // Eliminar del cache de miniaturas
      thumbnailCache.delete(imagePath);
      
      if (currentImages.length === 0) {
        // No quedan imágenes
        emptyState.style.display = 'flex';
        imageView.style.display = 'none';
      } else {
        // Ajustar índice si es necesario
        if (currentImageIndex >= currentImages.length) {
          currentImageIndex = currentImages.length - 1;
        }
        
        // Mostrar siguiente imagen
        showImage(currentImages[currentImageIndex]);
        
        // Actualizar los índices de las miniaturas restantes
        updateCarouselIndices();
        
        // Generar miniaturas visibles después de mover
        generateVisibleThumbnails();
        
        updateNavigationButtons();
      }
    } else if (result.exists && result.targetPath) {
      // Archivo duplicado, abrir modal de conflicto
      console.log('[Renderer] Conflicto detectado, abriendo modal');
      await handleFileConflict(imagePath, targetDirectory, result.targetPath);
    } else {
      console.error('[Renderer] Error al mover imagen - resultado inesperado:', result);
      alert('Error al mover la imagen');
    }
  } catch (error) {
    console.error('[Renderer] Error al mover imagen - excepción capturada:', error);
    console.error('[Renderer] Detalles del error:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      errorObject: error
    });
    alert('Error al mover la imagen');
  }
}

function removeCurrentImageFromList() {
  const imagePath = currentImages[currentImageIndex];
  
  // Encontrar y eliminar la miniatura del carrusel
  const thumbnails = carouselTrack.querySelectorAll('.carousel-item');
  if (thumbnails[currentImageIndex]) {
    thumbnails[currentImageIndex].remove();
  }
  
  // Eliminar de la lista actual
  currentImages.splice(currentImageIndex, 1);
  
  // Eliminar del cache de miniaturas
  thumbnailCache.delete(imagePath);
  
  if (currentImages.length === 0) {
    // No quedan imágenes
    emptyState.style.display = 'flex';
    imageView.style.display = 'none';
  } else {
    // Ajustar índice si es necesario
    if (currentImageIndex >= currentImages.length) {
      currentImageIndex = currentImages.length - 1;
    }
    
    // Mostrar siguiente imagen
    showImage(currentImages[currentImageIndex]);
    
    // Actualizar los índices de las miniaturas restantes
    updateCarouselIndices();
    
    // Generar miniaturas visibles después de eliminar
    generateVisibleThumbnails();
    
    updateNavigationButtons();
  }
}

emptyState.addEventListener('click', () => openDirectory());

// Botones del toolbar
const openDirectoryBtn = document.getElementById('open-directory-btn');
const newFolderBtn = document.getElementById('new-folder-btn');
const closeDirectoryBtn = document.getElementById('close-directory-btn');
const addDestinationBtn = document.getElementById('add-destination-btn');
const clearDestinationsBtn = document.getElementById('clear-destinations-btn');
const clearCacheBtn = document.getElementById('clear-cache-btn');

if (openDirectoryBtn) {
  openDirectoryBtn.addEventListener('click', () => openDirectory());
}

if (newFolderBtn) {
  newFolderBtn.addEventListener('click', () => openNewFolderModal());
}

if (closeDirectoryBtn) {
  closeDirectoryBtn.addEventListener('click', () => closeDirectory());
}

if (addDestinationBtn) {
  addDestinationBtn.addEventListener('click', async () => {
    const directoryPath = await window.electronAPI.openDirectoryDialog();
    if (directoryPath && !destinationDirectories.includes(directoryPath)) {
      destinationDirectories.push(directoryPath);
      displayDestinationDirectories();
      
      // Hacer focus en el directorio recién agregado
      setTimeout(() => {
        const destItems = destinationDirectoriesList.querySelectorAll('.destination-item');
        const lastItem = destItems[destItems.length - 1] as HTMLElement;
        
        if (lastItem) {
          const isHorizontal = window.innerWidth <= 1200;
          if (isHorizontal) {
            lastItem.scrollIntoView({ behavior: 'auto', inline: 'center' });
          } else {
            lastItem.scrollIntoView({ behavior: 'auto', block: 'center' });
          }
          
          lastItem.style.animation = 'directoryBlink 0.6s ease-in-out';
          setTimeout(() => {
            lastItem.style.animation = '';
          }, 600);
        }
      }, 50);
    }
  });
}

if (clearDestinationsBtn) {
  clearDestinationsBtn.addEventListener('click', () => {
    destinationDirectories = [];
    displayDestinationDirectories();
  });
}

if (clearCacheBtn) {
  clearCacheBtn.addEventListener('click', async () => {
    const confirmed = confirm('¿Estás seguro de que deseas limpiar el caché de miniaturas? Esto eliminará todas las miniaturas guardadas y se volverán a generar al cargar imágenes.');
    if (confirmed) {
      try {
        const success = await window.electronAPI.clearCache();
        if (success) {
          alert('Caché limpiado correctamente');
          // Recargar directorio actual si hay uno abierto
          if (currentDirectory) {
            await loadDirectory(currentDirectory);
          }
        } else {
          alert('Error al limpiar el caché');
        }
      } catch (error) {
        console.error('[Renderer] Error al limpiar caché:', error);
        alert('Error al limpiar el caché');
      }
    }
  });
}

// Botón de directorio padre
if (parentDirectoryBtn) {
  parentDirectoryBtn.addEventListener('click', () => navigateToParentDirectory());
}

// Modal de nueva carpeta
const newFolderModal = document.getElementById('new-folder-modal') as HTMLElement;
const folderNameInput = document.getElementById('folder-name-input') as HTMLInputElement;
const saveFolderBtn = document.getElementById('save-folder-btn') as HTMLButtonElement;

function openNewFolderModal() {
  if (!currentDirectory) {
    alert('Debes abrir un directorio primero');
    return;
  }
  
  quickNavigationEnabled = false;
  newFolderModal.style.display = 'flex';
  folderNameInput.value = '';
  setTimeout(() => folderNameInput.focus(), 100);
}

function closeNewFolderModal() {
  quickNavigationEnabled = true;
  newFolderModal.style.display = 'none';
  folderNameInput.value = '';
}

async function createNewFolder() {
  const folderName = folderNameInput.value.trim();
  
  if (!folderName) {
    alert('Debes ingresar un nombre para la carpeta');
    return;
  }
  
  if (!currentDirectory) {
    alert('No hay directorio activo');
    return;
  }
  
  try {
    const success = await window.electronAPI.createFolder(currentDirectory, folderName);
    if (success) {
      closeNewFolderModal();
      // Recargar subdirectorios
      subdirectories = await window.electronAPI.getSubdirectories(currentDirectory);
      displaySubdirectories(subdirectories);
      
      // Hacer focus en la nueva carpeta
      setTimeout(() => {
        focusDirectoryByName(folderName);
      }, 200);
    } else {
      alert('Error al crear la carpeta');
    }
  } catch (error) {
    console.error('[Renderer] Error al crear carpeta:', error);
    alert('Error al crear la carpeta');
  }
}

// Validar caracteres del input
if (folderNameInput) {
  folderNameInput.addEventListener('input', (e) => {
    const target = e.target as HTMLInputElement;
    // Eliminar caracteres no válidos para nombres de carpetas en Windows
    target.value = target.value.replace(/[<>:"/\\|?*\x00-\x1F]/g, '');
  });
  
  folderNameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      createNewFolder();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      closeNewFolderModal();
    }
  });
}

if (saveFolderBtn) {
  saveFolderBtn.addEventListener('click', () => createNewFolder());
}

// Cerrar modal al hacer click fuera
if (newFolderModal) {
  newFolderModal.addEventListener('click', (e) => {
    if (e.target === newFolderModal) {
      closeNewFolderModal();
    }
  });
}

if (carouselNavFirst) {
  carouselNavFirst.addEventListener('click', () => navigateToFirst());
}

if (carouselNavLeft) {
  carouselNavLeft.addEventListener('click', () => navigatePrevious());
}

if (carouselNavRight) {
  carouselNavRight.addEventListener('click', () => navigateNext());
}

if (carouselNavLast) {
  carouselNavLast.addEventListener('click', () => navigateToLast());
}

// Scroll vertical del carrusel con rueda del mouse
if (carouselTrack) {
  carouselTrack.addEventListener('wheel', (e) => {
    if (currentImages.length === 0) return;
    
    // Solo procesar scroll vertical (no horizontal)
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      e.preventDefault();
      e.stopPropagation();
      
      // Scroll hacia abajo = siguiente imagen, hacia arriba = imagen anterior
      if (e.deltaY > 0) {
        navigateNext();
      } else if (e.deltaY < 0) {
        navigatePrevious();
      }
    }
  }, { passive: false });
}

document.addEventListener('keydown', (e) => {
  if (currentImages.length === 0) return;
  
  // CTRL para activar modo SM
  if (e.key === 'Control' && !isMultiSelectMode) {
    // No activar modo SM si hay modales abiertos (CTRL se usa para moverse entre palabras)
    if (!quickNavigationEnabled) return;
    e.preventDefault();
    toggleMultiSelectMode();
    return;
  }
  
  // ESC para salir de modo SM
  if (e.key === 'Escape' && isMultiSelectMode) {
    e.preventDefault();
    exitMultiSelectMode();
    return;
  }
  
  if (e.key === 'ArrowLeft') {
    // No procesar si hay modales abiertos (la única navegación válida debe ser en el input)
    if (!quickNavigationEnabled) return;
    e.preventDefault();
    // En SM solo mueve carrusel, no cambia selección
    navigatePrevious();
  } else if (e.key === 'ArrowRight') {
    // No procesar si hay modales abiertos (la única navegación válida debe ser en el input)
    if (!quickNavigationEnabled) return;
    e.preventDefault();
    // En SM solo mueve carrusel, no cambia selección
    navigateNext();
  } else if (e.key === 'ArrowUp') {
    if (isMultiSelectMode) return; // Deshabilitado en SM
    e.preventDefault();
    zoomIn();
  } else if (e.key === 'ArrowDown') {
    if (isMultiSelectMode) return; // Deshabilitado en SM
    e.preventDefault();
    zoomOut();
  } else if (e.key === 'Delete') {
    if (isMultiSelectMode) return; // Deshabilitado en SM
    e.preventDefault();
    deleteCurrentImage();
  } else if (e.key === '1') {
    if (isMultiSelectMode) return; // Deshabilitado en SM
    e.preventDefault();
    toggleFitMode();
  } else if (/^[a-zA-Z2-9]$/.test(e.key) && quickNavigationEnabled) {
    // Navegación rápida por directorios (letras y números 2-9)
    e.preventDefault();
    focusDirectoryByKey(e.key.toUpperCase());
  }
});

async function deleteCurrentImage() {
  if (currentImages.length === 0 || currentImageIndex < 0) return;
  
  const currentImagePath = currentImages[currentImageIndex];
  const fileName = currentImagePath.split('\\').pop() || currentImagePath.split('/').pop() || '';
  
  try {
    const success = await window.electronAPI.moveToTrash(currentImagePath);
    
    if (success) {
      console.log('[Renderer] Imagen enviada a la papelera:', fileName);
      
      // Encontrar y eliminar la miniatura del carrusel
      const thumbnails = carouselTrack.querySelectorAll('.carousel-item');
      if (thumbnails[currentImageIndex]) {
        thumbnails[currentImageIndex].remove();
      }
      
      // Eliminar de la lista actual
      currentImages.splice(currentImageIndex, 1);
      
      // Eliminar del cache de miniaturas
      thumbnailCache.delete(currentImagePath);
      
      if (currentImages.length === 0) {
        // No quedan imágenes
        emptyState.style.display = 'flex';
        imageView.style.display = 'none';
      } else {
        // Ajustar índice si es necesario
        if (currentImageIndex >= currentImages.length) {
          currentImageIndex = currentImages.length - 1;
        }
        
        // Mostrar siguiente imagen
        showImage(currentImages[currentImageIndex]);
        
        // Actualizar los índices de las miniaturas restantes
        updateCarouselIndices();
        
        updateNavigationButtons();
      }
    } else {
      console.error('[Renderer] Error al eliminar imagen');
    }
  } catch (error) {
    console.error('[Renderer] Error al eliminar imagen:', error);
  }
}

function updateCarouselIndices() {
  const remainingThumbnails = carouselTrack.querySelectorAll('.carousel-item');
  remainingThumbnails.forEach((thumb, idx) => {
    const htmlThumb = thumb as HTMLElement;
    htmlThumb.dataset.index = idx.toString();
    
    if (idx === currentImageIndex) {
      thumb.classList.add('active');
    } else {
      thumb.classList.remove('active');
    }
  });
}

window.electronAPI.onDirectoryOpened((directoryPath: string) => loadDirectory(directoryPath));
window.electronAPI.onDirectoryClosed(() => closeDirectory());
window.electronAPI.onOpenWithFile((filePath: string) => openWithFile(filePath));

currentImage.addEventListener('error', (e) => {
  console.error('[Renderer] Error cargando imagen:', currentImage.src);
});

// ===== FUNCIONALIDAD DE ZOOM =====

function applyImageTransform() {
  // Aplicar transform combinando zoom y offset
  if (isRepositionMode) {
    currentImage.style.transform = `scale(${currentZoom}) translate(${imageOffsetX}px, ${imageOffsetY}px)`;
  } else {
    currentImage.style.transform = `scale(${currentZoom})`;
  }
}

function applyZoom(zoom: number) {
  currentZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom));
  applyImageTransform();
  currentImage.style.maxWidth = 'none';
  currentImage.style.maxHeight = 'none';
  
  if (currentZoom > 1) {
    currentImage.classList.add('zoomed');
    mainImageContainer.style.overflow = 'auto';
  } else {
    currentImage.classList.remove('zoomed');
    mainImageContainer.style.overflow = 'auto';
  }
}

function zoomIn() {
  applyZoom(currentZoom + ZOOM_STEP);
}

function zoomOut() {
  applyZoom(currentZoom - ZOOM_STEP);
}

function resetZoom() {
  // Restablecer al tamaño real (1:1)
  isFitToWindow = false;
  currentZoom = 1;
  imageOffsetX = 0;
  imageOffsetY = 0;
  applyImageTransform();
  currentImage.style.maxWidth = 'none';
  currentImage.style.maxHeight = 'none';
  currentImage.classList.add('zoomed');
  mainImageContainer.style.overflow = 'auto';
  mainImageContainer.scrollTop = 0;
  mainImageContainer.scrollLeft = 0;
}

function fitToWindow() {
  // Ajustar la imagen al contenedor
  isFitToWindow = true;
  currentZoom = 1;
  imageOffsetX = 0;
  imageOffsetY = 0;
  applyImageTransform();
  currentImage.style.maxWidth = '100%';
  currentImage.style.maxHeight = '100%';
  currentImage.classList.remove('zoomed');
  mainImageContainer.style.overflow = 'auto';
  mainImageContainer.scrollTop = 0;
  mainImageContainer.scrollLeft = 0;
}

function toggleFitMode() {
  // Alternar entre fit-to-window y 1:1
  if (isFitToWindow) {
    resetZoom();
  } else {
    fitToWindow();
  }
}

function toggleDragMode() {
  isRepositionMode = !isRepositionMode;
  
  // Resetear offsets al cambiar de modo
  imageOffsetX = 0;
  imageOffsetY = 0;
  applyImageTransform();
  
  if (toggleDragModeBtn) {
    if (isRepositionMode) {
      toggleDragModeBtn.classList.add('active');
      toggleDragModeBtn.title = 'Modo: Reposicionar imagen (Click para cambiar a Mover archivos)';
    } else {
      toggleDragModeBtn.classList.remove('active');
      toggleDragModeBtn.title = 'Modo: Mover archivos (Click para cambiar a Reposicionar imagen)';
    }
  }
  
  // Actualizar el comportamiento de draggable en la imagen actual
  updateImageDragBehavior();
}

function updateImageDragBehavior() {
  if (!currentImage) return;
  
  if (isRepositionMode) {
    // Modo REPO: desactivar drag nativo, cursor move
    currentImage.draggable = false;
    currentImage.style.cursor = 'move';
  } else {
    // Modo MAA: activar drag nativo, cursor grab
    currentImage.draggable = true;
    currentImage.style.cursor = 'grab';
  }
}

// Event listeners para botones de zoom
if (zoomInBtn) {
  zoomInBtn.addEventListener('click', () => zoomIn());
}

if (zoomOutBtn) {
  zoomOutBtn.addEventListener('click', () => zoomOut());
}

if (zoomResetBtn) {
  zoomResetBtn.addEventListener('click', () => resetZoom());
}

if (fitToWindowBtn) {
  fitToWindowBtn.addEventListener('click', () => fitToWindow());
}

// Event listener para el botón de cambio de modo drag
if (toggleDragModeBtn) {
  toggleDragModeBtn.addEventListener('click', () => {
    toggleDragMode();
  });
}

// Event listener para el botón de selección múltiple
if (multiSelectBtn) {
  multiSelectBtn.addEventListener('click', () => {
    toggleMultiSelectMode();
  });
}

// Event listener para el botón de organizar por año
if (organizeByYearBtn) {
  organizeByYearBtn.addEventListener('click', () => {
    if (organizeYearModal) {
      organizeYearModal.style.display = 'flex';
    }
  });
}

// Event listener para el botón de escaneo de duplicados
if (duplicateScanBtn) {
  duplicateScanBtn.addEventListener('click', async () => {
    if (!isDuplicateScanMode) {
      await startDuplicateScan();
    }
  });
}

// Event listeners para el modal de organizar por año
if (organizeYearNoBtn) {
  organizeYearNoBtn.addEventListener('click', () => {
    if (organizeYearModal) {
      organizeYearModal.style.display = 'none';
    }
  });
}

if (organizeYearYesBtn) {
  organizeYearYesBtn.addEventListener('click', async () => {
    if (!currentDirectory) {
      console.warn('[Renderer] No hay directorio actual para organizar');
      return;
    }
    
    if (organizeYearModal) {
      organizeYearModal.style.display = 'none';
    }
    
    console.log('[Renderer] Organizando por año...', currentDirectory);
    showLoading('Organizando imágenes por año...');
    
    try {
      const result = await window.electronAPI.organizeByYear(currentDirectory);
      
      if (result.success) {
        console.log('[Renderer] Organización completada:', result.message);
        // Recargar el directorio para mostrar las nuevas carpetas de año
        await loadDirectory(currentDirectory);
      } else {
        console.error('[Renderer] Error en organización:', result.error);
        alert('Error al organizar archivos: ' + result.error);
      }
    } catch (error) {
      console.error('[Renderer] Error organizando por año:', error);
      alert('Error al organizar archivos');
    } finally {
      hideLoading();
    }
  });
}

// Cerrar modal al hacer clic fuera del contenido
if (organizeYearModal) {
  organizeYearModal.addEventListener('click', (e) => {
    if (e.target === organizeYearModal) {
      organizeYearModal.style.display = 'none';
    }
  });
}

// Event listeners para el dropdown de filtros
if (filterBtn && filterMenu) {
  // Marcar opción por defecto como activa
  const defaultOption = filterMenu.querySelector('.filter-option[data-sort="name-asc"]');
  if (defaultOption) {
    defaultOption.classList.add('active');
  }

  // Toggle del menú desplegable
  filterBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    filterMenu.classList.toggle('show');
  });

  // Cerrar menú al hacer clic fuera
  document.addEventListener('click', () => {
    filterMenu.classList.remove('show');
  });

  // Manejar selección de opciones de filtro
  const filterOptions = filterMenu.querySelectorAll('.filter-option');
  filterOptions.forEach(option => {
    option.addEventListener('click', async (e) => {
      e.stopPropagation();
      
      const sortOrder = option.getAttribute('data-sort') as 'name-asc' | 'name-desc' | 'date-asc' | 'date-desc' | 'size-asc' | 'size-desc';
      if (!sortOrder) return;
      
      // Actualizar orden currentSortOrder
      currentSortOrder = sortOrder;
      
      // Actualizar clases activas
      filterOptions.forEach(opt => opt.classList.remove('active'));
      option.classList.add('active');
      
      // Cerrar menú
      filterMenu.classList.remove('show');
      
      // Reordenar y recargar carousel
      if (currentImages.length > 0) {
        await sortImages();
        initializeCarousel();
        showImage(currentImages[currentImageIndex]);
      }
    });
  });
}

// Event listener para botón central del mouse (toggle drag mode)
document.addEventListener('mousedown', (e) => {
  // Button 1 = botón central del mouse
  if (e.button === 1) {
    e.preventDefault();
    toggleDragMode();
  }
});

// Zoom con rueda del ratón sobre la imagen
if (mainImageContainer) {
  mainImageContainer.addEventListener('wheel', (e) => {
    if (currentImages.length === 0) return;
    
    e.preventDefault();
    
    // Detectar scroll horizontal (botones laterales del mouse)
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
      // Scroll horizontal: cambiar imagen
      if (e.deltaX > 0) {
        navigateNext();
      } else if (e.deltaX < 0) {
        navigatePrevious();
      }
    } else {
      // Scroll vertical: zoom
      const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
      applyZoom(currentZoom + delta);
    }
  }, { passive: false });
}

// Arrastrar imagen cuando está en zoom o en modo reposicionamiento
if (currentImage) {
  currentImage.addEventListener('mousedown', (e) => {
    // En modo REPO: siempre permitir reposicionamiento
    // En modo MAA: solo permitir cuando zoom > 1
    if (!isRepositionMode && currentZoom <= 1) return;
    
    isDragging = true;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    
    if (isRepositionMode) {
      // En modo REPO: guardar el offset inicial para acumularlo
      scrollStartX = imageOffsetX;
      scrollStartY = imageOffsetY;
    } else {
      // En modo MAA con zoom: usar scroll
      scrollStartX = mainImageContainer.scrollLeft;
      scrollStartY = mainImageContainer.scrollTop;
    }
    
    currentImage.style.cursor = 'grabbing';
    e.preventDefault();
  });
}

if (mainImageContainer) {
  mainImageContainer.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    if (!isRepositionMode && currentZoom <= 1) return;
    
    const dx = e.clientX - dragStartX;
    const dy = e.clientY - dragStartY;
    
    if (isRepositionMode) {
      // En modo REPO: acumular el delta al offset inicial
      imageOffsetX = scrollStartX + dx;
      imageOffsetY = scrollStartY + dy;
      applyImageTransform();
    } else {
      // En modo MAA con zoom: usar scroll normal
      mainImageContainer.scrollLeft = scrollStartX - dx;
      mainImageContainer.scrollTop = scrollStartY - dy;
    }
  });
  
  mainImageContainer.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      if (isRepositionMode) {
        currentImage.style.cursor = 'move';
      } else if (currentZoom > 1) {
        currentImage.style.cursor = 'grab';
      } else {
        currentImage.style.cursor = 'default';
      }
    }
  });
  
  mainImageContainer.addEventListener('mouseleave', () => {
    if (isDragging) {
      isDragging = false;
      if (isRepositionMode) {
        currentImage.style.cursor = 'move';
      } else if (currentZoom > 1) {
        currentImage.style.cursor = 'grab';
      } else {
        currentImage.style.cursor = 'default';
      }
    }
  });
}

// ===== SIDEBAR SCROLL BUTTONS =====

function updateSidebarScrollButtons() {
  if (!sidebar || !sidebarScrollTopBtn || !sidebarScrollBottomBtn) return;
  
  const isHorizontal = window.innerWidth <= 1200;
  
  if (isHorizontal) {
    // Modo horizontal: scroll left/right
    const scrollLeft = sidebar.scrollLeft;
    const scrollWidth = sidebar.scrollWidth;
    const clientWidth = sidebar.clientWidth;
    const scrollRight = scrollWidth - scrollLeft - clientWidth;
    
    // Mostrar botón "ir izquierda" si no está al inicio
    if (scrollLeft > 10) {
      sidebarScrollTopBtn.style.display = 'flex';
    } else {
      sidebarScrollTopBtn.style.display = 'none';
    }
    
    // Mostrar botón "ir derecha" si no está al final
    if (scrollRight > 10) {
      sidebarScrollBottomBtn.style.display = 'flex';
    } else {
      sidebarScrollBottomBtn.style.display = 'none';
    }
  } else {
    // Modo vertical: scroll up/down
    const scrollTop = sidebar.scrollTop;
    const scrollHeight = sidebar.scrollHeight;
    const clientHeight = sidebar.clientHeight;
    const scrollBottom = scrollHeight - scrollTop - clientHeight;
    
    // Mostrar botón "ir arriba" si no está en el tope
    if (scrollTop > 10) {
      sidebarScrollTopBtn.style.display = 'flex';
    } else {
      sidebarScrollTopBtn.style.display = 'none';
    }
    
    // Mostrar botón "ir abajo" si no está en el fondo
    if (scrollBottom > 10) {
      sidebarScrollBottomBtn.style.display = 'flex';
    } else {
      sidebarScrollBottomBtn.style.display = 'none';
    }
  }
}

// Event listeners para los botones de scroll de sidebar
if (sidebarScrollTopBtn) {
  sidebarScrollTopBtn.addEventListener('click', () => {
    const isHorizontal = window.innerWidth <= 1200;
    if (isHorizontal) {
      sidebar.scrollTo({ left: 0, behavior: 'smooth' });
    } else {
      sidebar.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });
}

if (sidebarScrollBottomBtn) {
  sidebarScrollBottomBtn.addEventListener('click', () => {
    const isHorizontal = window.innerWidth <= 1200;
    if (isHorizontal) {
      sidebar.scrollTo({ left: sidebar.scrollWidth, behavior: 'smooth' });
    } else {
      sidebar.scrollTo({ top: sidebar.scrollHeight, behavior: 'smooth' });
    }
  });
}

// Detectar scroll en sidebar para actualizar botones
if (sidebar) {
  sidebar.addEventListener('scroll', updateSidebarScrollButtons);
  // También actualizar en resize
  window.addEventListener('resize', updateSidebarScrollButtons);
  
  // Scroll horizontal con rueda del mouse en modo horizontal
  sidebar.addEventListener('wheel', (e) => {
    const isHorizontal = window.innerWidth <= 1200;
    if (isHorizontal) {
      e.preventDefault();
      sidebar.scrollLeft += e.deltaY;
    }
  });
}

// ===== NAVEGACIÓN RÁPIDA POR DIRECTORIOS =====

function focusDirectoryByKey(key: string) {
  const now = Date.now();
  
  // Si es una nueva búsqueda (más de 800ms desde la última tecla), reiniciar
  if (directorySearchTimeout) {
    clearTimeout(directorySearchTimeout);
  }
  
  if (now - lastKeyPressTime > 800) {
    directorySearchString = '';
    currentFocusIndex = -1;
  }
  
  // Agregar la tecla al string de búsqueda
  directorySearchString += key;
  lastKeyPressTime = now;
  
  // Establecer timeout para limpiar el string de búsqueda
  directorySearchTimeout = window.setTimeout(() => {
    directorySearchString = '';
    currentFocusIndex = -1;
  }, 800);
  
  // Detectar si es spam de una sola letra (ej: "nnn")
  const isRepeatedChar = directorySearchString.length > 1 && 
                         directorySearchString.split('').every(c => c === directorySearchString[0]);
  
  // Si es spam de letra, buscar con solo la primera letra
  const actualSearchString = isRepeatedChar ? directorySearchString[0] : directorySearchString;
  
  // Si es spam de letra y hay un índice previo, buscar el siguiente
  let searchFromIndex = 0;
  if (isRepeatedChar && currentFocusIndex !== -1) {
    searchFromIndex = currentFocusIndex + 1;
  }
  
  lastPressedKey = directorySearchString;
  
  // Obtener todos los directorios (primero destinos, luego subdirectorios)
  const destItems = Array.from(destinationDirectoriesList.querySelectorAll('.destination-item'));
  const subdirItems = Array.from(subdirectoriesList.querySelectorAll('.subdirectory-item'));
  const allDirectories = [...destItems, ...subdirItems];
  
  if (allDirectories.length === 0) return;
  
  // Buscar directorio que empiece con el string de búsqueda
  let foundIndex = -1;
  for (let i = searchFromIndex; i < allDirectories.length; i++) {
    const dirName = (allDirectories[i].querySelector('.subdirectory-name') as HTMLElement)?.textContent || '';
    if (dirName.toUpperCase().startsWith(actualSearchString)) {
      foundIndex = i;
      break;
    }
  }
  
  // Si no se encontró desde searchFromIndex, buscar desde el principio
  if (foundIndex === -1 && searchFromIndex > 0) {
    for (let i = 0; i < searchFromIndex; i++) {
      const dirName = (allDirectories[i].querySelector('.subdirectory-name') as HTMLElement)?.textContent || '';
      if (dirName.toUpperCase().startsWith(actualSearchString)) {
        foundIndex = i;
        break;
      }
    }
  }
  
  if (foundIndex !== -1) {
    currentFocusIndex = foundIndex;
    const targetElement = allDirectories[foundIndex] as HTMLElement;
    
    // Scroll instantáneo al elemento (adaptado para modo horizontal/vertical)
    const isHorizontal = window.innerWidth <= 1200;
    if (isHorizontal) {
      targetElement.scrollIntoView({ behavior: 'auto', inline: 'center' });
    } else {
      targetElement.scrollIntoView({ behavior: 'auto', block: 'center' });
    }
    
    // Efecto de parpadeo
    targetElement.style.animation = 'directoryBlink 0.6s ease-in-out';
    
    // Remover animación después de que termine
    setTimeout(() => {
      targetElement.style.animation = '';
    }, 600);
  }
}
if (sidebar) {
  sidebar.addEventListener('scroll', () => {
    updateSidebarScrollButtons();
  });
  
  // Inicializar estado de botones
  updateSidebarScrollButtons();
}

// ===== FUNCIÓN PARA HACER FOCUS EN DIRECTORIO POR NOMBRE =====

function focusDirectoryByName(folderName: string) {
  const destItems = Array.from(destinationDirectoriesList.querySelectorAll('.destination-item'));
  const subdirItems = Array.from(subdirectoriesList.querySelectorAll('.subdirectory-item'));
  const allDirectories = [...destItems, ...subdirItems];
  
  for (const dir of allDirectories) {
    const dirNameElement = dir.querySelector('.subdirectory-name') as HTMLElement;
    if (dirNameElement?.textContent === folderName) {
      const targetElement = dir as HTMLElement;
      const isHorizontal = window.innerWidth <= 1200;
      if (isHorizontal) {
        targetElement.scrollIntoView({ behavior: 'auto', inline: 'center' });
      } else {
        targetElement.scrollIntoView({ behavior: 'auto', block: 'center' });
      }
      targetElement.style.animation = 'directoryBlink 0.6s ease-in-out';
      setTimeout(() => {
        targetElement.style.animation = '';
      }, 600);
      break;
    }
  }
}

// ===== MODAL DE CONFLICTOS DE ARCHIVOS =====

const conflictModal = document.getElementById('conflict-modal') as HTMLElement;
const conflictFilename = document.getElementById('conflict-filename') as HTMLElement;
const conflictSourceImage = document.getElementById('conflict-source-image') as HTMLImageElement;
const conflictDestImage = document.getElementById('conflict-dest-image') as HTMLImageElement;
const sourceSize = document.getElementById('source-size') as HTMLElement;
const sourceDate = document.getElementById('source-date') as HTMLElement;
const sourceDimensions = document.getElementById('source-dimensions') as HTMLElement;
const destSize = document.getElementById('dest-size') as HTMLElement;
const destDate = document.getElementById('dest-date') as HTMLElement;
const destDimensions = document.getElementById('dest-dimensions') as HTMLElement;
const keepBothBtn = document.getElementById('keep-both-btn') as HTMLButtonElement;

let currentConflict: {
  sourcePath: string;
  targetDirectory: string;
  targetPath: string;
} | null = null;

async function handleFileConflict(sourcePath: string, targetDirectory: string, targetPath: string) {
  currentConflict = { sourcePath, targetDirectory, targetPath };
  
  quickNavigationEnabled = false;
  
  const fileName = sourcePath.split('\\').pop() || sourcePath.split('/').pop() || '';
  conflictFilename.textContent = fileName;
  
  // Cargar imágenes
  const sourceUrl = `file:///${sourcePath.replace(/\\/g, '/')}`;
  const destUrl = `file:///${targetPath.replace(/\\/g, '/')}`;
  conflictSourceImage.src = sourceUrl;
  conflictDestImage.src = destUrl;
  
  // Obtener metadatos
  const [sourceMeta, destMeta] = await Promise.all([
    window.electronAPI.getSingleImageMetadata(sourcePath),
    window.electronAPI.getSingleImageMetadata(targetPath)
  ]);
  
  if (sourceMeta && destMeta) {
    // Comparar tamaños
    const sourceBytes = sourceMeta.size;
    const destBytes = destMeta.size;
    const sizeDiff = Math.abs(sourceBytes - destBytes);
    
    sourceSize.innerHTML = formatFileSize(sourceBytes);
    destSize.innerHTML = formatFileSize(destBytes);
    
    if (sizeDiff > 1024) { // Diferencia mayor a 1KB
      if (sourceBytes < destBytes) {
        sourceSize.innerHTML += ' <span class="detail-comparison better">(Más ligero)</span>';
        destSize.innerHTML += ' <span class="detail-comparison worse">(Más pesado)</span>';
      } else {
        sourceSize.innerHTML += ' <span class="detail-comparison worse">(Más pesado)</span>';
        destSize.innerHTML += ' <span class="detail-comparison better">(Más ligero)</span>';
      }
    }
    
    // Comparar fechas
    const sourceTime = sourceMeta.modified || sourceMeta.modifiedTime;
    const destTime = destMeta.modified || destMeta.modifiedTime;
    
    sourceDate.innerHTML = new Date(sourceTime).toLocaleString('es-ES');
    destDate.innerHTML = new Date(destTime).toLocaleString('es-ES');
    
    if (sourceTime !== destTime) {
      if (sourceTime > destTime) {
        sourceDate.innerHTML += ' <span class="detail-comparison better">(Más reciente)</span>';
        destDate.innerHTML += ' <span class="detail-comparison worse">(Más antiguo)</span>';
      } else {
        sourceDate.innerHTML += ' <span class="detail-comparison worse">(Más antiguo)</span>';
        destDate.innerHTML += ' <span class="detail-comparison better">(Más reciente)</span>';
      }
    }
    
    // Comparar dimensiones
    const sourcePixels = (sourceMeta.width || 0) * (sourceMeta.height || 0);
    const destPixels = (destMeta.width || 0) * (destMeta.height || 0);
    
    sourceDimensions.innerHTML = `${sourceMeta.width || 0} × ${sourceMeta.height || 0}`;
    destDimensions.innerHTML = `${destMeta.width || 0} × ${destMeta.height || 0}`;
    
    const pixelDiff = Math.abs(sourcePixels - destPixels);
    if (pixelDiff > 10000) { // Diferencia significativa
      if (sourcePixels > destPixels) {
        sourceDimensions.innerHTML += ' <span class="detail-comparison better">(Más grande)</span>';
        destDimensions.innerHTML += ' <span class="detail-comparison worse">(Más pequeño)</span>';
      } else {
        sourceDimensions.innerHTML += ' <span class="detail-comparison worse">(Más pequeño)</span>';
        destDimensions.innerHTML += ' <span class="detail-comparison better">(Más grande)</span>';
      }
    }
  }
  
  conflictModal.style.display = 'flex';
}

function closeConflictModal() {
  conflictModal.style.display = 'none';
  quickNavigationEnabled = true;
  currentConflict = null;
  
  // Limpiar selección
  document.querySelectorAll('.conflict-image-container').forEach(el => {
    el.classList.remove('selected');
  });
}

function resolveConflictAndContinue(sourcePath: string) {
  // Si estamos procesando conflictos de SM, eliminar de la cola y miniatura
  if (isProcessingConflicts && pendingConflicts.length > 0) {
    // Eliminar el conflicto actual de la cola
    pendingConflicts.shift();
    
    // Eliminar de arrays
    const imgIndex = currentImages.indexOf(sourcePath);
    if (imgIndex > -1) {
      currentImages.splice(imgIndex, 1);
      
      // Ajustar currentImageIndex si la imagen eliminada estaba antes
      if (imgIndex < currentImageIndex) {
        currentImageIndex--;
      }
      
      // Eliminar miniatura del carrusel
      const thumbnails = carouselTrack.querySelectorAll('.carousel-item');
      if (thumbnails[imgIndex]) {
        thumbnails[imgIndex].remove();
      }
    }
    
    // Eliminar del cache
    thumbnailCache.delete(sourcePath);
    
    // Procesar siguiente conflicto
    processNextConflict();
  } else {
    // Comportamiento normal (no SM)
    removeCurrentImageFromList();
  }
}

// Click en las imágenes para seleccionar
if (conflictSourceImage && conflictDestImage) {
  conflictSourceImage.parentElement?.addEventListener('click', async () => {
    if (!currentConflict) return;
    
    try {
      // Usuario elige mantener la imagen origen, eliminar la del destino
      // Eliminar archivo destino
      const deleteSuccess = await window.electronAPI.deleteFile(currentConflict.targetPath);
      
      if (!deleteSuccess) {
        alert('Error al eliminar el archivo en destino');
        return;
      }
      
      // Mover archivo origen
      const result = await window.electronAPI.moveFile(
        currentConflict.sourcePath,
        currentConflict.targetDirectory
      );
      
      if (result.success) {
        console.log('[Renderer] Archivo reemplazado exitosamente');
        const sourcePath = currentConflict.sourcePath;
        closeConflictModal();
        resolveConflictAndContinue(sourcePath);
      } else {
        alert('Error al mover el archivo');
      }
    } catch (error) {
      console.error('[Renderer] Error al reemplazar:', error);
      alert('Error al reemplazar el archivo');
    }
  });
  
  conflictDestImage.parentElement?.addEventListener('click', async () => {
    if (!currentConflict) return;
    
    try {
      // Usuario elige mantener la imagen destino, eliminar la origen
      const deleteSuccess = await window.electronAPI.deleteFile(currentConflict.sourcePath);
      
      if (deleteSuccess) {
        console.log('[Renderer] Archivo origen eliminado');
        const sourcePath = currentConflict.sourcePath;
        closeConflictModal();
        resolveConflictAndContinue(sourcePath);
      } else {
        alert('Error al eliminar el archivo');
      }
    } catch (error) {
      console.error('[Renderer] Error al eliminar origen:', error);
      alert('Error al eliminar el archivo');
    }
  });
}

// Botón mantener ambos
if (keepBothBtn) {
  keepBothBtn.addEventListener('click', async () => {
    if (!currentConflict) return;
    
    try {
      // Generar nuevo nombre con fecha
      const now = new Date();
      const dateStr = `${String(now.getDate()).padStart(2, '0')}_${String(now.getMonth() + 1).padStart(2, '0')}_${now.getFullYear()}`;
      
      const sourcePath = currentConflict.sourcePath;
      const fileName = sourcePath.split('\\').pop() || sourcePath.split('/').pop() || '';
      const lastDot = fileName.lastIndexOf('.');
      const baseName = lastDot > 0 ? fileName.substring(0, lastDot) : fileName;
      const extension = lastDot > 0 ? fileName.substring(lastDot) : '';
      
      const newFileName = `${baseName}_${dateStr}${extension}`;
      
      const result = await window.electronAPI.moveFile(
        currentConflict.sourcePath,
        currentConflict.targetDirectory,
        newFileName
      );
      
      if (result.success) {
        console.log('[Renderer] Ambos archivos conservados');
        const sourcePathCopy = currentConflict.sourcePath;
        closeConflictModal();
        resolveConflictAndContinue(sourcePathCopy);
      } else {
        alert('Error al mover el archivo con nuevo nombre');
      }
    } catch (error) {
      console.error('[Renderer] Error al mantener ambos:', error);
      alert('Error al procesar la operación');
    }
  });
}

// Cerrar modal con click fuera
if (conflictModal) {
  conflictModal.addEventListener('click', (e) => {
    if (e.target === conflictModal) {
      closeConflictModal();
    }
  });
  
  // Inicializar estado de botones
  updateSidebarScrollButtons();
}
// ============================================
// FUNCIONES DE SELECCIÓN MÚLTIPLE (SM)
// ============================================

function toggleMultiSelectMode() {
  if (isMultiSelectMode) {
    exitMultiSelectMode();
  } else {
    enterMultiSelectMode();
  }
}

function enterMultiSelectMode() {
  if (currentImages.length === 0) return;
  
  isMultiSelectMode = true;
  selectedImages = [];
  
  // Agregar imagen actual como primera seleccionada
  selectedImages.push(currentImages[currentImageIndex]);
  
  // Actualizar UI
  multiSelectBtn.classList.add('active');
  imageView.classList.add('multi-select-active');
  mainImageContainer.style.display = 'none';
  multiSelectThumbnails.style.display = 'flex';
  fileNameDisplay.style.display = 'none';
  
  // Deshabilitar controles
  disableControlsForMultiSelect();
  
  // Renderizar miniaturas seleccionadas
  renderMultiSelectThumbnails();
  
  // Actualizar estilos de miniaturas en carrusel
  updateCarouselSelectedItems();
  
  console.log('[SM] Modo selección múltiple activado');
}

function exitMultiSelectMode() {
  isMultiSelectMode = false;
  selectedImages = [];
  justEnteredMultiSelect = false; // Resetear flag
  
  // Actualizar UI
  multiSelectBtn.classList.remove('active');
  imageView.classList.remove('multi-select-active');
  mainImageContainer.style.display = 'flex';
  multiSelectThumbnails.style.display = 'none';
  multiSelectThumbnails.innerHTML = '';
  fileNameDisplay.style.display = 'block';
  
  // Rehabilitar controles
  enableControlsAfterMultiSelect();
  
  // Mostrar imagen actual del carrusel
  if (currentImages.length > 0) {
    showImage(currentImages[currentImageIndex]);
  }
  
  // Actualizar estilos de miniaturas en carrusel
  updateCarouselSelectedItems();
  
  console.log('[SM] Modo selección múltiple desactivado');
}

function renderMultiSelectThumbnails() {
  multiSelectThumbnails.innerHTML = '';
  
  for (const imagePath of selectedImages) {
    const item = document.createElement('div');
    item.className = 'multi-select-thumbnail-item';
    item.dataset.imagePath = imagePath;
    
    // Contenedor de imagen
    const imageContainer = document.createElement('div');
    imageContainer.className = 'thumbnail-image';
    
    // Crear imagen
    const img = document.createElement('img');
    const thumbPath = thumbnailCache.get(imagePath);
    if (thumbPath) {
      img.src = `file:///${thumbPath.replace(/\\/g, '/')}`;
    } else {
      img.src = `file:///${imagePath.replace(/\\/g, '/')}`;
    }
    img.alt = 'Selected';
    
    imageContainer.appendChild(img);
    item.appendChild(imageContainer);
    
    // Nombre de archivo
    const fileName = imagePath.split('\\').pop() || imagePath.split('/').pop() || '';
    const nameElement = document.createElement('div');
    nameElement.className = 'thumbnail-name';
    nameElement.textContent = fileName;
    nameElement.title = fileName; // Tooltip con nombre completo
    
    item.appendChild(nameElement);
    multiSelectThumbnails.appendChild(item);
    
    // Habilitar drag desde miniaturas del viewer
    item.draggable = true;
    item.addEventListener('dragstart', handleMultiSelectDragStart);
  }
}

function updateCarouselSelectedItems() {
  const items = carouselTrack.querySelectorAll('.carousel-item');
  items.forEach((item, index) => {
    const imagePath = currentImages[index];
    if (selectedImages.includes(imagePath)) {
      item.classList.add('selected');
    } else {
      item.classList.remove('selected');
    }
  });
}

function toggleImageSelection(imagePath: string) {
  const index = selectedImages.indexOf(imagePath);
  
  if (index > -1) {
    // Ya está seleccionada, eliminarla
    selectedImages.splice(index, 1);
  } else {
    // No está seleccionada, agregarla
    selectedImages.push(imagePath);
  }
  
  // Actualizar UI
  renderMultiSelectThumbnails();
  updateCarouselSelectedItems();
  
  // Si no quedan imágenes seleccionadas, salir de SM
  if (selectedImages.length === 0) {
    exitMultiSelectMode();
  }
}

function handleMultiSelectDragStart(e: DragEvent) {
  if (!isMultiSelectMode) return;
  
  // Preparar datos para el drag
  e.dataTransfer!.effectAllowed = 'move';
  e.dataTransfer!.setData('text/plain', 'multiselect');
  
  console.log(`[SM] Iniciando arrastre de ${selectedImages.length} imágenes`);
}

async function moveSelectedImages(targetDirectory: string) {
  if (!isMultiSelectMode || selectedImages.length === 0) return;
  
  console.log(`[SM] Moviendo ${selectedImages.length} imágenes a ${targetDirectory}`);
  
  const imagesToMove = [...selectedImages];
  let movedCount = 0;
  
  // Limpiar cola de conflictos pendientes
  pendingConflicts = [];
  
  // Guardar el índice actual antes de mover
  const originalIndex = currentImageIndex;
  const originalLength = currentImages.length;
  
  // Verificar si alguna imagen movida está después o igual al índice actual
  let hasImagesAfterCurrent = false;
  for (const imagePath of imagesToMove) {
    const imgIndex = currentImages.indexOf(imagePath);
    if (imgIndex >= originalIndex) {
      hasImagesAfterCurrent = true;
      break;
    }
  }
  
  for (const imagePath of imagesToMove) {
    try {
      const result = await window.electronAPI.moveFile(imagePath, targetDirectory);
      
      if (result.success) {
        // Imagen movida exitosamente
        movedCount++;
        
        // Eliminar de arrays
        const imgIndex = currentImages.indexOf(imagePath);
        if (imgIndex > -1) {
          currentImages.splice(imgIndex, 1);
          
          // Ajustar currentImageIndex si la imagen eliminada estaba antes
          if (imgIndex < currentImageIndex) {
            currentImageIndex--;
          }
          
          // Eliminar miniatura del carrusel
          const thumbnails = carouselTrack.querySelectorAll('.carousel-item');
          if (thumbnails[imgIndex]) {
            thumbnails[imgIndex].remove();
          }
        }
        
        // Eliminar de selección
        const selIndex = selectedImages.indexOf(imagePath);
        if (selIndex > -1) {
          selectedImages.splice(selIndex, 1);
        }
        
        // Eliminar del cache
        thumbnailCache.delete(imagePath);
        
      } else if (result.exists && result.targetPath) {
        // Conflicto detectado - agregar a la cola de pendientes
        console.log('[SM] Conflicto detectado, agregando a cola:', imagePath);
        pendingConflicts.push({
          sourcePath: imagePath,
          targetDirectory: targetDirectory,
          targetPath: result.targetPath
        });
      }
    } catch (error) {
      console.error('[SM] Error al mover imagen:', imagePath, error);
    }
  }
  
  console.log(`[SM] Movidas ${movedCount} de ${imagesToMove.length} imágenes`);
  console.log(`[SM] Conflictos pendientes: ${pendingConflicts.length}`);
  
  // Salir de SM
  exitMultiSelectMode();
  
  // Actualizar vista
  if (currentImages.length === 0) {
    emptyState.style.display = 'flex';
    imageView.style.display = 'none';
  } else {
    // Ajustar índice: si movimos imágenes que estaban al final y eran >= al índice actual,
    // ir a la imagen anterior en lugar de la siguiente
    if (currentImageIndex >= currentImages.length) {
      currentImageIndex = currentImages.length - 1;
    }
    
    // Mostrar imagen correspondiente (solo si no hay conflictos pendientes)
    if (pendingConflicts.length === 0) {
      showImage(currentImages[currentImageIndex]);
    }
    updateCarouselIndices();
    generateVisibleThumbnails();
    updateNavigationButtons();
  }
  
  // Procesar conflictos pendientes uno por uno
  if (pendingConflicts.length > 0) {
    console.log(`[SM] Iniciando procesamiento de ${pendingConflicts.length} conflictos`);
    processNextConflict();
  }
}

function processNextConflict() {
  if (pendingConflicts.length === 0) {
    console.log('[SM] Todos los conflictos resueltos');
    isProcessingConflicts = false;
    
    // Mostrar la imagen actual después de resolver todos los conflictos
    if (currentImages.length > 0) {
      // Ajustar índice si es necesario
      if (currentImageIndex >= currentImages.length) {
        currentImageIndex = currentImages.length - 1;
      }
      showImage(currentImages[currentImageIndex]);
      updateCarouselIndices();
      generateVisibleThumbnails();
      updateNavigationButtons();
    }
    return;
  }
  
  isProcessingConflicts = true;
  const conflict = pendingConflicts[0]; // Obtener el primero sin eliminarlo aún
  console.log(`[SM] Procesando conflicto ${pendingConflicts.length} restantes`);
  
  // Abrir modal de conflicto
  handleFileConflict(conflict.sourcePath, conflict.targetDirectory, conflict.targetPath);
}

function disableControlsForMultiSelect() {
  // Deshabilitar botones de zoom
  if (zoomInBtn) zoomInBtn.disabled = true;
  if (zoomOutBtn) zoomOutBtn.disabled = true;
  if (zoomResetBtn) zoomResetBtn.disabled = true;
  if (fitToWindowBtn) fitToWindowBtn.disabled = true;
  
  // Deshabilitar REPO
  if (toggleDragModeBtn) toggleDragModeBtn.disabled = true;
  
  // Deshabilitar filtro
  if (filterBtn) filterBtn.disabled = true;
  
  console.log('[SM] Controles deshabilitados');
}

function enableControlsAfterMultiSelect() {
  // Rehabilitar botones de zoom
  if (zoomInBtn) zoomInBtn.disabled = false;
  if (zoomOutBtn) zoomOutBtn.disabled = false;
  if (zoomResetBtn) zoomResetBtn.disabled = false;
  if (fitToWindowBtn) fitToWindowBtn.disabled = false;
  
  // Rehabilitar REPO
  if (toggleDragModeBtn) toggleDragModeBtn.disabled = false;
  
  // Rehabilitar filtro
  if (filterBtn) filterBtn.disabled = false;
  
  console.log('[SM] Controles rehabilitados');
}

// ============================================
// FUNCIONES DE ESCANEO DE DUPLICADOS (ED)
// ============================================

/**
 * Inicia el modo de escaneo de duplicados
 */
async function startDuplicateScan() {
  if (!currentDirectory) {
    console.warn('[ED] No hay directorio seleccionado');
    return;
  }

  console.log('[ED] Iniciando escaneo de duplicados en:', currentDirectory);
  
  // Activar modo ED
  isDuplicateScanMode = true;
  duplicateScanCancelled = false;
  duplicateComparisons = [];
  currentDuplicateIndex = 0;
  calculatedHashes = [];
  
  // UI: Activar botón y deshabilitar controles
  if (duplicateScanBtn) duplicateScanBtn.classList.add('active');
  disableControlsDuringDuplicateScan();
  
  // Mostrar loading (NO ocultar viewer para que se vea el overlay)
  showLoading('Calculando hashes...');
  
  try {
    // Fase 1: Calcular hashes de todas las imágenes
    console.log('[ED] Fase 1: Calculando hashes...');
    calculatedHashes = await window.electronAPI.calculateHashes(
      currentDirectory,
      (progress) => {
        if (duplicateScanCancelled) return;
        const message = `Calculando hashes: ${progress.current} de ${progress.total}`;
        updateLoadingText(message);
      }
    );
    
    if (duplicateScanCancelled) {
      console.log('[ED] Escaneo cancelado durante cálculo de hashes');
      await finishDuplicateScan(true);
      return;
    }
    
    console.log('[ED] Hashes calculados:', calculatedHashes.length);
    
    // Fase 2: Buscar duplicados
    console.log('[ED] Fase 2: Buscando duplicados...');
    updateLoadingText('Buscando duplicados...');
    
    const foundGroups = await window.electronAPI.findDuplicates(
      calculatedHashes,
      (progress) => {
        if (duplicateScanCancelled) return;
        const message = `Buscando duplicados: ${progress.percentage}%`;
        updateLoadingText(message);
      }
    );
    
    if (duplicateScanCancelled) {
      console.log('[ED] Escaneo cancelado durante búsqueda de duplicados');
      await finishDuplicateScan(true);
      return;
    }
    
    // Guardar grupos y generar cola de comparaciones
    duplicateGroups = foundGroups;
    console.log('[ED] Grupos de duplicados encontrados:', duplicateGroups.length);
    
    duplicateComparisons = generateComparisonQueue(duplicateGroups);
    
    hideLoading();
    
    if (duplicateComparisons.length === 0) {
      alert('No se encontraron imágenes duplicadas.');
      await finishDuplicateScan(false);
      return;
    }
    
    console.log('[ED] Total de comparaciones a realizar:', duplicateComparisons.length);
    currentDuplicateIndex = 0;
    
    // Mostrar primera comparación
    await showNextDuplicate();
    
  } catch (error) {
    console.error('[ED] Error durante escaneo de duplicados:', error);
    hideLoading();
    alert('Error durante el escaneo de duplicados: ' + error);
    await finishDuplicateScan(true);
  }
}

/**
 * Genera la cola de comparaciones desde los grupos de duplicados
 */
function generateComparisonQueue(duplicateGroups: Array<{hash: string, images: string[], distance: number}>): Array<{leftImage: string, rightImage: string, groupIndex: number}> {
  const queue: Array<{leftImage: string, rightImage: string, groupIndex: number}> = [];
  
  duplicateGroups.forEach((group, groupIndex) => {
    if (group.images.length < 2) return;
    
    // Para un grupo de N imágenes, necesitamos N-1 comparaciones
    // Todas las comparaciones se agregan desde el inicio para el contador correcto
    // Ejemplo: A, B, C = 2 comparaciones (A vs B, luego ganador vs C)
    for (let i = 1; i < group.images.length; i++) {
      queue.push({
        leftImage: group.images[0], // Siempre usar la primera como referencia inicial
        rightImage: group.images[i],
        groupIndex: groupIndex
      });
    }
  });
  
  return queue;
}

/**
 * Marca una imagen como eliminada en su grupo
 */
function markImageAsDeleted(imagePath: string, groupIndex: number) {
  const group = duplicateGroups[groupIndex];
  if (!group) return;
  
  const index = group.images.indexOf(imagePath);
  if (index !== -1) {
    group.images[index] = ''; // Marcar como eliminada
    console.log('[ED] Imagen marcada como eliminada:', imagePath);
  }
}

/**
 * Actualiza todas las comparaciones futuras de un grupo para usar el ganador
 */
function updateFutureComparisons(groupIndex: number, winnerImage: string) {
  // Actualizar todas las comparaciones futuras de este grupo
  for (let i = currentDuplicateIndex + 1; i < duplicateComparisons.length; i++) {
    const comp = duplicateComparisons[i];
    if (comp.groupIndex === groupIndex) {
      // Si la imagen izquierda está marcada como eliminada, usar el ganador
      if (comp.leftImage !== winnerImage && isImageDeleted(comp.leftImage, groupIndex)) {
        comp.leftImage = winnerImage;
        console.log('[ED] Comparación', i, 'actualizada. Nueva izquierda:', winnerImage);
      }
    }
  }
}

/**
 * Verifica si una imagen está marcada como eliminada
 */
function isImageDeleted(imagePath: string, groupIndex: number): boolean {
  const group = duplicateGroups[groupIndex];
  if (!group) return false;
  
  const index = group.images.indexOf(imagePath);
  return index === -1 || group.images[index] === '';
}

/**
 * Salta comparaciones futuras que involucren ambas imágenes conservadas
 */
function skipFutureComparisonsWithBoth(groupIndex: number, image1: string, image2: string) {
  console.log('[ED] Saltando comparaciones futuras entre', image1, 'y', image2);
  
  // Marcar las comparaciones futuras de este grupo que involucren estas dos imágenes
  // como "saltar" cambiando las imágenes a vacías
  for (let i = currentDuplicateIndex + 1; i < duplicateComparisons.length; i++) {
    const comp = duplicateComparisons[i];
    if (comp.groupIndex === groupIndex) {
      // Si esta comparación involucra alguna de las dos imágenes conservadas
      const involvesImage1 = comp.leftImage === image1 || comp.rightImage === image1;
      const involvesImage2 = comp.leftImage === image2 || comp.rightImage === image2;
      
      if (involvesImage1 && involvesImage2) {
        // Esta comparación es entre las dos imágenes conservadas, saltarla
        comp.leftImage = '';
        comp.rightImage = '';
        console.log('[ED] Comparación', i, 'marcada para saltar');
      }
    }
  }
}

/**
 * Muestra la siguiente comparación de duplicados
 */
async function showNextDuplicate() {
  // Saltar comparaciones marcadas como vacías (ya evaluadas)
  while (currentDuplicateIndex < duplicateComparisons.length) {
    const comp = duplicateComparisons[currentDuplicateIndex];
    if (comp.leftImage === '' || comp.rightImage === '') {
      console.log('[ED] Saltando comparación', currentDuplicateIndex, '(ya evaluada)');
      currentDuplicateIndex++;
    } else {
      break;
    }
  }
  
  if (currentDuplicateIndex >= duplicateComparisons.length) {
    // Terminamos todas las comparaciones
    console.log('[ED] Todas las comparaciones completadas');
    await finishDuplicateScan(false);
    return;
  }
  
  const comparison = duplicateComparisons[currentDuplicateIndex];
  console.log('[ED] Mostrando comparación', currentDuplicateIndex + 1, 'de', duplicateComparisons.length);
  
  // Actualizar contador
  if (duplicateCounter) {
    duplicateCounter.textContent = `Conflicto ${currentDuplicateIndex + 1} de ${duplicateComparisons.length}`;
  }
  
  // Cargar imágenes
  if (duplicateScanLeftImg) {
    const leftPath = comparison.leftImage.replace(/\\/g, '/');
    duplicateScanLeftImg.src = `file:///${leftPath}`;
    console.log('[ED] Cargando imagen izquierda:', duplicateScanLeftImg.src);
  }
  if (duplicateScanRightImg) {
    const rightPath = comparison.rightImage.replace(/\\/g, '/');
    duplicateScanRightImg.src = `file:///${rightPath}`;
    console.log('[ED] Cargando imagen derecha:', duplicateScanRightImg.src);
  }
  
  // Mostrar rutas completas
  if (duplicateScanLeftPath) {
    duplicateScanLeftPath.textContent = comparison.leftImage;
  }
  if (duplicateScanRightPath) {
    duplicateScanRightPath.textContent = comparison.rightImage;
  }
  
  // Cargar metadatos
  try {
    const [leftMeta, rightMeta] = await Promise.all([
      window.electronAPI.getSingleImageMetadata(comparison.leftImage),
      window.electronAPI.getSingleImageMetadata(comparison.rightImage)
    ]);
    
    console.log('[ED] Metadatos cargados:', { leftMeta, rightMeta });
    
    if (leftMeta && rightMeta) {
      // Izquierda - Tamaño
      const leftSizeEl = document.getElementById('duplicate-left-size');
      const rightSizeEl = document.getElementById('duplicate-right-size');
      
      if (leftSizeEl && rightSizeEl) {
        const sizeDiff = Math.abs(leftMeta.size - rightMeta.size);
        leftSizeEl.innerHTML = formatFileSize(leftMeta.size);
        rightSizeEl.innerHTML = formatFileSize(rightMeta.size);
        
        if (sizeDiff > 1024) {
          if (leftMeta.size < rightMeta.size) {
            leftSizeEl.innerHTML += ' <span class="detail-comparison better">(Más ligero)</span>';
            rightSizeEl.innerHTML += ' <span class="detail-comparison worse">(Más pesado)</span>';
          } else {
            leftSizeEl.innerHTML += ' <span class="detail-comparison worse">(Más pesado)</span>';
            rightSizeEl.innerHTML += ' <span class="detail-comparison better">(Más ligero)</span>';
          }
        }
      }
      
      // Fecha
      const leftDateEl = document.getElementById('duplicate-left-date');
      const rightDateEl = document.getElementById('duplicate-right-date');
      
      if (leftDateEl && rightDateEl) {
        const leftTime = leftMeta.modified || leftMeta.modifiedTime;
        const rightTime = rightMeta.modified || rightMeta.modifiedTime;
        
        leftDateEl.innerHTML = new Date(leftTime).toLocaleString('es-ES');
        rightDateEl.innerHTML = new Date(rightTime).toLocaleString('es-ES');
        
        if (leftTime !== rightTime) {
          if (leftTime > rightTime) {
            leftDateEl.innerHTML += ' <span class="detail-comparison better">(Más reciente)</span>';
            rightDateEl.innerHTML += ' <span class="detail-comparison worse">(Más antiguo)</span>';
          } else {
            leftDateEl.innerHTML += ' <span class="detail-comparison worse">(Más antiguo)</span>';
            rightDateEl.innerHTML += ' <span class="detail-comparison better">(Más reciente)</span>';
          }
        }
      }
      
      // Dimensiones
      const leftDimEl = document.getElementById('duplicate-left-dimensions');
      const rightDimEl = document.getElementById('duplicate-right-dimensions');
      
      if (leftDimEl && rightDimEl) {
        const leftPixels = (leftMeta.width || 0) * (leftMeta.height || 0);
        const rightPixels = (rightMeta.width || 0) * (rightMeta.height || 0);
        
        leftDimEl.innerHTML = `${leftMeta.width || 0} × ${leftMeta.height || 0}`;
        rightDimEl.innerHTML = `${rightMeta.width || 0} × ${rightMeta.height || 0}`;
        
        const pixelDiff = Math.abs(leftPixels - rightPixels);
        if (pixelDiff > 10000) {
          if (leftPixels > rightPixels) {
            leftDimEl.innerHTML += ' <span class="detail-comparison better">(Más grande)</span>';
            rightDimEl.innerHTML += ' <span class="detail-comparison worse">(Más pequeño)</span>';
          } else {
            leftDimEl.innerHTML += ' <span class="detail-comparison worse">(Más pequeño)</span>';
            rightDimEl.innerHTML += ' <span class="detail-comparison better">(Más grande)</span>';
          }
        }
      }
    }
  } catch (error) {
    console.error('[ED] Error cargando metadatos:', error);
  }
  
  // Mostrar modal
  if (duplicateScanModal) {
    duplicateScanModal.style.display = 'flex';
  }
}

/**
 * Maneja el click en la imagen izquierda (eliminar derecha)
 */
async function handleLeftImageClick() {
  const comparison = duplicateComparisons[currentDuplicateIndex];
  console.log('[ED] Eliminar imagen derecha:', comparison.rightImage);
  
  try {
    await window.electronAPI.moveToTrash(comparison.rightImage);
    console.log('[ED] Imagen derecha eliminada');
    
    // Marcar como eliminada en el grupo
    markImageAsDeleted(comparison.rightImage, comparison.groupIndex);
    
    // La imagen izquierda es el ganador
    // Actualizar todas las comparaciones futuras de este grupo
    updateFutureComparisons(comparison.groupIndex, comparison.leftImage);
    
    // Pasar a la siguiente comparación
    currentDuplicateIndex++;
    await showNextDuplicate();
    
  } catch (error) {
    console.error('[ED] Error eliminando imagen derecha:', error);
    alert('Error al eliminar la imagen: ' + error);
  }
}

/**
 * Maneja el click en la imagen derecha (eliminar izquierda)
 */
async function handleRightImageClick() {
  const comparison = duplicateComparisons[currentDuplicateIndex];
  console.log('[ED] Eliminar imagen izquierda:', comparison.leftImage);
  
  try {
    await window.electronAPI.moveToTrash(comparison.leftImage);
    console.log('[ED] Imagen izquierda eliminada');
    
    // Marcar como eliminada en el grupo
    markImageAsDeleted(comparison.leftImage, comparison.groupIndex);
    
    // La imagen derecha es el ganador
    // Actualizar todas las comparaciones futuras de este grupo
    updateFutureComparisons(comparison.groupIndex, comparison.rightImage);
    
    // Pasar a la siguiente comparación
    currentDuplicateIndex++;
    await showNextDuplicate();
    
  } catch (error) {
    console.error('[ED] Error eliminando imagen izquierda:', error);
    alert('Error al eliminar la imagen: ' + error);
  }
}

/**
 * Maneja el botón "Conservar ambas"
 */
async function handleKeepBoth() {
  const comparison = duplicateComparisons[currentDuplicateIndex];
  console.log('[ED] Conservar ambas imágenes');
  
  // Mantener ambas: marcar ambas como evaluadas para este grupo
  // Saltar todas las comparaciones futuras que involucren estas dos imágenes
  skipFutureComparisonsWithBoth(comparison.groupIndex, comparison.leftImage, comparison.rightImage);
  
  // Pasar a la siguiente comparación sin eliminar nada
  currentDuplicateIndex++;
  await showNextDuplicate();
}

/**
 * Maneja el botón "Cancelar escaneo"
 */
async function handleCancelScan() {
  console.log('[ED] Botón Cancelar presionado');
  
  // Ir directamente al modal de caché sin confirmación
  console.log('[ED] Mostrando modal de caché...');
  duplicateScanCancelled = true;
  
  // Ocultar modal de comparación
  if (duplicateScanModal) {
    duplicateScanModal.style.display = 'none';
  }
  
  // Mostrar modal de caché
  await finishDuplicateScan(false);
}

/**
 * Finaliza el escaneo de duplicados y pregunta por caché
 */
async function finishDuplicateScan(cancelled: boolean) {
  console.log('[ED] Finalizando escaneo. Cancelado:', cancelled);
  
  // Ocultar modal de comparación si está visible
  if (duplicateScanModal) {
    duplicateScanModal.style.display = 'none';
  }
  
  // Preguntar por caché solo si se calcularon hashes y NO fue cancelado
  if (!cancelled && calculatedHashes.length > 0 && currentDirectory) {
    try {
      // Calcular tamaño ANTES de mostrar el modal
      console.log('[ED] Calculando tamaño de caché...');
      const cacheSizeBytes = JSON.stringify(calculatedHashes).length;
      const cacheSizeKB = Math.round(cacheSizeBytes / 1024);
      
      console.log('[ED] Tamaño de caché calculado:', cacheSizeKB, 'KB');
      
      if (cacheConfirmText) {
        cacheConfirmText.textContent = `¿Deseas guardar la caché de hashes (${cacheSizeKB} KB) para acelerar futuros escaneos?`;
      }
      
      if (cacheConfirmModal) {
        cacheConfirmModal.style.display = 'flex';
      }
    } catch (error) {
      console.error('[ED] Error calculando tamaño de caché:', error);
      await exitDuplicateScanMode();
    }
  } else {
    await exitDuplicateScanMode();
  }
}

/**
 * Guarda la caché de hashes
 */
async function saveCacheAndExit() {
  console.log('[ED] Guardando caché de hashes...');
  
  if (cacheConfirmModal) {
    cacheConfirmModal.style.display = 'none';
  }
  
  if (currentDirectory && calculatedHashes.length > 0) {
    try {
      await window.electronAPI.saveHashCache(currentDirectory, calculatedHashes);
      console.log('[ED] Caché guardada exitosamente');
    } catch (error) {
      console.error('[ED] Error guardando caché:', error);
    }
  }
  
  await exitDuplicateScanMode();
}

/**
 * No guarda la caché y sale del modo
 */
async function dontSaveCacheAndExit() {
  console.log('[ED] No guardando caché');
  
  if (cacheConfirmModal) {
    cacheConfirmModal.style.display = 'none';
  }
  
  await exitDuplicateScanMode();
}

/**
 * Sale del modo de escaneo de duplicados
 */
async function exitDuplicateScanMode() {
  console.log('[ED] Saliendo del modo de escaneo de duplicados');
  
  // Desactivar modo
  isDuplicateScanMode = false;
  duplicateComparisons = [];
  currentDuplicateIndex = 0;
  calculatedHashes = [];
  duplicateScanCancelled = false;
  
  // UI: Desactivar botón
  if (duplicateScanBtn) duplicateScanBtn.classList.remove('active');
  
  // Mostrar imagen y carrusel PRIMERO
  if (viewer) viewer.style.display = 'flex';
  const carouselContainer = document.getElementById('carousel-container') as HTMLElement;
  if (carouselContainer) carouselContainer.style.display = 'flex';
  
  // Rehabilitar controles
  enableControlsAfterDuplicateScan();
  
  // Recargar directorio para reflejar cambios
  if (currentDirectory) {
    console.log('[ED] Recargando directorio...');
    await loadDirectory(currentDirectory);
  }
}

/**
 * Deshabilita controles durante el escaneo de duplicados
 */
function disableControlsDuringDuplicateScan() {
  console.log('[ED] Deshabilitando controles');
  
  // Deshabilitar botones de zoom
  if (zoomInBtn) zoomInBtn.disabled = true;
  if (zoomOutBtn) zoomOutBtn.disabled = true;
  if (zoomResetBtn) zoomResetBtn.disabled = true;
  if (fitToWindowBtn) fitToWindowBtn.disabled = true;
  
  // Deshabilitar REPO
  if (toggleDragModeBtn) toggleDragModeBtn.disabled = true;
  
  // Deshabilitar selección múltiple
  if (multiSelectBtn) multiSelectBtn.disabled = true;
  
  // Deshabilitar organizar por año
  if (organizeByYearBtn) organizeByYearBtn.disabled = true;
  
  // Deshabilitar filtro
  if (filterBtn) filterBtn.disabled = true;
  
  // Deshabilitar selector de directorio
  const selectDirBtn = document.getElementById('select-dir-btn') as HTMLButtonElement;
  if (selectDirBtn) selectDirBtn.disabled = true;
}

/**
 * Rehabilita controles después del escaneo de duplicados
 */
function enableControlsAfterDuplicateScan() {
  console.log('[ED] Rehabilitando controles');
  
  // Rehabilitar botones de zoom
  if (zoomInBtn) zoomInBtn.disabled = false;
  if (zoomOutBtn) zoomOutBtn.disabled = false;
  if (zoomResetBtn) zoomResetBtn.disabled = false;
  if (fitToWindowBtn) fitToWindowBtn.disabled = false;
  
  // Rehabilitar REPO
  if (toggleDragModeBtn) toggleDragModeBtn.disabled = false;
  
  // Rehabilitar selección múltiple
  if (multiSelectBtn) multiSelectBtn.disabled = false;
  
  // Rehabilitar organizar por año
  if (organizeByYearBtn) organizeByYearBtn.disabled = false;
  
  // Rehabilitar filtro
  if (filterBtn) filterBtn.disabled = false;
  
  // Rehabilitar selector de directorio
  const selectDirBtn = document.getElementById('select-dir-btn') as HTMLButtonElement;
  if (selectDirBtn) selectDirBtn.disabled = false;
}

/**
 * Actualiza el texto del loading overlay
 */
function updateLoadingText(text: string) {
  const loadingText = document.getElementById('loading-text') as HTMLElement;
  if (loadingText) {
    loadingText.textContent = text;
  }
}

// Event listeners para el modal de escaneo de duplicados
if (duplicateScanLeftSection) {
  duplicateScanLeftSection.addEventListener('click', () => {
    handleLeftImageClick();
  });
}

if (duplicateScanRightSection) {
  duplicateScanRightSection.addEventListener('click', () => {
    handleRightImageClick();
  });
}

if (duplicateKeepBothBtn) {
  duplicateKeepBothBtn.addEventListener('click', () => {
    handleKeepBoth();
  });
}

if (duplicateCancelScanBtn) {
  duplicateCancelScanBtn.addEventListener('click', () => {
    console.log('[ED] Click en botón Cancelar escaneo');
    handleCancelScan();
  });
}

// Event listeners para el modal de confirmación de caché
if (cacheSaveBtn) {
  cacheSaveBtn.addEventListener('click', () => {
    console.log('[ED] Click en botón Guardar caché');
    saveCacheAndExit();
  });
} else {
  console.error('[ED] No se encontró cacheSaveBtn');
}

if (cacheDontSaveBtn) {
  cacheDontSaveBtn.addEventListener('click', () => {
    console.log('[ED] Click en botón No guardar caché');
    dontSaveCacheAndExit();
  });
} else {
  console.error('[ED] No se encontró cacheDontSaveBtn');
}
