param(
    [Parameter(Mandatory=$true)]
    [string]$FolderPath,
    
    [Parameter(Mandatory=$false)]
    [switch]$Descending
)

# Extensiones de imagen permitidas
$imageExtensions = @('.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg', '.ico', '.tiff')

function Get-ExplorerDateOrder {
    param(
        [string]$FilePath
    )
    
    try {
        $file = Get-Item $FilePath -Force
        
        # Obtener todas las fechas posibles
        $creationTime = $file.CreationTimeUtc
        $lastWriteTime = $file.LastWriteTimeUtc
        $lastAccessTime = $file.LastAccessTimeUtc
        
        # Intentar obtener fecha EXIF si es imagen
        try {
            if ($file.Extension -match '\.(jpg|jpeg|tiff|png)$') {
                $exifDate = Get-ExifDate $file.FullName
                if ($exifDate -and $exifDate -ne [DateTime]::MinValue) {
                    return $exifDate
                }
            }
        } catch {
            # Ignorar errores EXIF
        }
        
        # Algoritmo similar al de Windows Explorer:
        # 1. Usar la fecha más reciente entre creación y modificación
        # 2. Para descargas recientes, usar lógica especial
        $latestDate = if ($creationTime -gt $lastWriteTime) { $creationTime } else { $lastWriteTime }
        
        # Ajustar para archivos descargados: agrupar por sesión
        # Esto es una aproximación del comportamiento de Explorer
        $fileAge = (Get-Date).UtcTicks - $creationTime.Ticks
        $oneDayTicks = [TimeSpan]::FromDays(1).Ticks
        
        # Si el archivo es muy reciente (< 24 horas), usar hora de creación
        if ($fileAge -lt $oneDayTicks) {
            return $creationTime
        }
        
        return $latestDate
        
    } catch {
        return $file.LastWriteTimeUtc
    }
}

function Get-ExifDate {
    param([string]$ImagePath)
    
    try {
        # Método alternativo sin librerías externas
        # Para JPEG/TIFF podemos leer bytes directamente
        $bytes = [System.IO.File]::ReadAllBytes($ImagePath)
        
        if ($bytes.Length -gt 2 -and $bytes[0] -eq 0xFF -and $bytes[1] -eq 0xD8) {
            # Es JPEG, buscar segmento EXIF (0xE1)
            for ($i = 2; $i -lt $bytes.Length - 5; $i++) {
                if ($bytes[$i] -eq 0xFF -and $bytes[$i+1] -eq 0xE1) {
                    # Encontrado segmento APP1 (EXIF)
                    # La fecha EXIF está en formato ASCII: "YYYY:MM:DD HH:MM:SS"
                    $hex = [System.BitConverter]::ToString($bytes, $i, 100).Replace("-", "")
                    if ($hex -match "(\d{4}):(\d{2}):(\d{2})\s(\d{2}):(\d{2}):(\d{2})") {
                        try {
                            $dateStr = "$($Matches[1])-$($Matches[2])-$($Matches[3]) $($Matches[4]):$($Matches[5]):$($Matches[6])"
                            return [DateTime]::ParseExact($dateStr, "yyyy-MM-dd HH:mm:ss", [System.Globalization.CultureInfo]::InvariantCulture)
                        } catch {
                            return $null
                        }
                    }
                }
            }
        }
        return $null
    } catch {
        return $null
    }
}

try {
    # Verificar que el directorio existe
    if (-not (Test-Path $FolderPath)) {
        Write-Error "El directorio no existe: $FolderPath"
        exit 1
    }
    
    # Obtener todas las imágenes
    $images = Get-ChildItem -Path $FolderPath -File | 
        Where-Object { 
            $imageExtensions -contains $_.Extension.ToLower() 
        }
    
    # Calcular fecha para ordenación tipo Explorer
    $imagesWithDate = $images | ForEach-Object {
        [PSCustomObject]@{
            Path = $_.FullName
            Name = $_.Name
            ExplorerDate = Get-ExplorerDateOrder $_.FullName
            CreationTime = $_.CreationTimeUtc
            LastWriteTime = $_.LastWriteTimeUtc
        }
    }
    
    # Ordenar por la fecha calculada
    if ($Descending) {
        $sorted = $imagesWithDate | Sort-Object ExplorerDate -Descending
    } else {
        $sorted = $imagesWithDate | Sort-Object ExplorerDate
    }
    
    # Devolver solo las rutas en el orden correcto
    $paths = $sorted | ForEach-Object { $_.Path }
    $paths | ConvertTo-Json
    
} catch {
    Write-Error $_.Exception.Message
    exit 1
}