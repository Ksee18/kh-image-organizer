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
type SortOrder = 'name-asc' | 'name-desc' | 'date-asc' | 'date-desc' | 'size-asc' | 'size-desc';
let currentSortOrder: SortOrder = 'name-asc';

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 5;
const ZOOM_STEP = 0.2;
const VISIBLE_BUFFER = 25;
const MAX_CONCURRENT_THUMBNAILS = 3;

// Elementos del DOM  
const viewer = document.getElementById('viewer') as HTMLElement;
const emptyState = document.getElementById('empty-state') as HTMLElement;
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
const sidebar = document.querySelector('.sidebar') as HTMLElement;
const sidebarScrollTopBtn = document.getElementById('sidebar-scroll-top-btn') as HTMLButtonElement;
const sidebarScrollBottomBtn = document.getElementById('sidebar-scroll-bottom-btn') as HTMLButtonElement;
const multiselectContainer = document.getElementById('multiselect-container') as HTMLElement;
const multiselectThumbnails = document.getElementById('multiselect-thumbnails') as HTMLElement;

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
const toggleMultiselectBtn = document.getElementById('toggle-multiselect-btn') as HTMLButtonElement;

// Filtro
const filterBtn = document.getElementById('filter-btn') as HTMLButtonElement;
const filterMenu = document.getElementById('filter-menu') as HTMLElement;

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
      sortImages();
      
      currentImageIndex = 0;
      console.log('[RENDERER] currentImageIndex establecido a:', currentImageIndex);
      console.log('[RENDERER] Primera imagen:', currentImages[currentImageIndex]);
      emptyState.style.display = 'none';
      imageView.style.display = 'flex';
      showImage(currentImages[currentImageIndex]);
      await initializeCarousel();
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
  
  // Click
  item.addEventListener('click', () => {
    const idx = parseInt(item.dataset.index || '0', 10);
    navigateToImage(idx);
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

function sortImages() {
  currentImages.sort((a, b) => {
    const metaA = imageMetadata.get(a);
    const metaB = imageMetadata.get(b);
    
    if (!metaA || !metaB) return 0;
    
    switch (currentSortOrder) {
      case 'name-asc':
        return metaA.name.localeCompare(metaB.name, undefined, { numeric: true });
      case 'name-desc':
        return metaB.name.localeCompare(metaA.name, undefined, { numeric: true });
      case 'date-asc':
        return metaA.createdTime - metaB.createdTime;
      case 'date-desc':
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
        htmlItem.scrollIntoView({ behavior: 'auto', block: 'center' });
        htmlItem.style.animation = 'directoryBlink 0.6s ease-in-out';
        setTimeout(() => {
          htmlItem.style.animation = '';
        }, 600);
      });
      
      // Doble clic: navegar
      htmlItem.addEventListener('dblclick', () => {
        const path = htmlItem.dataset.path;
        if (path) {
          console.log('[Renderer] Doble clic en subdirectorio:', path);
          loadDirectory(path);
        }
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
        htmlItem.scrollIntoView({ behavior: 'auto', block: 'center' });
        htmlItem.style.animation = 'directoryBlink 0.6s ease-in-out';
        setTimeout(() => {
          htmlItem.style.animation = '';
        }, 600);
      });
      
      // Doble clic: navegar
      htmlItem.addEventListener('dblclick', () => {
        const path = htmlItem.dataset.path;
        const isDestination = htmlItem.dataset.isDestination === 'true';
        if (path) {
          console.log('[Renderer] Doble clic en directorio destino:', path);
          
          // Si es directorio destino, eliminarlo de la lista antes de navegar
          if (isDestination) {
            const index = destinationDirectories.indexOf(path);
            if (index > -1) {
              destinationDirectories.splice(index, 1);
              displayDestinationDirectories();
            }
          }
          
          loadDirectory(path);
        }
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
    
    const currentImagePath = currentImages[currentImageIndex];
    await moveImageToDirectory(currentImagePath, targetPath);
  });
}

// Configurar eventos de drag en la imagen principal
if (currentImage) {
  currentImage.addEventListener('dragstart', (e) => {
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
        
        updateNavigationButtons();
      }
    } else if (result.exists && result.targetPath) {
      // Archivo duplicado, abrir modal de conflicto
      console.log('[Renderer] Conflicto detectado, abriendo modal');
      await handleFileConflict(imagePath, targetDirectory, result.targetPath);
    } else {
      console.error('[Renderer] Error al mover imagen');
      alert('Error al mover la imagen');
    }
  } catch (error) {
    console.error('[Renderer] Error al mover imagen:', error);
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

if (carouselNavLeft) {
  carouselNavLeft.addEventListener('click', () => navigateToFirst());
}

if (carouselNavRight) {
  carouselNavRight.addEventListener('click', () => navigateToLast());
}

document.addEventListener('keydown', (e) => {
  if (currentImages.length === 0) return;
  
  if (e.key === 'ArrowLeft') {
    e.preventDefault();
    navigatePrevious();
  } else if (e.key === 'ArrowRight') {
    e.preventDefault();
    navigateNext();
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    zoomIn();
  } else if (e.key === 'ArrowDown') {
    e.preventDefault();
    zoomOut();
  } else if (e.key === 'Delete') {
    e.preventDefault();
    deleteCurrentImage();
  } else if (e.key === '1') {
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
    option.addEventListener('click', (e) => {
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
        sortImages();
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
  
  const scrollTop = sidebar.scrollTop;
  const scrollHeight = sidebar.scrollHeight;
  const clientHeight = sidebar.clientHeight;
  const scrollBottom = scrollHeight - scrollTop - clientHeight;
  
  // Mostrar botón "ir arriba" si no está en el tope (con un margen de 10px)
  if (scrollTop > 10) {
    sidebarScrollTopBtn.style.display = 'flex';
  } else {
    sidebarScrollTopBtn.style.display = 'none';
  }
  
  // Mostrar botón "ir abajo" si no está en el fondo (con un margen de 10px)
  if (scrollBottom > 10) {
    sidebarScrollBottomBtn.style.display = 'flex';
  } else {
    sidebarScrollBottomBtn.style.display = 'none';
  }
}

// Event listeners para los botones de scroll de sidebar
if (sidebarScrollTopBtn) {
  sidebarScrollTopBtn.addEventListener('click', () => {
    sidebar.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

if (sidebarScrollBottomBtn) {
  sidebarScrollBottomBtn.addEventListener('click', () => {
    sidebar.scrollTo({ top: sidebar.scrollHeight, behavior: 'smooth' });
  });
}

// Detectar scroll en sidebar para actualizar botones
if (sidebar) {
  sidebar.addEventListener('scroll', updateSidebarScrollButtons);
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
  
  // Si es la misma búsqueda, buscar el siguiente
  let searchFromIndex = 0;
  if (lastPressedKey === directorySearchString && currentFocusIndex !== -1) {
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
    if (dirName.toUpperCase().startsWith(directorySearchString)) {
      foundIndex = i;
      break;
    }
  }
  
  // Si no se encontró desde searchFromIndex, buscar desde el principio
  if (foundIndex === -1 && searchFromIndex > 0) {
    for (let i = 0; i < searchFromIndex; i++) {
      const dirName = (allDirectories[i].querySelector('.subdirectory-name') as HTMLElement)?.textContent || '';
      if (dirName.toUpperCase().startsWith(directorySearchString)) {
        foundIndex = i;
        break;
      }
    }
  }
  
  if (foundIndex !== -1) {
    currentFocusIndex = foundIndex;
    const targetElement = allDirectories[foundIndex] as HTMLElement;
    
    // Scroll instantáneo al elemento
    targetElement.scrollIntoView({ behavior: 'auto', block: 'center' });
    
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
      targetElement.scrollIntoView({ behavior: 'auto', block: 'center' });
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
        closeConflictModal();
        removeCurrentImageFromList();
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
        closeConflictModal();
        removeCurrentImageFromList();
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
        closeConflictModal();
        removeCurrentImageFromList();
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
