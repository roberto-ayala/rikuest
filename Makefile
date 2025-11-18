.PHONY: build dev clean frontend backend wails-build wails-dev wails-init wails-deps install-wails web-dev web-build

# ===== WEB MODE (HTTP REST API) =====

# Development mode - Web with HTTP REST API
web-dev: dev

# Traditional development mode with HTTP REST API (watch changes)
dev:
	gow run ./cmd/server/main.go

frontend-dev:
	cd frontend && npm run dev

# Build web app (traditional HTTP REST API + frontend)
web-build: build

# Build everything (traditional web app)
build: frontend backend

# Build frontend
frontend:
	cd frontend && npm install && npm run build

# Build backend
backend:
	go build -o bin/rikuest ./cmd/server

# ===== NATIVE MODE (Wails with Go bindings) =====

# Development mode - Native app with Wails bindings
wails-dev: wails-deps frontend
	wails dev

# Generate app icon from SVG (solo appicon.png)
generate-icon:
	@go run ./cmd/icon-generator -icon-only

# Generate all icons for all platforms (macOS, Windows, Linux)
generate-all-icons:
	@go run ./cmd/icon-generator

# Build native app with Wails bindings
wails-build: wails-deps generate-icon
	wails build

# Build native app for production (multiple platforms)
wails-build-prod: wails-deps generate-icon frontend
	wails build -clean -platform windows/amd64,darwin/amd64,darwin/arm64,linux/amd64

# Clean build artifacts
clean:
	rm -rf bin/
	rm -rf frontend/dist/
	rm -f rikuest.db

# Install dependencies
deps:
	go mod download
	cd frontend && npm install

# Run the built binary
run:
	./bin/rikuest

# Initialize Wails project (run once)
wails-init:
	wails init -n rikuest -t vanilla -d .

# Install Wails CLI
install-wails:
	go install github.com/wails-io/wails/v2/cmd/wails@latest

# Install Wails dependencies and ensure Go modules are updated
wails-deps:
	go mod tidy
	cd frontend && npm install

# Generate Wails bindings (TypeScript definitions for frontend)
wails-generate:
	wails generate module

# Clean all build artifacts including Wails
wails-clean: clean
	rm -rf build/bin/
	rm -rf build/darwin/
	rm -rf build/windows/
	rm -rf build/linux/

# Package native app for distribution
wails-package: wails-build-prod
	@echo "Native applications built for multiple platforms:"
	@ls -la build/bin/ || echo "No binaries found in build/bin/"

# Remove quarantine attribute from macOS app (allows execution without signing)
# Use this before distributing to other users
wails-remove-quarantine:
	@if [ -d "build/bin/Rikuest-arm64.app" ]; then \
		xattr -d com.apple.quarantine build/bin/Rikuest-arm64.app 2>/dev/null || true; \
		echo "Removed quarantine from Rikuest-arm64.app"; \
	fi
	@if [ -d "build/bin/Rikuest-amd64.app" ]; then \
		xattr -d com.apple.quarantine build/bin/Rikuest-amd64.app 2>/dev/null || true; \
		echo "Removed quarantine from Rikuest-amd64.app"; \
	fi
	@if [ -d "build/bin/Rikuest.app" ]; then \
		xattr -d com.apple.quarantine build/bin/Rikuest.app 2>/dev/null || true; \
		echo "Removed quarantine from Rikuest.app"; \
	fi

# Sign macOS app with ad-hoc signature (allows execution without developer certificate)
# This is a temporary solution for distribution without a paid Apple Developer account
wails-sign-adhoc:
	@if [ -d "build/bin/Rikuest-arm64.app" ]; then \
		codesign --force --deep --sign - build/bin/Rikuest-arm64.app; \
		echo "Signed Rikuest-arm64.app with ad-hoc signature"; \
	fi
	@if [ -d "build/bin/Rikuest-amd64.app" ]; then \
		codesign --force --deep --sign - build/bin/Rikuest-amd64.app; \
		echo "Signed Rikuest-amd64.app with ad-hoc signature"; \
	fi
	@if [ -d "build/bin/Rikuest.app" ]; then \
		codesign --force --deep --sign - build/bin/Rikuest.app; \
		echo "Signed Rikuest.app with ad-hoc signature"; \
	fi

# Sign macOS app with Developer ID (requires paid Apple Developer account)
# Usage: make wails-sign-dev CERT="Developer ID Application: Your Name"
wails-sign-dev:
	@if [ -z "$(CERT)" ]; then \
		echo "Error: CERT variable required. Usage: make wails-sign-dev CERT=\"Developer ID Application: Your Name\""; \
		exit 1; \
	fi
	@if [ -d "build/bin/Rikuest-arm64.app" ]; then \
		codesign --force --deep --sign "$(CERT)" build/bin/Rikuest-arm64.app; \
		echo "Signed Rikuest-arm64.app with $(CERT)"; \
	fi
	@if [ -d "build/bin/Rikuest-amd64.app" ]; then \
		codesign --force --deep --sign "$(CERT)" build/bin/Rikuest-amd64.app; \
		echo "Signed Rikuest-amd64.app with $(CERT)"; \
	fi
	@if [ -d "build/bin/Rikuest.app" ]; then \
		codesign --force --deep --sign "$(CERT)" build/bin/Rikuest.app; \
		echo "Signed Rikuest.app with $(CERT)"; \
	fi

# Prepare macOS app for distribution (remove quarantine + ad-hoc sign)
wails-prepare-macos: wails-remove-quarantine wails-sign-adhoc
	@echo "macOS app prepared for distribution"