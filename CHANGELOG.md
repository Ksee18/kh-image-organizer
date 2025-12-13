# CHANGELOG

Registro de cambios y evolución del proyecto **KH Image Organizer**.

---

## [1.1.0] - 2024-12-12

### 🎉 Actualización Mayor - Modo Multi-Selección y Mejoras Visuales

### ✨ Nuevas Características

#### 🖱️ Modo Multi-Selección (SM)
- **Activación del Modo SM**: Nuevo botón en toolbar para entrar/salir del modo de selección múltiple
  - Indicador visual: Botón verde cuando está activo
  - Atajo: Tecla `ESC` para salir del modo
- **Selección de Imágenes**:
  - Click para seleccionar/deseleccionar imágenes individuales
  - Long-press (mantener click) para selección rápida
  - Indicador visual: Checkmark verde en miniaturas seleccionadas
  - Visor de miniaturas flotante con contador de imágenes seleccionadas
- **Operaciones en Batch**:
  - Movimiento de múltiples imágenes simultáneamente
  - Sistema de cola para manejo de conflictos secuenciales
  - Proceso automático de conflictos uno por uno
- **Deshabilitar Funciones**: Zoom, drag mode y otros controles se deshabilitan automáticamente en modo SM

#### 📅 Organización por Año
- **Script PowerShell**: Nuevo sistema para organizar imágenes automáticamente por año
  - Usa fecha de creación o modificación (la más antigua)
  - Crea carpetas automáticamente por año (ej: 2023, 2024, 2025)
  - Manejo inteligente de conflictos con numeración automática
  - Solo procesa archivos de imagen
- **Botón de Organización**: Nuevo botón en toolbar con ícono de carpeta y año actual
- **Modal de Confirmación**: Diálogo con explicación clara antes de organizar

#### 🗓️ Ordenamiento por Fecha de Descarga
- **Script PowerShell Avanzado**: Integración con Shell.Application de Windows
  - Lee el campo "Fecha" exacto de Windows Explorer usando metadatos EXIF
  - Coincide 90% con el orden de Windows Explorer
  - Opción beta claramente marcada por ser más lenta
- **Nuevas Opciones de Filtrado**:
  - **Fecha creación (antigua/reciente)**: Ordenamiento rápido por birthtimeMs
  - **Fecha de descarga (antigua/reciente) (beta)**: Ordenamiento preciso con PowerShell
- **Loading Overlay**: Indicador visual durante operaciones lentas de ordenamiento

#### 🎨 Mejoras Visuales de Modales
- **Cabeceras Estilizadas**: Nuevo diseño con patrón de cuadrícula generado con CSS
  - Background pattern de https://www.magicpattern.design/tools/css-backgrounds
  - Colores: `#f2f2ff` con líneas `#d4d4e6`
  - Texto en negro oscuro (`#1a1a1a`) para mejor legibilidad
- **Modales Actualizados**:
  - Modal de conflictos de archivos
  - Modal de nueva carpeta
  - Modal de organización por año
- **Mejoras de UX**: Textos en blanco para mejor contraste en fondos oscuros

### 🔧 Mejoras y Correcciones

#### 🖱️ Navegación del Carrusel
- **Navegación con Rueda del Mouse**: Scroll horizontal sobre el carrusel
  - Detección de eventos `wheel` con `deltaY`
  - Navegación suave entre imágenes
- **Nuevos Botones de Navegación**:
  - **Primera imagen**: Nuevo ícono más claro (línea vertical + flecha)
  - **Última imagen**: Nuevo ícono más claro (flecha + línea vertical)
  - Iconos rediseñados para mejor visibilidad y comprensión

#### 🐛 Corrección: Error EXDEV en Movimientos Entre Particiones
- **Problema**: Error al mover archivos entre discos/particiones diferentes
- **Solución**: Sistema de fallback automático
  - Intenta `rename()` primero (rápido)
  - Si falla con EXDEV, usa copy + delete (seguro)
  - Manejo transparente sin intervención del usuario

#### 🐛 Corrección: Conflictos en Operaciones SM Bulk
- **Problema**: Conflictos múltiples simultáneos causaban inconsistencias
- **Solución**: Sistema de cola de conflictos
  - Array `pendingConflicts[]` para almacenar conflictos pendientes
  - Flag `isProcessingConflicts` para control de flujo
  - Procesamiento secuencial: un conflicto a la vez
  - Continuación automática tras resolver cada conflicto

#### 📱 Mejoras de Diseño Responsivo
- **Sidebar**: Optimizada para resoluciones pequeñas
  - Mejor manejo de overflow
  - Controles sticky ajustados
