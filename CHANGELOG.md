# CHANGELOG

Registro de cambios y evolución del proyecto **KH Image Organizer**.

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

### [1.1.0] - Planificado
- **Multi-Select Mode (SM)**: Próxima característica principal
  - Selección de múltiples imágenes simultáneamente
  - Movimiento en batch de imágenes seleccionadas
  - UI de miniaturas para imágenes seleccionadas
  - Manejo de conflictos para operaciones múltiples
  - Drag & drop para selección visual
  - Contador de imágenes seleccionadas
  
### Futuro
- Idioma ingles
- Temas claro de interfaz
- Organizacion masiva del directorio actual separado por año de creacion.

---

**Nota**: Este proyecto está en desarrollo activo. Para reportar bugs o sugerir características, visita el [repositorio de GitHub](https://github.com/Ksee18/kh-image-organizer/issues).
