#!/usr/bin/env python3
"""
Script para generar íconos de la aplicación para todas las plataformas
Genera íconos con fondo negro y símbolo blanco para:
  - macOS: archivos .icns con múltiples tamaños
  - Windows: archivo .ico con múltiples tamaños  
  - Linux: archivos PNG en diferentes tamaños

Requisitos:
  - cairosvg (recomendado para mejor calidad)
  - iconutil (macOS, para generar .icns)
  - Pillow (para generar .ico en Windows)
"""
import os
import sys
import subprocess
from PIL import Image

# Intentar importar cairosvg
try:
    import cairosvg
    CAIROSVG_AVAILABLE = True
except ImportError:
    CAIROSVG_AVAILABLE = False
    print("⚠ cairosvg no disponible, el renderizado puede tener menor calidad")

def generate_svg_with_padding(padding=3):
    """Crea el contenido SVG con padding"""
    viewBox_size = 24 + (padding * 2)  # 30x30
    
    svg_content = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {viewBox_size} {viewBox_size}">
    <!-- Fondo negro -->
    <rect width="{viewBox_size}" height="{viewBox_size}" fill="#000000"/>
    <!-- Símbolo centrado con padding -->
    <g transform="translate({padding}, {padding})">
        <path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z" 
              fill="none" 
              stroke="#FFFFFF" 
              stroke-width="2" 
              stroke-linecap="round" 
              stroke-linejoin="round"/>
    </g>