- **Toolbar**: Mejoras horizontales en pantallas reducidas
  - Iconos y espaciado optimizado
  - Mejor distribución de elementos

#### 📝 Mensajes Contextuales
- **Empty State Mejorado**: Mensajes diferentes según contexto
  - Sin directorio: "Haz click aquí para seleccionar el directorio a organizar"
  - Directorio vacío: "Este directorio no tiene imágenes, prueba cambiar a otro"

### 🔑 Nuevos Atajos de Teclado
- `CTRL`: Entrar al modo multi-selección (SM)
- `ESC`: Salir del modo multi-selección (SM)

### 🎮 Interacciones del Mouse Mejoradas
- `Scroll sobre carrusel`: Navegación horizontal entre imágenes
- `Click en miniatura (SM)`: Seleccionar/deseleccionar imagen
- `Long-press en miniatura (SM)`: Selección rápida continua

### 📋 Arquitectura y Mejoras Técnicas

#### Scripts PowerShell
- **get-explorer-date-order.ps1**: 
  - Acceso a Shell.Application para metadatos exactos de Windows
  - Parsing de fechas EXIF con formato MM/dd/yyyy
  - Fallback a birthtimeMs y mtimeMs
  - Output en formato JSON para integración con Electron
- **organize-by-year.ps1**:
  - Filtrado por extensiones de imagen
  - Función `Get-Year` para fecha más antigua
  - Creación automática de directorios
  - Manejo de conflictos con sufijos numéricos

#### IPC Handlers
- `get-explorer-date-order`: Ejecuta script PS1 para ordenamiento por fecha de descarga
- `organize-by-year`: Ejecuta script PS1 para organización automática por año

#### Tipos TypeScript Extendidos
- `SortOrder`: Nuevos valores `'created-asc' | 'created-desc'` para ordenamiento rápido
- `ElectronAPI`: Nueva función `organizeByYear(directoryPath: string)`

### 🎨 Estilos CSS Nuevos
- `.modal-header`: Cabecera con patrón de cuadrícula
- `.modal-body-year`: Contenedor específico para modal de organización
- `.loading-overlay` y `.loading-spinner`: Indicadores de carga durante operaciones lentas
- `.multi-select-thumbnails`: Visor flotante de imágenes seleccionadas
- `.multi-select-thumbnail-item`: Estilo para miniaturas con checkmark

### 📦 Distribución
- **Versión**: 1.1.0
- **Build**: Incluye scripts PowerShell en carpeta `scripts/`
- **Compatibilidad**: Windows 10/11 con PowerShell

---

## [1.0.0] - 2024-12-09

### 🎉 Lanzamiento Inicial

Primera versión funcional de KH Image Organizer.

### ✨ Características Principales

#### Separacion de sistemas de arrastrado
- **Modo MAA (Mover Arrastrando)**: Sistema completo para mover imágenes a carpetas de destino
- **Modo REPO (Reposicionar)**: Capacidad de reoposisionar la imagen en el viewer ya sea con zoom inn o zoom out.
- **Toggle entre Modos**: Boton con indicador visual para el modo REPO, se activa con el boton central del mouse.

#### Gestión de Directorios
- **Búsqueda Rápida Multi-Carácter**: Escribe múltiples letras para encontrar directorios (ej: "nu" para "Nueva carpeta")
  - Sistema de acumulación de teclas con timeout de 800ms
  - Búsqueda por coincidencia de string en lugar de solo primera letra
- **Click para Centrar**: Single-click en directorios para centrarlos en la vista con efecto de parpadeo visual
- **Double-Click para Navegar**: Mantiene funcionalidad de navegación con doble click
- **Botones de Scroll**: Controles sticky/fixed para scroll de subdirectorios y carpetas de destino

#### Visualización de Imágenes
- **Generación de Miniaturas Optimizada**: 
  - Lazy loading solo para elementos visibles
  - Generación automática al navegar con teclas de flecha (bug corregido)
  - Eficiencia de memoria mejorada
- **Vista Principal**: Visualización de imagen actual con overlay de información
- **Nombre de Archivo**: Display del nombre del archivo actual en la interfaz
- **Zoom optimizado**: El zoom en la imagen se puede hacer con el scroll o las teclas flecha arriba y flecha abajo. Tambien se cuenta con botones para esto en la tool bar.
- **Ajuste automatico**: Se puede ajustar la imagen a su tamaño original o a que se encuadre en la ventana con la tecla 1. Tambien hay dos botones para estas acciones en la toolbar.

#### Resolución de Conflictos de duplicidad al mover archivos.
- **Modal de Comparación**: Sistema completo de resolución cuando existe archivo en destino
  - Vista lado a lado de imagen origen y destino
  - Comparación de metadatos (tamaño, fechas, dimensiones)
  - Indicadores de diferencias (más grande/pequeño, más nuevo/viejo)
