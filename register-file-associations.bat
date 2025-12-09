@echo off
echo Registrando asociaciones de archivo para KV Image Organizer...
echo.

REM Obtener la ruta del ejecutable (ajustar según sea necesario)
set "APP_PATH=%~dp0dist\kv_image_organizer.exe"

REM Verificar si el ejecutable existe
if not exist "%APP_PATH%" (
    echo ERROR: No se encontro el ejecutable en: %APP_PATH%
    echo Por favor, compila la aplicacion primero con: npm run build
    pause
    exit /b 1
)

echo Ruta del ejecutable: %APP_PATH%
echo.

REM Registrar asociaciones para diferentes formatos de imagen
echo Registrando .jpg...
assoc .jpg=KVImageOrganizer.Image
ftype KVImageOrganizer.Image="%APP_PATH%" "%%1"

echo Registrando .jpeg...
assoc .jpeg=KVImageOrganizer.Image

echo Registrando .png...
assoc .png=KVImageOrganizer.Image

echo Registrando .gif...
assoc .gif=KVImageOrganizer.Image

echo Registrando .webp...
assoc .webp=KVImageOrganizer.Image

echo Registrando .bmp...
assoc .bmp=KVImageOrganizer.Image

echo Registrando .tiff...
assoc .tiff=KVImageOrganizer.Image

echo Registrando .svg...
assoc .svg=KVImageOrganizer.Image

echo.
echo Asociaciones de archivo registradas exitosamente!
echo Ahora puedes abrir imagenes directamente con doble clic.
echo.
pause
