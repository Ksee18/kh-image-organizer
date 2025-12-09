# KH Image Organizer

**[English](#english)** | **[Español](#español)**

---

<a name="english"></a>
## 🖼️ English

### Overview
**KH Image Organizer** is a powerful desktop application built with Electron that simplifies the process of organizing large collections of images. With its dual-mode system, you can efficiently move files to categorized folders or reposition images within your current directory structure.

### ✨ Key Features

#### 🎯 Dual Operating Modes
- **MAA Mode (Move and Advance)**: Move images to destination folders and automatically advance to the next image
- **REPO Mode (Reposition)**: Reorganize images within the current directory by moving them to different positions

#### 🚀 Enhanced Navigation
- **Keyboard Shortcuts**: Navigate quickly using arrow keys
- **Quick Directory Search**: Type multiple characters to instantly find directories (e.g., "nu" finds "Nueva carpeta")
- **Click-to-Center**: Single-click directories to center and highlight them with a visual blink effect
- **Smooth Scrolling**: Scroll buttons for both subdirectories and destination folders

#### 🔍 Smart Thumbnail Generation
- **Lazy Loading**: Thumbnails generate only for visible items, optimizing performance
- **Automatic Generation**: Thumbnails appear automatically when navigating with arrow keys
- **Memory Efficient**: Only generates what you need to see

#### ⚠️ Intelligent Conflict Resolution
- **Side-by-Side Comparison**: View both source and destination images simultaneously
- **Detailed Metadata**: Compare file size, creation date, modification date, and dimensions
- **Three Resolution Options**:
  - Replace destination file with source
  - Keep destination file (delete source)
  - Keep both files (rename with date suffix)
- **Visual Overlays**: Color-coded indicators (green for keep, red for delete)

#### 📁 Advanced File Management
- **File Associations**: Opens all common image formats (.jpg, .png, .gif, .bmp, .webp, .svg, .ico, .tiff)
- **Creation Date Sorting**: Images sorted by actual creation date, not modification date
- **Persistent Destination Folders**: Your selected destinations are remembered across sessions

### 🎮 Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `←` `→` | Navigate between images |
| `↑` `↓` | Navigate through subdirectories |
| `Enter` | Enter selected subdirectory |
| `Backspace` | Return to parent directory |
| `1-9` | Move image to corresponding destination folder |
| `0` | Toggle between MAA and REPO modes |
| `A-Z` | Quick search directories (multi-character support) |
| `Shift + ←` `→` | Navigate destination folders |
| `Shift + Enter` | Add current directory as destination |

### 📦 Installation

#### Prerequisites
- Node.js 16 or higher
- npm or yarn

#### Setup
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

#### Running the Application
After packaging, find the executable in:
```
release/KH Image Organizer-win32-x64/KH Image Organizer.exe
```

### 🛠️ Technology Stack
- **Electron** 39.2.6 - Desktop application framework
- **TypeScript** 5.9.3 - Type-safe development
- **Sharp** 0.34.5 - High-performance image processing
- **Native Modules**: Optimized for Windows x64

### 🔄 How to Use

1. **Launch the Application**: Run `KH Image Organizer.exe`
2. **Select a Directory**: Choose the folder containing your images
3. **Choose Your Mode**:
   - **MAA Mode**: Set up destination folders, then use number keys (1-9) to move images
   - **REPO Mode**: Use arrow keys to reposition images within the current directory
4. **Navigate Efficiently**: 
   - Use arrow keys to browse images
   - Type directory names for quick access
   - Click directories to center and highlight them
5. **Handle Conflicts**: If a file exists at the destination, the conflict modal appears with comparison tools

### 🎨 Interface Highlights
- **Clean, Distraction-Free Design**: Focus on your images
- **Responsive Thumbnail Sidebar**: Smooth scrolling with visual feedback
- **Color-Coded Buttons**: Blue destination buttons, clear visual hierarchy
- **Keyboard-First Workflow**: Minimize mouse usage for faster organization

### 🚧 Upcoming Features
- **Multi-Select Mode (SM)**: Select and move multiple images simultaneously (coming in next version)

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
**KH Image Organizer** es una potente aplicación de escritorio construida con Electron que simplifica el proceso de organizar grandes colecciones de imágenes. Con su sistema de doble modo, puedes mover eficientemente archivos a carpetas categorizadas o reposicionar imágenes dentro de tu estructura de directorios actual.

### ✨ Características Principales

#### 🎯 Modos de Operación Duales
- **Modo MAA (Mover y Avanzar)**: Mueve imágenes a carpetas de destino y avanza automáticamente a la siguiente imagen
- **Modo REPO (Reposicionar)**: Reorganiza imágenes dentro del directorio actual moviéndolas a diferentes posiciones

#### 🚀 Navegación Mejorada
- **Atajos de Teclado**: Navega rápidamente usando las teclas de flecha
- **Búsqueda Rápida de Directorios**: Escribe múltiples caracteres para encontrar directorios al instante (ej: "nu" encuentra "Nueva carpeta")
- **Click para Centrar**: Haz clic en directorios para centrarlos y resaltarlos con un efecto de parpadeo visual
- **Desplazamiento Suave**: Botones de scroll para subdirectorios y carpetas de destino

#### 🔍 Generación Inteligente de Miniaturas
- **Carga Diferida**: Las miniaturas se generan solo para elementos visibles, optimizando el rendimiento
- **Generación Automática**: Las miniaturas aparecen automáticamente al navegar con las teclas de flecha
- **Eficiencia de Memoria**: Solo genera lo que necesitas ver

#### ⚠️ Resolución Inteligente de Conflictos
- **Comparación Lado a Lado**: Visualiza ambas imágenes (origen y destino) simultáneamente
- **Metadatos Detallados**: Compara tamaño de archivo, fecha de creación, fecha de modificación y dimensiones
- **Tres Opciones de Resolución**:
  - Reemplazar archivo de destino con el de origen
  - Mantener archivo de destino (eliminar origen)
  - Mantener ambos archivos (renombrar con sufijo de fecha)
- **Overlays Visuales**: Indicadores codificados por color (verde para mantener, rojo para eliminar)

#### 📁 Gestión Avanzada de Archivos
- **Asociaciones de Archivos**: Abre todos los formatos de imagen comunes (.jpg, .png, .gif, .bmp, .webp, .svg, .ico, .tiff)
- **Ordenamiento por Fecha de Creación**: Imágenes ordenadas por fecha real de creación, no de modificación
- **Carpetas de Destino Persistentes**: Tus destinos seleccionados se recuerdan entre sesiones

### 🎮 Atajos de Teclado

| Tecla | Acción |
|-------|--------|
| `←` `→` | Navegar entre imágenes |
| `↑` `↓` | Navegar a través de subdirectorios |
| `Enter` | Entrar al subdirectorio seleccionado |
| `Backspace` | Regresar al directorio padre |
| `1-9` | Mover imagen a la carpeta de destino correspondiente |
| `0` | Alternar entre modos MAA y REPO |
| `A-Z` | Búsqueda rápida de directorios (soporte multi-carácter) |
| `Shift + ←` `→` | Navegar carpetas de destino |
| `Shift + Enter` | Agregar directorio actual como destino |

### 📦 Instalación

#### Requisitos Previos
- Node.js 16 o superior
- npm o yarn

#### Configuración
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

#### Ejecutar la Aplicación
Después de empaquetar, encuentra el ejecutable en:
```
release/KH Image Organizer-win32-x64/KH Image Organizer.exe
```

### 🛠️ Stack Tecnológico
- **Electron** 39.2.6 - Framework de aplicación de escritorio
- **TypeScript** 5.9.3 - Desarrollo con tipado seguro
- **Sharp** 0.34.5 - Procesamiento de imágenes de alto rendimiento
- **Módulos Nativos**: Optimizado para Windows x64

### 🔄 Cómo Usar

1. **Iniciar la Aplicación**: Ejecuta `KH Image Organizer.exe`
2. **Seleccionar un Directorio**: Elige la carpeta que contiene tus imágenes
3. **Elegir tu Modo**:
   - **Modo MAA**: Configura carpetas de destino, luego usa las teclas numéricas (1-9) para mover imágenes
   - **Modo REPO**: Usa las teclas de flecha para reposicionar imágenes dentro del directorio actual
4. **Navegar Eficientemente**: 
   - Usa las teclas de flecha para explorar imágenes
   - Escribe nombres de directorios para acceso rápido
   - Haz clic en directorios para centrarlos y resaltarlos
5. **Manejar Conflictos**: Si un archivo existe en el destino, aparece el modal de conflictos con herramientas de comparación

### 🎨 Aspectos Destacados de la Interfaz
- **Diseño Limpio y Sin Distracciones**: Enfócate en tus imágenes
- **Barra Lateral de Miniaturas Responsiva**: Desplazamiento suave con retroalimentación visual
- **Botones Codificados por Color**: Botones de destino azules, jerarquía visual clara
- **Flujo de Trabajo Centrado en Teclado**: Minimiza el uso del mouse para una organización más rápida

### 🚧 Características Próximas
- **Modo Multi-Selección (SM)**: Selecciona y mueve múltiples imágenes simultáneamente (próximamente en la siguiente versión)

### 📝 Licencia
Este proyecto se proporciona tal cual para uso personal y educativo.

### 👤 Autor
**Ksee18** - [Perfil de GitHub](https://github.com/Ksee18)

### 🐛 Reportes de Errores y Solicitudes de Características
Por favor abre un issue en el [repositorio de GitHub](https://github.com/Ksee18/kh-image-organizer/issues).

---

**⭐ Si este proyecto te resultó útil, considera darle una estrella en GitHub!**
