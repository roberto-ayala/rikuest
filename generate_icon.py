#!/usr/bin/env python3
"""
Script para generar íconos de la aplicación desde el SVG
Genera íconos con fondo negro y símbolo blanco para todas las plataformas

Renderiza el path SVG del rayo usando cairosvg si está disponible (mejor calidad),
o renderizado manual como fallback.
"""
import os
import sys
from PIL import Image, ImageDraw

# Intentar importar cairosvg
try:
    import cairosvg
    CAIROSVG_AVAILABLE = True
except ImportError:
    CAIROSVG_AVAILABLE = False

def render_zap_icon_manual(size):
    """
    Renderiza el ícono zap (rayo) manualmente (fallback)
    Basado en el path SVG original con padding
    """
    img = Image.new('RGBA', (size, size), 'black')
    draw = ImageDraw.Draw(img)
    
    # Agregar padding igual que en la versión SVG
    padding = 3
    content_size = 24
    viewBox_size = content_size + (padding * 2)  # 30x30
    
    # Escalar basado en el viewBox con padding
    scale = size / viewBox_size
    
    # Ajustar el desplazamiento para el padding
    offset_x = padding * scale
    offset_y = padding * scale
    
    stroke_width = max(int(2.3 * scale), 4)
    
    # Puntos del path SVG interpretado (con offset para padding)
    points = [
        (int(offset_x + 4 * scale), int(offset_y + 14 * scale)),
        (int(offset_x + 3.22 * scale), int(offset_y + 12.37 * scale)),
        (int(offset_x + 13.12 * scale), int(offset_y + 2.17 * scale)),
        (int(offset_x + 13.98 * scale), int(offset_y + 2.63 * scale)),
        (int(offset_x + 12.06 * scale), int(offset_y + 8.65 * scale)),
        (int(offset_x + 13 * scale), int(offset_y + 10 * scale)),
        (int(offset_x + 20 * scale), int(offset_y + 10 * scale)),
        (int(offset_x + 20.78 * scale), int(offset_y + 11.63 * scale)),
        (int(offset_x + 10.88 * scale), int(offset_y + 21.83 * scale)),
        (int(offset_x + 10.02 * scale), int(offset_y + 21.37 * scale)),
        (int(offset_x + 11.94 * scale), int(offset_y + 15.35 * scale)),
        (int(offset_x + 11 * scale), int(offset_y + 14 * scale)),
    ]
    
    # Dibujar líneas con extremos redondeados
    radius = stroke_width // 2
    
    for i in range(len(points) - 1):
        p1 = points[i]
        p2 = points[i + 1]
        draw.line([p1, p2], fill='white', width=stroke_width)
        
        # Círculos en puntos intermedios
        if i < len(points) - 1:
            x, y = p2
            draw.ellipse([x - radius, y - radius, x + radius, y + radius], fill='white')
    
    # Círculos en extremos
    for point in [points[0], points[-1]]:
        x, y = point
        draw.ellipse([x - radius, y - radius, x + radius, y + radius], fill='white')
    
    return img

def generate_icon(output_path, size=1024):
    """Genera un ícono PNG con fondo negro y símbolo blanco"""
    try:
        if CAIROSVG_AVAILABLE:
            # Método preferido: usar cairosvg para renderizado SVG perfecto
            # Agregar padding: usar un viewBox más grande (30x30) con el símbolo centrado
            # El viewBox original es 0 0 24 24, vamos a agregar padding de 3 unidades en cada lado
            padding = 3
            viewBox_size = 24 + (padding * 2)  # 30x30
            
            svg_content = f'''<svg xmlns="http://www.w3.org/2000/svg" width="{size}" height="{size}" viewBox="0 0 {viewBox_size} {viewBox_size}">
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
            
            cairosvg.svg2png(bytestring=svg_content.encode('utf-8'), 
                           write_to=output_path, 
                           output_width=size, 
                           output_height=size)
            print(f"✓ Generado con cairosvg: {output_path} ({size}x{size})")
            return True
        else:
            # Método fallback: renderizado manual
            print("⚠ cairosvg no disponible, usando renderizado manual...")
            img = render_zap_icon_manual(size)
            img.save(output_path, 'PNG')
            print(f"✓ Generado manualmente: {output_path} ({size}x{size})")
            print("\n💡 Para renderizado SVG perfecto, instala cairosvg:")
            print("   python3 -m venv .venv")
            print("   source .venv/bin/activate")
            print("   pip install cairosvg")
            return True
            
    except Exception as e:
        print(f"✗ Error al generar ícono: {e}")
        import traceback
        traceback.print_exc()
        return False

def generate_all_icons():
    """Genera todos los íconos necesarios para las plataformas"""
    # Crear directorio de build si no existe
    os.makedirs('build', exist_ok=True)
    
    # Generar appicon.png (principal - 1024x1024)
    print("📱 Generando appicon.png (1024x1024)...")
    if generate_icon('build/appicon.png', size=1024):
        print("✓ appicon.png generado correctamente\n")
        return True
    
    return False

if __name__ == '__main__':
    if generate_all_icons():
        print("\n✅ Ícono principal generado exitosamente!")
        print(f"📍 Ubicación: build/appicon.png (1024x1024)")
        if CAIROSVG_AVAILABLE:
            print("✓ Usando cairosvg para renderizado SVG perfecto")
    else:
        print("\n✗ Error al generar el ícono")
        sys.exit(1)
