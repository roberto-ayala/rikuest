# Generación de Íconos Multiplataforma

## 📋 Descripción

Este proyecto incluye scripts para generar íconos de la aplicación para todas las plataformas (macOS, Windows, Linux) desde el archivo SVG original.

## 🎨 Características

- **Fondo negro** con símbolo blanco
- **Padding proporcional** para mejor visualización
- **Renderizado preciso** desde SVG usando cairosvg
- **Soporte multiplataforma** completo

## 📁 Scripts Disponibles

### 1. `generate_icon.py`
Genera solo el ícono principal `appicon.png` (1024x1024)
```bash
make generate-icon
```

### 2. `generate_all_icons.py`
Genera íconos para todas las plataformas:
- **macOS**: `.icns` con múltiples tamaños
- **Windows**: `.ico` con múltiples tamaños + PNGs individuales
- **Linux**: PNGs en diferentes tamaños estándar

```bash
make generate-all-icons
```

## 🚀 Uso

### Generar Ícono Principal
```bash
# Opción 1: Usar Makefile
make generate-icon

# Opción 2: Ejecutar directamente
source .venv/bin/activate
python3 generate_icon.py
```

### Generar Todos los Íconos
```bash
# Opción 1: Usar Makefile
make generate-all-icons

# Opción 2: Ejecutar directamente
source .venv/bin/activate
python3 generate_all_icons.py
```

## 📦 Requisitos

### Requeridos
- Python 3.x
- Pillow (PIL)

### Opcionales (Recomendado)
- **cairosvg**: Para renderizado SVG perfecto
  ```bash
  python3 -m venv .venv
  source .venv/bin/activate
  pip install cairosvg
  ```

### Herramientas del Sistema
- **iconutil** (macOS): Para generar archivos `.icns`
  - Ya incluido en macOS
  - El script lo usa automáticamente

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
- **Con cairosvg**: Renderizado perfecto del path SVG original
- **Sin cairosvg**: Renderizado manual con calidad aceptable

### Padding
- Padding configurado: **3 unidades** en cada lado
- ViewBox: `0 0 30 30` (original: `0 0 24 24`)
- Símbolo centrado con mejor proporción visual

### Colores
- **Fondo**: Negro (#000000)
- **Símbolo**: Blanco (#FFFFFF)
- **Renderizado**: Desde SVG original (`frontend/public/logo.svg`)

## 🐛 Solución de Problemas

### Error: cairosvg no encontrado
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install cairosvg
```

### Error: iconutil no encontrado
- Solo disponible en macOS
- En otros sistemas, se generan solo los PNGs
- Copia el directorio `.iconset` a macOS para generar el `.icns`

### .ico con un solo tamaño
- PIL tiene limitaciones con múltiples tamaños
- Los PNGs individuales están disponibles
- Puedes usar herramientas externas como ImageMagick para combinar:
  ```bash
  convert icon_*.png rikuest.ico
  ```

## ✅ Comandos Completos

```bash
# Configurar entorno (solo primera vez)
python3 -m venv .venv
source .venv/bin/activate
pip install cairosvg Pillow

# Generar todos los íconos
make generate-all-icons

# Compilar aplicación con íconos
make wails-build
```

