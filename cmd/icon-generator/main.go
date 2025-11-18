package main

import (
	"flag"
	"fmt"
	"image"
	"image/color"
	"image/draw"
	"image/png"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"

	ico "github.com/Kodeworks/golang-image-ico"
	"github.com/srwiley/oksvg"
	"github.com/srwiley/rasterx"
)

const (
	padding     = 3
	viewBoxSize = 24 + (padding * 2) // 30x30
)

// SVG content for the lightning bolt icon
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 30">
    <!-- Fondo negro -->
    <rect width="30" height="30" fill="#000000"/>
    <!-- Símbolo centrado con padding -->
    <g transform="translate(3, 3)">
        <path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z" 
              fill="none" 
              stroke="#FFFFFF" 
              stroke-width="2" 
              stroke-linecap="round" 
              stroke-linejoin="round"/>
    </g>
</svg>`

func generatePNGFromSVG(outputPath string, size int) error {
	// Parse SVG
	icon, err := oksvg.ReadIconStream(strings.NewReader(svgContent))
	if err != nil {
		return fmt.Errorf("error parsing SVG: %w", err)
	}
	icon.SetTarget(0, 0, float64(size), float64(size))

	// Create image
	img := image.NewRGBA(image.Rect(0, 0, size, size))

	// Fill with black background
	draw.Draw(img, img.Bounds(), &image.Uniform{color.RGBA{0, 0, 0, 255}}, image.Point{}, draw.Src)

	// Render SVG
	scanner := rasterx.NewScannerGV(size, size, img, img.Bounds())
	raster := rasterx.NewDasher(size, size, scanner)
	icon.Draw(raster, 1.0)

	// Save PNG
	file, err := os.Create(outputPath)
	if err != nil {
		return fmt.Errorf("error creating file: %w", err)
	}
	defer file.Close()

	if err := png.Encode(file, img); err != nil {
		return fmt.Errorf("error encoding PNG: %w", err)
	}

	return nil
}

func generateAppIcon(outputPath string, size int) error {
	fmt.Printf("\n📱 Generando appicon.png (principal)...\n")

	if err := os.MkdirAll(filepath.Dir(outputPath), 0755); err != nil {
		return fmt.Errorf("error creating directory: %w", err)
	}

	if err := generatePNGFromSVG(outputPath, size); err != nil {
		return fmt.Errorf("error generating icon: %w", err)
	}

	fmt.Printf("  ✓ Generado: %s (%dx%d)\n", outputPath, size, size)
	return nil
}

func generateMacOSIcons(outputDir string) error {
	fmt.Printf("\n🍎 Generando íconos para macOS...\n")

	if err := os.MkdirAll(outputDir, 0755); err != nil {
		return fmt.Errorf("error creating directory: %w", err)
	}

	// Sizes required for macOS .icns
	sizes := []int{16, 32, 64, 128, 256, 512, 1024}

	// Generate individual PNGs first
	iconsetDir := filepath.Join(outputDir, "Rikuest.iconset")
	if err := os.MkdirAll(iconsetDir, 0755); err != nil {
		return fmt.Errorf("error creating iconset directory: %w", err)
	}

	fmt.Printf("  Generando imágenes PNG para iconset...\n")
	for _, size := range sizes {
		// Generate normal size
		pngPath := filepath.Join(iconsetDir, fmt.Sprintf("icon_%dx%d.png", size, size))
		if err := generatePNGFromSVG(pngPath, size); err != nil {
			fmt.Printf("    ✗ Error generando icon_%dx%d.png: %v\n", size, size, err)
			continue
		}
		fmt.Printf("    ✓ icon_%dx%d.png\n", size, size)

		// Generate @2x size (except 1024)
		if size != 1024 {
			png2xPath := filepath.Join(iconsetDir, fmt.Sprintf("icon_%dx%d@2x.png", size, size))
			if err := generatePNGFromSVG(png2xPath, size*2); err != nil {
				fmt.Printf("    ✗ Error generando icon_%dx%d@2x.png: %v\n", size, size, err)
				continue
			}
			fmt.Printf("    ✓ icon_%dx%d@2x.png\n", size, size)
		}
	}

	// Generate .icns using iconutil (only on macOS)
	if runtime.GOOS == "darwin" {
		icnsPath := filepath.Join(outputDir, "Rikuest.icns")
		cmd := exec.Command("iconutil", "-c", "icns", iconsetDir, "-o", icnsPath)
		if err := cmd.Run(); err != nil {
			fmt.Printf("  ✗ Error al generar .icns: %v\n", err)
			fmt.Printf("  ✓ PNGs generados en: %s\n", iconsetDir)
			return fmt.Errorf("iconutil failed: %w", err)
		}

		fmt.Printf("  ✓ Generado: %s\n", icnsPath)

		// Clean up iconset directory
		if err := os.RemoveAll(iconsetDir); err != nil {
			fmt.Printf("  ⚠ Advertencia: no se pudo eliminar el directorio iconset: %v\n", err)
		}
		return nil
	}

	fmt.Printf("  ⚠ iconutil solo está disponible en macOS\n")
	fmt.Printf("  ✓ PNGs generados en: %s\n", iconsetDir)
	fmt.Printf("  💡 Copia el directorio .iconset a macOS y ejecuta:\n")
	fmt.Printf("     iconutil -c icns %s\n", iconsetDir)
	return nil
}

func generateWindowsIcons(outputDir string) error {
	fmt.Printf("\n🪟 Generando íconos para Windows...\n")

	if err := os.MkdirAll(outputDir, 0755); err != nil {
		return fmt.Errorf("error creating directory: %w", err)
	}

	// Sizes for Windows .ico
	sizes := []int{16, 32, 48, 256}

	// Generate individual PNGs
	fmt.Printf("  Generando imágenes PNG...\n")
	var images []image.Image

	for _, size := range sizes {
		pngPath := filepath.Join(outputDir, fmt.Sprintf("icon_%dx%d.png", size, size))
		if err := generatePNGFromSVG(pngPath, size); err != nil {
			fmt.Printf("    ✗ Error generando icon_%dx%d.png: %v\n", size, size, err)
			continue
		}
		fmt.Printf("    ✓ icon_%dx%d.png\n", size, size)

		// Load image for ICO
		file, err := os.Open(pngPath)
		if err != nil {
			continue
		}
		img, _, err := image.Decode(file)
		file.Close()
		if err != nil {
			continue
		}
		images = append(images, img)
	}

	if len(images) == 0 {
		return fmt.Errorf("no se pudieron generar los PNGs")
	}

	// Create .ico file with the largest size (most compatible)
	// Note: The ico library only supports single image encoding
	// Multiple sizes are available as individual PNGs
	icoPath := filepath.Join(outputDir, "rikuest.ico")
	file, err := os.Create(icoPath)
	if err != nil {
		return fmt.Errorf("error creating ICO file: %w", err)
	}
	defer file.Close()

	// Use the largest image for the ICO (most compatible)
	largestImg := images[len(images)-1]
	if err := ico.Encode(file, largestImg); err != nil {
		return fmt.Errorf("error encoding ICO: %w", err)
	}

	fmt.Printf("  ✓ Generado: %s\n", icoPath)
	fmt.Printf("    Tamaño principal: %dx%d\n", largestImg.Bounds().Dx(), largestImg.Bounds().Dy())
	fmt.Printf("    ℹ Nota: Se generaron PNGs individuales en caso de necesitarlos")
	return nil
}

func generateLinuxIcons(outputDir string) error {
	fmt.Printf("\n🐧 Generando íconos para Linux...\n")

	if err := os.MkdirAll(outputDir, 0755); err != nil {
		return fmt.Errorf("error creating directory: %w", err)
	}

	// Standard sizes for Linux
	sizes := []int{16, 24, 32, 48, 64, 96, 128, 256, 512}

	fmt.Printf("  Generando imágenes PNG...\n")
	successCount := 0

	for _, size := range sizes {
		pngPath := filepath.Join(outputDir, fmt.Sprintf("rikuest_%dx%d.png", size, size))
		if err := generatePNGFromSVG(pngPath, size); err != nil {
			fmt.Printf("    ✗ Error generando rikuest_%dx%d.png: %v\n", size, size, err)
			continue
		}
		successCount++
		fmt.Printf("    ✓ rikuest_%dx%d.png\n", size, size)
	}

	if successCount > 0 {
		fmt.Printf("  ✓ Generados %d íconos PNG\n", successCount)
		return nil
	}

	return fmt.Errorf("no se pudieron generar los íconos")
}

func formatSizes(sizes []int) string {
	var parts []string
	for _, size := range sizes {
		parts = append(parts, fmt.Sprintf("%dx%d", size, size))
	}
	return strings.Join(parts, ", ")
}

func generateAllPlatformIcons() error {
	fmt.Println("=" + strings.Repeat("=", 59))
	fmt.Println("🎨 Generador de Íconos Multiplataforma")
	fmt.Println("=" + strings.Repeat("=", 59))

	var results []struct {
		platform string
		success  bool
		err      error
	}

	// Generate main icon
	err := generateAppIcon("build/appicon.png", 1024)
	results = append(results, struct {
		platform string
		success  bool
		err      error
	}{"App Icon", err == nil, err})

	// Generate macOS icons
	err = generateMacOSIcons("build/macos_icons")
	results = append(results, struct {
		platform string
		success  bool
		err      error
	}{"macOS", err == nil, err})

	// Generate Windows icons
	err = generateWindowsIcons("build/windows_icons")
	results = append(results, struct {
		platform string
		success  bool
		err      error
	}{"Windows", err == nil, err})

	// Generate Linux icons
	err = generateLinuxIcons("build/linux_icons")
	results = append(results, struct {
		platform string
		success  bool
		err      error
	}{"Linux", err == nil, err})

	// Summary
	fmt.Println("\n" + "=" + strings.Repeat("=", 59))
	fmt.Println("📊 Resumen de Generación")
	fmt.Println("=" + strings.Repeat("=", 59))

	allSuccess := true
	for _, result := range results {
		status := "✅"
		if !result.success {
			status = "❌"
			allSuccess = false
		}
		fmt.Printf("  %s %s", status, result.platform)
		if result.err != nil {
			fmt.Printf(" (%v)", result.err)
		}
		fmt.Println()
	}

	if allSuccess {
		fmt.Println("\n✅ ¡Todos los íconos generados exitosamente!")
		fmt.Println("\n📍 Ubicaciones:")
		fmt.Println("   - App Icon: build/appicon.png")
		fmt.Println("   - macOS: build/macos_icons/")
		fmt.Println("   - Windows: build/windows_icons/")
		fmt.Println("   - Linux: build/linux_icons/")
		return nil
	}

	fmt.Println("\n⚠ Algunos íconos no se pudieron generar")
	fmt.Println("   Verifica los mensajes de error arriba")
	return fmt.Errorf("algunos íconos fallaron")
}

func main() {
	iconOnly := flag.Bool("icon-only", false, "Generate only the main appicon.png")
	flag.Parse()

	if *iconOnly {
		if err := generateAppIcon("build/appicon.png", 1024); err != nil {
			fmt.Printf("✗ Error: %v\n", err)
			os.Exit(1)
		}
		fmt.Println("\n✅ Ícono principal generado exitosamente!")
		fmt.Println("📍 Ubicación: build/appicon.png (1024x1024)")
		return
	}

	if err := generateAllPlatformIcons(); err != nil {
		os.Exit(1)
	}
}
