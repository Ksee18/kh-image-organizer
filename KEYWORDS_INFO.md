# Ubicación del archivo Keywords.xml

El archivo **Keywords.xml** es el archivo personal de cada usuario donde se guardan las categorías y etiquetas personalizadas.

## Ubicación del archivo según el sistema operativo:

### Windows:
```
%APPDATA%\kh_image_organizer\Keywords.xml
```

Ruta completa típica:
```
C:\Users\[TU_USUARIO]\AppData\Roaming\kh_image_organizer\Keywords.xml
```

### Acceso rápido en Windows:
1. Presiona `Win + R`
2. Escribe: `%APPDATA%\kh_image_organizer`
3. Presiona Enter
4. Ahí encontrarás el archivo `Keywords.xml`

## Características del archivo:

- **Primera vez**: Se crea automáticamente VACÍO cuando abres la sidebar de etiquetas
- **Formato**: XML con estructura de categorías (`<set>`) y etiquetas (`<item>`)
- **Modificable**: Puedes editar manualmente el XML si lo deseas
- **Exportable**: Puedes copiar este archivo para respaldo o compartir entre equipos
- **Importable**: Puedes reemplazar este archivo con uno de otro equipo

## Estructura del XML:

```xml
<?xml version="1.0" encoding="UTF-8" standalone="yes" ?>
<keywords version="2">
	<set name="Categoría 1" disclosed="true">
		<item name="Etiqueta 1" />
		<item name="Etiqueta 2" />
	</set>
	<set name="Categoría 2" disclosed="true">
		<item name="Etiqueta A" />
		<item name="Etiqueta B" />
	</set>
</keywords>
```

## Para pruebas rápidas:

Si quieres reemplazar el archivo para hacer pruebas, puedes:
1. Copiar el archivo de ejemplo de `assets/Keywords.xml`
2. Pegarlo en `%APPDATA%\kh_image_organizer\Keywords.xml` (reemplazar)
3. Reiniciar la aplicación o cerrar/abrir la sidebar de etiquetas

## Respaldo y exportación:

Para guardar tus keywords personalizadas:
1. Navega a `%APPDATA%\kh_image_organizer\`
2. Copia el archivo `Keywords.xml`
3. Guárdalo en una ubicación segura (nube, USB, etc.)

Para restaurar en otro equipo:
1. Instala la aplicación en el nuevo equipo
2. Copia tu archivo `Keywords.xml` respaldado
3. Pégalo en `%APPDATA%\kh_image_organizer\` del nuevo equipo