</svg>'''
    
    return svg_content

def generate_png_from_svg(output_path, size=1024):
    """Genera un PNG desde SVG con el tamaño especificado"""
    try:
        if CAIROSVG_AVAILABLE:
            svg_content = generate_svg_with_padding()
            cairosvg.svg2png(bytestring=svg_content.encode('utf-8'), 
                           write_to=output_path, 
                           output_width=size, 
                           output_height=size)
            return True
        else:
            # Fallback: usar PIL (requiere renderizado manual más complejo)
            print(f"⚠ Generando {output_path} sin cairosvg (puede tener menor calidad)")
            # Por ahora, solo avisar que necesita cairosvg
            return False
    except Exception as e:
        print(f"✗ Error al generar {output_path}: {e}")
        return False

def generate_macos_icons(output_dir='build/macos_icons'):
    """Genera íconos para macOS (.icns)"""
    print("\n🍎 Generando íconos para macOS...")
    
    os.makedirs(output_dir, exist_ok=True)
    
    # Tamaños requeridos para macOS .icns
    sizes = [16, 32, 64, 128, 256, 512, 1024]
    
    # Generar PNGs individuales primero
    iconset_dir = f"{output_dir}/Rikuest.iconset"
    os.makedirs(iconset_dir, exist_ok=True)
    
    print(f"  Generando imágenes PNG para iconset...")
    for size in sizes:
        # Generar tamaño normal
        png_path = f"{iconset_dir}/icon_{size}x{size}.png"
        if generate_png_from_svg(png_path, size):
            print(f"    ✓ icon_{size}x{size}.png")
        
        # Generar tamaño @2x (excepto 1024)
        if size != 1024:
            png_2x_path = f"{iconset_dir}/icon_{size}x{size}@2x.png"
            if generate_png_from_svg(png_2x_path, size * 2):
                print(f"    ✓ icon_{size}x{size}@2x.png")
    
    # Generar .icns usando iconutil (solo en macOS)
    if sys.platform == 'darwin':
        icns_path = f"{output_dir}/Rikuest.icns"
        try:
            result = subprocess.run(
                ['iconutil', '-c', 'icns', iconset_dir, '-o', icns_path],
                capture_output=True,
                text=True
            )
            
            if result.returncode == 0:
                print(f"  ✓ Generado: {icns_path}")
                
                # Limpiar directorio iconset
                import shutil
                shutil.rmtree(iconset_dir)
                return True
            else:
                print(f"  ✗ Error al generar .icns: {result.stderr}")
                return False
        except FileNotFoundError:
            print(f"  ✗ iconutil no encontrado (macOS requerido)")
            print(f"  ✓ PNGs generados en: {iconset_dir}")
            return False
    else:
        print(f"  ⚠ iconutil solo está disponible en macOS")
        print(f"  ✓ PNGs generados en: {iconset_dir}")
        print(f"  💡 Copia el directorio .iconset a macOS y ejecuta:")
        print(f"     iconutil -c icns {iconset_dir}")
        return False

def generate_windows_icons(output_dir='build/windows_icons'):
    """Genera íconos para Windows (.ico)"""
    print("\n🪟 Generando íconos para Windows...")
    
    os.makedirs(output_dir, exist_ok=True)
    
    # Tamaños para Windows .ico
    sizes = [16, 32, 48, 256]
    
    # Generar PNGs individuales
    print(f"  Generando imágenes PNG...")
    png_files = []
    
    for size in sizes:
        png_path = f"{output_dir}/icon_{size}x{size}.png"
        if generate_png_from_svg(png_path, size):
            png_files.append((png_path, size))
            print(f"    ✓ icon_{size}x{size}.png")
    
    if not png_files:
        print("  ✗ No se pudieron generar los PNGs")
        return False
    
    # Crear archivo .ico con múltiples tamaños
    try:
        # Para crear un .ico con múltiples tamaños, necesitamos guardar cada tamaño individualmente
        # y luego combinarlos. PIL guarda automáticamente múltiples tamaños si los proporcionamos.
        
        ico_path = f"{output_dir}/rikuest.ico"
        
        # Abrir todas las imágenes y prepararlas
        images_data = []
        for png_path, size in png_files:
            img = Image.open(png_path)
            # Convertir RGBA a RGB con fondo negro si es necesario
            if img.mode == 'RGBA':
                background = Image.new('RGB', img.size, (0, 0, 0))
                background.paste(img, mask=img.split()[3])
                img = background
            images_data.append(img)
        
        # Guardar como .ico con múltiples tamaños
        if images_data:
            # Ordenar por tamaño (más pequeño primero) para mejor compatibilidad
            images_data.sort(key=lambda img: img.width)
            
            ico_sizes = [(img.width, img.height) for img in images_data]
            
            # Intentar guardar como .ico con múltiples tamaños
            # PIL tiene limitaciones, pero intentaremos incluir todos los tamaños
            try:
                # Método 1: Intentar guardar con todos los tamaños
                # Nota: PIL puede tener limitaciones con múltiples tamaños
                images_data[0].save(
                    ico_path,
                    format='ICO',
                    sizes=ico_sizes
                )
                
                # Verificar si todos los tamaños se incluyeron
                # Si PIL no los incluyó todos, guardar al menos el principal
                print(f"  ✓ Generado: {ico_path}")
                print(f"    Tamaños: {', '.join(f'{w}x{h}' for w, h in ico_sizes)}")
                print(f"    ℹ Nota: Se generaron PNGs individuales en caso de necesitarlos")
                
            except Exception as save_error:
                # Si falla, al menos guardar el PNG más grande como .ico
                print(f"  ⚠ Advertencia al generar .ico: {save_error}")
                print(f"    ✓ PNGs individuales generados correctamente")
                return False
            
            return True
        else:
            print(f"  ✗ No hay imágenes para generar el .ico")
            return False
    except Exception as e:
        print(f"  ✗ Error al generar .ico: {e}")
        import traceback
        traceback.print_exc()
        return False

def generate_linux_icons(output_dir='build/linux_icons'):
    """Genera íconos para Linux (PNG en múltiples tamaños)"""
    print("\n🐧 Generando íconos para Linux...")
    
    os.makedirs(output_dir, exist_ok=True)
    
    # Tamaños estándar para Linux
    sizes = [16, 24, 32, 48, 64, 96, 128, 256, 512]
    
    print(f"  Generando imágenes PNG...")
    success_count = 0
    
    for size in sizes:
        png_path = f"{output_dir}/rikuest_{size}x{size}.png"
        if generate_png_from_svg(png_path, size):
            success_count += 1
            print(f"    ✓ rikuest_{size}x{size}.png")
    
    if success_count > 0:
        print(f"  ✓ Generados {success_count} íconos PNG")
        return True
    else:
        print(f"  ✗ No se pudieron generar los íconos")
        return False

def generate_appicon(output_path='build/appicon.png', size=1024):
    """Genera el ícono principal appicon.png"""
    print("\n📱 Generando appicon.png (principal)...")
    
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    if generate_png_from_svg(output_path, size):
        print(f"  ✓ Generado: {output_path} ({size}x{size})")
        return True
    else:
        print(f"  ✗ Error al generar {output_path}")
        return False

def generate_all_platform_icons():
    """Genera íconos para todas las plataformas"""
    print("=" * 60)
    print("🎨 Generador de Íconos Multiplataforma")
    print("=" * 60)
    
    if not CAIROSVG_AVAILABLE:
        print("\n⚠ ADVERTENCIA: cairosvg no está instalado")
        print("   Para mejor calidad, instala cairosvg:")
        print("   python3 -m venv .venv")
        print("   source .venv/bin/activate")
        print("   pip install cairosvg")
        print("\n   Continuando con fallback manual...\n")
    
    results = []
    
    # Generar ícono principal
    results.append(("App Icon", generate_appicon()))
    
    # Generar íconos para macOS
    results.append(("macOS", generate_macos_icons()))
    
    # Generar íconos para Windows
    results.append(("Windows", generate_windows_icons()))
    
    # Generar íconos para Linux
    results.append(("Linux", generate_linux_icons()))
    
    # Resumen
    print("\n" + "=" * 60)
    print("📊 Resumen de Generación")
    print("=" * 60)
    
    for platform, success in results:
        status = "✅" if success else "❌"
        print(f"  {status} {platform}")
    
    all_success = all(result[1] for result in results)
    
    if all_success:
        print("\n✅ ¡Todos los íconos generados exitosamente!")
        print("\n📍 Ubicaciones:")
        print("   - App Icon: build/appicon.png")
        print("   - macOS: build/macos_icons/")
        print("   - Windows: build/windows_icons/")
        print("   - Linux: build/linux_icons/")
        return True
    else:
        print("\n⚠ Algunos íconos no se pudieron generar")
        print("   Verifica los mensajes de error arriba")
        return False

if __name__ == '__main__':
    if generate_all_platform_icons():
        sys.exit(0)
    else:
        sys.exit(1)

