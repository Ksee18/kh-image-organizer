param(
    [Parameter(Mandatory=$true)]
    [string]$sourceDir
)

# Función para obtener el año de la fecha más antigua entre la creación y modificación
function Get-Year {
    param (
        [datetime]$creationTime,
        [datetime]$modificationTime
    )

    if ($creationTime -lt $modificationTime) {
        return $creationTime.Year
    } else {
        return $modificationTime.Year
    }
}

# Extensiones de imagen soportadas
$imageExtensions = @('.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.tiff', '.tif', '.ico', '.svg')

# Recorre el directorio y evalúa cada archivo de imagen
Get-ChildItem -Path $sourceDir -File | Where-Object { 
    $imageExtensions -contains $_.Extension.ToLower() 
} | ForEach-Object {
    $file = $_
    $year = Get-Year -creationTime $file.CreationTime -modificationTime $file.LastWriteTime
    $yearFolder = Join-Path $sourceDir $year.ToString()

    # Crea la carpeta del año si no existe
    if (-not (Test-Path -Path $yearFolder)) {
        New-Item -ItemType Directory -Path $yearFolder | Out-Null
    }

    # Mueve el archivo a la carpeta correspondiente
    $destination = Join-Path $yearFolder $file.Name
    
    # Si ya existe un archivo con el mismo nombre, agregar un número
    $counter = 1
    while (Test-Path -Path $destination) {
        $nameWithoutExt = [System.IO.Path]::GetFileNameWithoutExtension($file.Name)
        $extension = $file.Extension
        $destination = Join-Path $yearFolder "$nameWithoutExt`_$counter$extension"
        $counter++
    }
    
    Move-Item -Path $file.FullName -Destination $destination -Force
}

Write-Output "Organización de archivos completada."
