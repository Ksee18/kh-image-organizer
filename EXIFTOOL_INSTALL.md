# Instalación de ExifTool (Requerido para Etiquetas y Calificaciones)

## ⚠️ IMPORTANTE
**ExifTool es NECESARIO** para que el sistema de etiquetas y calificaciones funcione correctamente. Sin exiftool, no se podrán:
- Leer etiquetas (Keywords) de las imágenes
- Leer calificaciones (Rating) de las imágenes  
- Guardar nuevas etiquetas en las imágenes
- Guardar calificaciones en las imágenes

## Instalación en Windows

### Opción 1: Descarga directa (Recomendada)

1. Ve a: https://exiftool.org/
2. Descarga: **Windows Executable** (exiftool-12.xx.zip)
3. Extrae el archivo ZIP
4. Renombra `exiftool(-k).exe` a `exiftool.exe`
5. Copia `exiftool.exe` a una de estas ubicaciones:
   - `C:\Windows\` (requiere permisos de administrador)
   - `C:\Windows\System32\`
   - O cualquier carpeta que esté en tu PATH

### Opción 2: Usando Chocolatey

```powershell
choco install exiftool
```

### Opción 3: Usando Scoop

```powershell
scoop install exiftool
```

## Verificar Instalación

Abre PowerShell o CMD y ejecuta:

```powershell
exiftool -ver
```

Debería mostrar la versión instalada (ej: `12.70`)

Si muestra un error, exiftool NO está instalado correctamente.

## Solución de Problemas

### Error: "exiftool no es reconocido como comando"

**Solución**: Agregar exiftool al PATH de Windows

1. Copia `exiftool.exe` a `C:\exiftool\`
2. Ve a: Panel de Control > Sistema > Configuración avanzada del sistema
3. Click en "Variables de entorno"
4. En "Variables del sistema", selecciona "Path" y click "Editar"
5. Click "Nuevo" y agrega: `C:\exiftool`
6. Click "Aceptar" en todas las ventanas
7. **Reinicia PowerShell/CMD** (importante)
8. Verifica con: `exiftool -ver`

### La aplicación empaquetada no encuentra exiftool

Si empaquetas la aplicación con electron-packager, necesitas incluir exiftool en el paquete:

1. Copia `exiftool.exe` a la carpeta raíz del proyecto
2. Modifica `package.json` para incluirlo en el build
3. En el código, apunta a la ruta del ejecutable empaquetado

**O mejor aún**: Instala exiftool globalmente en el sistema donde se usará la app.

## Logs de Debug

Para verificar si exiftool está funcionando, revisa los logs de la aplicación:

1. Abre DevTools (F12)
2. Ve a la pestaña "Console"
3. Busca mensajes que empiecen con `[Tags]` o `[Rating]`
4. Si ves "exiftool NO está instalado", sigue las instrucciones arriba

También puedes revisar los logs en:
```
%APPDATA%\kh_image_organizer\logs\
```

## Testing

Para probar que funciona:

1. Abre la aplicación
2. Carga una imagen
3. Abre la sidebar de etiquetas (botón con icono de etiqueta)
4. Intenta calificar con estrellas
5. Revisa la consola/logs para ver si hay errores

## Metadatos Soportados

ExifTool permite leer/escribir:
- **Keywords**: Etiquetas de la imagen (estándar IPTC/XMP)
- **Rating**: Calificación de 0-5 estrellas (estándar XMP)
- Y muchos otros metadatos EXIF/IPTC/XMP

## Notas

- ExifTool NO modifica la imagen original, solo los metadatos
- Los metadatos se guardan en formatos estándar compatibles con:
  - Adobe Lightroom
  - Adobe Bridge
  - Windows Explorer (Vista de detalles)
  - Otros organizadores de fotos
