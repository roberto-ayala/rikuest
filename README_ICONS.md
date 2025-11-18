# Generación de Íconos Multiplataforma

## 📋 Descripción

Este proyecto incluye una herramienta en Go para generar íconos de la aplicación para todas las plataformas (macOS, Windows, Linux) desde el archivo SVG original.

## 🎨 Características

- **Fondo negro** con símbolo blanco
- **Padding proporcional** para mejor visualización
- **Renderizado preciso** desde SVG usando bibliotecas Go
- **Soporte multiplataforma** completo
- **Sin dependencias externas** (solo Go)

## 📁 Herramienta Disponible

### `cmd/icon-generator`
Herramienta en Go que genera íconos para todas las plataformas:
- **macOS**: `.icns` con múltiples tamaños
- **Windows**: `.ico` con múltiples tamaños + PNGs individuales
- **Linux**: PNGs en diferentes tamaños estándar

## 🚀 Uso

### Generar Ícono Principal
```bash
# Opción 1: Usar Makefile (recomendado)
make generate-icon

# Opción 2: Ejecutar directamente
go run ./cmd/icon-generator -icon-only
```

### Generar Todos los Íconos
```bash
# Opción 1: Usar Makefile (recomendado)
make generate-all-icons

# Opción 2: Ejecutar directamente
go run ./cmd/icon-generator
```

## 📦 Requisitos

### Requeridos
- **Go 1.22+**: Para compilar y ejecutar la herramienta
- Las dependencias se instalan automáticamente con `go mod download`

### Herramientas del Sistema
- **iconutil** (macOS): Para generar archivos `.icns`
  - Ya incluido en macOS
  - La herramienta lo usa automáticamente

## 📂 Estructura de Archivos Generados

```
build/
├── appicon.png                    # Ícono principal (1024x1024)
├── macos_icons/
│   ├── Rikuest.icns               # Archivo .icns para macOS
│   └── icon_*.png                 # PNGs individuales
├── windows_icons/
│   ├── rikuest.ico                # Archivo .ico para Windows
│   └── icon_*.png                 # PNGs individuales (16, 32, 48, 256)
└── linux_icons/
    └── rikuest_*.png              # PNGs para Linux (9 tamaños)
```

## 🎯 Tamaños Generados

### macOS (.icns)
- 16x16, 32x32, 64x64, 128x128, 256x256, 512x512, 1024x1024
- Versiones @2x para pantallas Retina

### Windows (.ico)
- 16x16, 32x32, 48x48, 256x256
- PNGs individuales disponibles

### Linux (.png)
- 16x16, 24x24, 32x32, 48x48, 64x64, 96x96, 128x128, 256x256, 512x512

## 🔧 Integración con Wails

Wails usa automáticamente `build/appicon.png` para generar los íconos de la aplicación:

```bash
# Compilar con ícono generado automáticamente
make wails-build

# Build automático incluye generación del ícono
make wails-build-prod
```

## 📝 Notas Técnicas

### Renderizado SVG
- **Renderizado nativo**: Usa bibliotecas Go (`oksvg` y `rasterx`) para renderizado preciso del SVG
- **Calidad**: Renderizado de alta calidad sin dependencias externas

### Padding
- Padding configurado: **3 unidades** en cada lado
- ViewBox: `0 0 30 30` (original: `0 0 24 24`)
- Símbolo centrado con mejor proporción visual

### Colores
- **Fondo**: Negro (#000000)
- **Símbolo**: Blanco (#FFFFFF)
- **Renderizado**: Desde SVG embebido en el código

### Grosor del Trazo (Stroke Width)
- **Valor actual**: 50 (configurado para un aspecto más grueso y visible)
- **Ubicación**: Definido en `stroke-width` del SVG embebido en `cmd/icon-generator/main.go`
- **Personalización**: Puedes ajustar el valor de `stroke-width` en el SVG para cambiar el grosor de la línea del rayo

## 🐛 Solución de Problemas

### Error: iconutil no encontrado
- Solo disponible en macOS
- En otros sistemas, se generan solo los PNGs
- Copia el directorio `.iconset` a macOS para generar el `.icns`

### .ico con un solo tamaño
- La biblioteca ICO de Go guarda el tamaño más grande en el archivo .ico
- Los PNGs individuales están disponibles para todos los tamaños
- Puedes usar herramientas externas como ImageMagick para combinar múltiples tamaños:
  ```bash
  convert icon_*.png rikuest.ico
  ```

### Error de compilación
Si encuentras errores al compilar, asegúrate de tener las dependencias actualizadas:
```bash
go mod download
go mod tidy
```

## ✅ Comandos Completos

```bash
# Generar todos los íconos
make generate-all-icons

# Generar solo el ícono principal
make generate-icon

# Compilar aplicación con íconos
make wails-build
```