- **Tres Opciones de Resolución**:
  1. Reemplazar archivo de destino con el de origen
  2. Mantener archivo de destino (eliminar origen)
  3. Mantener ambos archivos con renombrado automático (sufijo de fecha)
- **Overlays Visuales**: Indicadores de color con transparencia 0.3 (verde=mantener, rojo=eliminar)

#### Ordenamiento y Filtrado
- **Ordenamiento por Fecha de Creación**: Usa `birthtimeMs` en lugar de `mtimeMs`
  - Más preciso para imágenes descargadas
  - Coincide con el ordenamiento de Windows Explorer
- **Formatos Soportados**: .jpg, .jpeg, .png, .gif, .bmp, .webp, .svg, .ico, .tiff

#### Gestión de Archivos
- **Asociaciones de Archivos**: Configuración completa para todos los formatos de imagen

#### Interfaz de Usuario
- **Diseño Limpio**: Interfaz minimalista enfocada en las imágenes
- **Color Scheme**: 
  - Botones de destino en azul (#6c9bcf)
  - Indicadores visuales claros para diferentes estados
- **Animaciones**: 
  - Efecto de parpadeo (`directoryBlink`) para directorios
  - Transiciones suaves en botones y controles
- **Responsive**: Sidebar con scroll y controles sticky/fixed

### 🛠️ Stack Tecnológico
- **Electron** 39.2.6: Framework de aplicación de escritorio
- **TypeScript** 5.9.3: Desarrollo con tipado estático
- **Sharp** 0.34.5: Procesamiento de imágenes de alto rendimiento
- **electron-packager**: Empaquetado sin asar para compatibilidad con Sharp

### 🔧 Configuración y Build
- **Compilación TypeScript**: Sistema de build con `tsc`
- **Empaquetado**: electron-packager con flag `--no-asar` para módulos nativos
- **Icono**: Integración completa de icono personalizado (61.76 KB, formato .ico)
- **Asociaciones de Archivos**: Configuración automática para 8 formatos de imagen

### 🎮 Atajos de Teclado y mouse
- `←` `→`: Navegación entre imágenes
- `↑` `↓`: Zoom de la imagen actual
- `1`: Toggle entre la imagen en su resolucion original y la imagen ajustada a la ventana
- `A-Z`: Búsqueda rápida de directorios (multi-carácter)
- `Supr` / `Delete`: Eliminar imagen actual
- `Botón central del mouse` (scroll): Toggle entre modo MAA y modo REPO
- `Scroll horizontal` (botones laterales del mouse): Navegación entre imágenes (solo ratones con botones laterales)


### 📋 Arquitectura
- **IPC Communication**: Canales optimizados entre main y renderer
  - `move-file`: Retorna objeto `MoveFileResult` con estado detallado
  - `get-image-metadata`: Incluye createdTime, modified, dimensiones
  - `get-single-image-metadata`: Para comparación en modal de conflictos
  - `delete-file`: Para resolución de conflictos
- **Tipos TypeScript**: Interfaces completas para type-safety
  - `MoveFileResult`: Estado de operaciones de movimiento
  - `ImageMetadata`: Metadatos completos de imágenes
  - `ElectronAPI`: Definiciones de API del preload script

### 🐛 Correcciones Importantes
- **Miniaturas en Navegación**: Corregido bug donde miniaturas no se generaban al navegar con flechas
- **Ordenamiento**: Cambiado de modification time a creation time para precisión
- **Overlays de Conflicto**: Ajustada transparencia de 0.7 a 0.3 para mejor visibilidad
- **Búsqueda de Directorios**: Mejorada de single-char a multi-char con timeout

### 📦 Distribución
- **Formato**: Portable ejecutable para Windows x64
- **Ubicación**: `release/KH Image Organizer-win32-x64/`
- **Tamaño**: Aplicación optimizada con Sharp no empaquetado en asar
- **Requisitos**: Windows 10/11, no requiere instalación

---

## 🚀 Próximas Versiones

### [1.2.0] - Planificado
- **Función de Deshacer**: Botón en toolbar para revertir el último movimiento de imágenes
  - Restauración de archivos a su ubicación original
  - Historial de operaciones recientes
  
### Futuro
- Idioma inglés
- Tema claro de interfaz
- Vista de calendario para organización temporal
- Edición básica de imágenes (rotar, recortar)
- Exportación de selecciones a ZIP

---

**Nota**: Este proyecto está en desarrollo activo. Para reportar bugs o sugerir características, visita el [repositorio de GitHub](https://github.com/Ksee18/kh-image-organizer/issues).
