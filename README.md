# KH Image Organizer

**[English](#english)** | **[Español](#español)**

---

<a name="english"></a>
## 🖼️ English

### Overview
**KH Image Organizer** is a powerful desktop application that simplifies the process of organizing large image collections. Move files efficiently into subfolders, with the additional capability to add destination folders located in different directories (In short, visualize and drag your images anywhere on your PC and other locations!).

### ✨ Key Features

#### 📂 Move Images to Listed Directories
Organize your images by moving them to destination folders displayed in the sidebar. Add destination folders and move images quickly.

#### 🧭 Intuitive Navigation
Navigate effortlessly through your image collection using keyboard shortcuts, mouse controls, or toolbar buttons:
- **Keyboard & Mouse**: Arrow keys, mouse scroll buttons, and quick directory search
- **Quick Directory Search**: Type multiple characters to instantly find directories (e.g., "nu" finds "Nueva carpeta")
- **Toolbar Controls**: Access all functions through visual buttons

#### 📁 Advanced File Management
- **File Associations**: Opens all common image formats (.jpg, .png, .gif, .bmp, .webp, .svg, .ico, .tiff)
- **Creation Date Sorting**: Images sorted by actual creation date, not modification date

#### 🖼️ Main Interface Components
- **Sidebar**: Browse subdirectories and navigate folder structure. Add destination folders from any location, including different drives
- **Image Viewer**: View images with size adjustments (fit-to-window and zoom)
- **Toolbar**: Quick access to all application functions
- **Preview Carousel**: Thumbnail preview strip for quick navigation
- **Conflict Comparison Modal**: Side-by-side comparison when duplicate files are detected

#### ⚠️ Intelligent Conflict Resolution
When moving files to destinations where duplicates exist:
- **Side-by-Side Comparison**: View both source and destination images simultaneously
- **Detailed Metadata**: Compare file size, creation date, modification date, and dimensions
- **Three Resolution Options**:
  - Replace destination file with source
  - Keep destination file (delete source)
  - Keep both files (rename with date suffix)
- **Visual Overlays**: Color-coded indicators (green for keep, red for delete)


### 🎮 Keyboard & Mouse Controls

| Key/Button | Action |
|------------|--------|
| `←` `→` | Navigate between images |
| `↑` `↓` | Zoom current image |
| `1` | Toggle between original resolution and fit-to-window |
| `A-Z` | Quick search directories (multi-character support) |
| `Supr` / `Delete` | Delete current image |
| `Middle Mouse Button` | Toggle between move mode and reposition mode |
| `Horizontal Scroll` | Navigate between images (mice with side buttons) |

### 📦 Installation

#### For End Users
A pre-built installer will be available soon in the `release/` folder for easy installation without technical knowledge.

#### For Developers (Build from Source)

##### Prerequisites
- Node.js 16 or higher
- npm or yarn

##### Setup
```bash
# Clone the repository
git clone https://github.com/Ksee18/kh-image-organizer.git
cd kh-image-organizer

# Install dependencies
npm install

# Build the application
npm run build

# Package for Windows
npx electron-packager . "KH Image Organizer" --platform=win32 --arch=x64 --out=release --overwrite --icon=assets/kh-icon.ico --no-asar
```

##### Running the Application
After packaging, find the executable in:
```
release/KH Image Organizer-win32-x64/KH Image Organizer.exe
```

### 🛠️ Technology Stack
- **Electron** 39.2.6 - Desktop application framework
- **TypeScript** 5.9.3 - Type-safe development
- **Sharp** 0.34.5 - High-performance image processing
- **Native Modules**: Optimized for Windows x64

### 🚧 Upcoming Features
- **Multi-Select Mode (SM)**: Select and move multiple images simultaneously
  - Batch movement of selected images
  - Visual selection UI with thumbnails
  - Conflict handling for multiple operations
  - Drag & drop for visual selection
  - Selection counter
- **English Language Support**: Interface translation
- **Light Theme**: Alternative color scheme
- **Bulk Organization**: Organize current directory by creation year

### 📝 License
This project is provided as-is for personal and educational use.

### 👤 Author
**Ksee18** - [GitHub Profile](https://github.com/Ksee18)

### 🐛 Bug Reports & Feature Requests
Please open an issue on the [GitHub repository](https://github.com/Ksee18/kh-image-organizer/issues).

---

<a name="español"></a>
## 🖼️ Español

### Descripción General
**KH Image Organizer** es una potente aplicación de escritorio que simplifica el proceso de organizar grandes colecciones de imágenes. Mueve archivos eficientemente en subcarpetas, con la capacidad adicional de agregar carpetas de destino ubicadas en diferentes directorios (En pocas palabras visualiza y arrastra tus imagenes a donde quieras en tu pc y demas ubicaciones!).

### ✨ Características Principales

#### 📂 Mover Imágenes a Directorios Listados
Organiza tus imágenes moviéndolas a carpetas de destino mostradas en la barra lateral. Agrega carpetas de destino y mueve imágenes rápidamente.

#### 🧭 Navegación Intuitiva
Navega sin esfuerzo a través de tu colección de imágenes usando atajos de teclado, controles del mouse o botones de la barra de herramientas:
- **Teclado y Mouse**: Teclas de flecha, botones de scroll del mouse, y búsqueda rápida de directorios
- **Búsqueda Rápida de Directorios**: Escribe múltiples caracteres para encontrar directorios al instante (ej: "nu" encuentra "Nueva carpeta")
- **Controles de la Toolbar**: Accede a todas las funciones mediante botones visuales

#### 📁 Gestión Avanzada de Archivos
- **Asociaciones de Archivos**: Abre todos los formatos de imagen comunes (.jpg, .png, .gif, .bmp, .webp, .svg, .ico, .tiff)
- **Ordenamiento por Fecha de Creación**: Imágenes ordenadas por fecha real de creación, no de modificación

#### 🖼️ Componentes Principales de la Interfaz
- **Sidebar**: Explora subdirectorios y navega por la estructura de carpetas. Agrega carpetas de destino desde cualquier ubicación, incluyendo diferentes discos
- **Visor de Imágenes**: Visualiza imágenes con ajustes de tamaño (ajustar a ventana y zoom)
- **Toolbar**: Acceso rápido a todas las funciones de la aplicación
- **Carrusel de Previsualización**: Franja de miniaturas para navegación rápida
- **Modal de Comparación de Conflictos**: Comparación lado a lado cuando se detectan archivos duplicados

#### ⚠️ Resolución Inteligente de Conflictos
Cuando se mueven archivos a destinos donde existen duplicados:
- **Comparación Lado a Lado**: Visualiza ambas imágenes (origen y destino) simultáneamente
- **Metadatos Detallados**: Compara tamaño de archivo, fecha de creación, fecha de modificación y dimensiones
- **Tres Opciones de Resolución**:
  - Reemplazar archivo de destino con el de origen
  - Mantener archivo de destino (eliminar origen)
  - Mantener ambos archivos (renombrar con sufijo de fecha)
- **Overlays Visuales**: Indicadores codificados por color (verde para mantener, rojo para eliminar)


### 🎮 Controles de Teclado y Mouse

| Tecla/Botón | Acción |
|-------------|--------|
| `←` `→` | Navegación entre imágenes |
| `↑` `↓` | Zoom de la imagen actual |
| `1` | Toggle entre resolución original y ajustar a ventana |
| `A-Z` | Búsqueda rápida de directorios (soporte multi-carácter) |
| `Supr` / `Delete` | Eliminar imagen actual |
| `Botón central del mouse` | Toggle entre modo mover y modo reposicionar |
| `Scroll horizontal` | Navegación entre imágenes (ratones con botones laterales) |

### 📦 Instalación

#### Para Usuarios Finales
Próximamente estará disponible un instalador pre-construido en la carpeta `release/` para instalación fácil sin conocimientos técnicos.

#### Para Desarrolladores (Compilar desde el Código Fuente)

##### Requisitos Previos
- Node.js 16 o superior
- npm o yarn

##### Configuración
```bash
# Clonar el repositorio
git clone https://github.com/Ksee18/kh-image-organizer.git
cd kh-image-organizer

# Instalar dependencias
npm install

# Construir la aplicación
npm run build

# Empaquetar para Windows
npx electron-packager . "KH Image Organizer" --platform=win32 --arch=x64 --out=release --overwrite --icon=assets/kh-icon.ico --no-asar
```

##### Ejecutar la Aplicación
Después de empaquetar, encuentra el ejecutable en:
```
release/KH Image Organizer-win32-x64/KH Image Organizer.exe
```

### 🛠️ Stack Tecnológico
- **Electron** 39.2.6 - Framework de aplicación de escritorio
- **TypeScript** 5.9.3 - Desarrollo con tipado seguro
- **Sharp** 0.34.5 - Procesamiento de imágenes de alto rendimiento
- **Módulos Nativos**: Optimizado para Windows x64

### 🚧 Características Próximas
- **Modo Multi-Selección (SM)**: Selecciona y mueve múltiples imágenes simultáneamente
  - Movimiento en batch de imágenes seleccionadas
  - UI visual de selección con miniaturas
  - Manejo de conflictos para operaciones múltiples
  - Drag & drop para selección visual
  - Contador de selección
- **Idioma Inglés**: Traducción de la interfaz
- **Tema Claro**: Esquema de color alternativo
- **Organización Masiva**: Organizar directorio actual separado por año de creación

### 📝 Licencia
Este proyecto se proporciona tal cual para uso personal y educativo.

### 👤 Autor
**Ksee18** - [Perfil de GitHub](https://github.com/Ksee18)

### 🐛 Reportes de Errores y Solicitudes de Características
Por favor abre un issue en el [repositorio de GitHub](https://github.com/Ksee18/kh-image-organizer/issues).

---

**⭐ Si este proyecto te resultó útil, considera darle una estrella en GitHub!**
