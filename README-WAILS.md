# Rikuest - Native Desktop Application with Wails

This document provides instructions for building and running Rikuest as a native desktop application using [Wails](https://wails.io/).

## Prerequisites

### Required Software
- [Go](https://golang.org/dl/) 1.21 or later
- [Node.js](https://nodejs.org/) 18 or later
- [Wails CLI](https://wails.io/docs/gettingstarted/installation)

### Platform-specific Requirements

#### macOS
- Xcode Command Line Tools: `xcode-select --install`

#### Windows
- WebView2 runtime (usually pre-installed on Windows 11)
- For building: Microsoft C++ Build Tools

#### Linux
- `libgtk-3-dev libwebkit2gtk-4.0-dev` (Ubuntu/Debian)
- `gtk3-devel webkit2gtk3-devel` (CentOS/RHEL/Fedora)

## Installation

### 1. Install Wails CLI
```bash
make install-wails
```

### 2. Install Project Dependencies
```bash
make wails-deps
```

## Development

### Native Development Mode
Run the application in development mode with hot-reload:
```bash
make wails-dev
```

This will:
- Start the Go backend with API server
- Launch the frontend with Vite dev server
- Open the native desktop application
- Enable hot-reload for both frontend and backend changes

### Traditional Web Development
For web-only development (without native features):
```bash
make dev              # Start backend API server
cd frontend && npm run dev  # Start frontend dev server
```

## Building

### Build for Current Platform
```bash
make wails-build
```

### Build for Multiple Platforms
```bash
make wails-build-prod
```

This creates native applications for:
- Windows (amd64)
- macOS (amd64, arm64)
- Linux (amd64)

### Build Output
Built applications are located in:
- `build/bin/rikuest` (current platform)
- `build/bin/rikuest-{platform}-{arch}/` (multi-platform builds)

## Project Structure

### Wails-specific Files
- `wails.json` - Wails configuration
- `app.go` - Main application struct for Wails
- `cmd/wails/main.go` - Wails-specific entry point
- `build/` - Platform-specific build configurations and assets

### Architecture
The application runs as a native desktop app with:
- **Frontend**: React application served by Wails
- **Backend**: Go API server running on localhost
- **Communication**: REST API calls from frontend to backend
- **Database**: SQLite database file in application directory

## Available Make Commands

| Command | Description |
|---------|-------------|
| `make install-wails` | Install Wails CLI |
| `make wails-deps` | Install all dependencies |
| `make wails-dev` | Run in development mode |
| `make wails-build` | Build for current platform |
| `make wails-build-prod` | Build for multiple platforms |
| `make wails-generate` | Generate TypeScript bindings |
| `make wails-clean` | Clean all build artifacts |
| `make wails-package` | Build and list all platforms |

## Configuration

### Application Settings
Edit `wails.json` to modify:
- Application name and metadata
- Window dimensions and behavior
- Build options
- Frontend and backend paths

### Platform-specific Settings
- **Windows**: `build/windows/info.json`
- **macOS**: `build/darwin/Info.plist`
- **Linux**: Default GTK application settings

## Troubleshooting

### Common Issues

#### "wails: command not found"
```bash
make install-wails
# or manually:
go install github.com/wails-io/wails/v2/cmd/wails@latest
```

#### Build Failures
1. Ensure all prerequisites are installed
2. Clean and rebuild: `make wails-clean && make wails-build`
3. Update dependencies: `make wails-deps`

#### Port Conflicts
The application automatically finds an available port starting from 8080. If issues persist, check for conflicting processes.

### Platform-specific Issues

#### macOS Code Signing
For distribution, you'll need to sign the application:
```bash
codesign --sign "Developer ID Application: Your Name" build/bin/rikuest
```

#### Windows Defender
Windows might flag the unsigned executable. For distribution, consider code signing with a valid certificate.

## Distribution

### Creating Installers
- **Windows**: Use tools like NSIS or Inno Setup
- **macOS**: Create DMG with `create-dmg` or similar tools
- **Linux**: Create AppImage, DEB, or RPM packages

### App Store Distribution
- **Mac App Store**: Requires additional entitlements and sandboxing
- **Microsoft Store**: Requires MSIX packaging

## Development Tips

1. **Live Reload**: Use `make wails-dev` for the best development experience
2. **API Testing**: The backend API is accessible at `http://localhost:8080/api`
3. **Frontend Only**: Use traditional web dev mode for pure frontend work
4. **Debugging**: Use browser dev tools in the Wails application
5. **Logs**: Check console output for backend logs and errors

## Contributing

When contributing to the native application:
1. Test changes in both `make wails-dev` and `make dev` modes
2. Ensure the application works in both web and native environments
3. Update this README for new Wails-specific features