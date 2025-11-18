# Rikuest - REST API Client

A modern, elegant REST API client built with Go and React, available as both a native desktop application (Wails) and web application. Store and organize your API requests with project-based collections, execute HTTP requests, and view detailed responses.

## ✨ Features

### Core Features
- 🚀 **Fast and Lightweight**: Built with Go backend and React frontend
- 🖥️ **Native Desktop App**: Built with Wails v2 for macOS, Windows, and Linux
- 🌐 **Web Mode**: Also available as a traditional web application
- 📁 **Project Organization**: Organize requests into projects and folders
- 🔄 **HTTP Methods**: Full support for GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS
- 📝 **Request Builder**: Intuitive interface for building HTTP requests
- 🎯 **Response Viewer**: Formatted JSON with syntax highlighting
- 📊 **Advanced Headers**: Custom headers management
- 📋 **Request Body**: Support for JSON, text, form data, and XML
- 🔐 **Authentication**: Bearer tokens, Basic Auth, and API keys
- 🕒 **Request History**: Track execution history for each request
- 💾 **Local Storage**: SQLite database stored in OS-standard data directory
- 📋 **Copy Formats**: Export requests as cURL, JavaScript, Python, and more

### UI Features
- 🎨 **Modern Interface**: Clean, elegant UI built with React and Tailwind CSS
- 🌍 **Multi-language**: Support for English, Spanish, and French
- 🎨 **Theme Customization**: Light, dark, and system theme support
- 🎨 **Color Schemes**: Customizable primary colors and backgrounds
- 📏 **UI Sizing**: Adjustable interface sizes (XS, SM, MD, LG, XL)
- 📐 **Layout Modes**: Default and compact layouts
- 🌈 **Status Indicators**: Color-coded HTTP status responses
- 📊 **Response Metrics**: Duration, size, and status information
- 🎯 **Syntax Highlighting**: Multiple themes for code highlighting
- ⚠️ **Custom Modals**: Beautiful confirmation dialogs instead of native browser alerts
- ⚙️ **Parameters Panel**: Organized settings for request configuration and future options

### Internationalization
- 🇺🇸 **English** - Default language
- 🇪🇸 **Español** - Full translation
- 🇫🇷 **Français** - Full translation
- 🔄 **Auto-detection**: Automatically detects browser language
- 💾 **Persistent**: Language preference saved across sessions

## 🚀 Getting Started

### Prerequisites
- **Go** 1.22+ (with CGO enabled for SQLite)
- **Node.js** 16+ and npm (for frontend development)
- **Wails v2** (for native desktop builds) - Install with `make install-wails`

### Quick Start

#### Native Desktop Application (Recommended)

```bash
# 1. Clone the repository
git clone <repository-url>
cd rikuest

# 2. Install dependencies
make deps

# 3. Generate icons (optional, but recommended)
make generate-icon

# 4. Build native desktop app (frontend build runs automatically)
make wails-build

# 5. Run the application
./build/bin/Rikuest.app/Contents/MacOS/rikuest  # macOS
# or
./build/bin/rikuest.exe  # Windows
```

#### Web Mode

```bash
# 1. Build the web application
make build

# 2. Run the server
./bin/rikuest

# Application will be available at http://localhost:8080
```

## 📖 Usage

### Development Mode

#### Native Desktop App (Wails)
```bash
make wails-dev
```
Starts the native app in development mode with hot-reload.

#### Web Mode
```bash
# Terminal 1: Start backend
make dev

# Terminal 2: Start frontend
cd frontend
npm run dev
```

### Creating Projects
1. Click "New Project" from the home page
2. Enter a project name and optional description
3. Click "Create" to create your project

### Managing Projects
- **Edit Project**: Click the three-dot menu (⋮) on any project card → "Edit Project"
- **Delete Project**: Click the three-dot menu (⋮) on any project card → "Delete Project"
  - A confirmation dialog will appear before deletion

### Organizing Requests
- Create **folders** to organize requests within projects
- **Drag and drop** to reorganize requests
- Use folders to group related API calls

### Building Requests
1. Select or create a request
2. Configure HTTP method and URL
3. Add **headers** in the Headers tab
4. Add **query parameters** in the Query tab
5. Configure **authentication** (Bearer, Basic Auth, etc.)
6. Add **request body** in the Body tab (JSON, text, form data)
7. Click "Execute" to send the request

### Viewing Responses
- Response body with **syntax highlighting** (multiple themes available)
- Response **headers** displayed separately
- **Status code**, response time, and size metrics
- **Request history** showing previous executions
- **Copy response** or export as different formats

### Customization
Access **Settings** (⚙️ icon) to customize:

#### Interface
- **Language**: Choose between English, Spanish, French
- **UI Size**: Adjust text and component sizes (XS, SM, MD, LG, XL)
- **Layout**: Default or compact layout
- **Theme**: Light, dark, or system theme
- **Primary Color**: Customize the color scheme
- **Background**: Choose background color themes
- **Response Theme**: Syntax highlighting theme for responses

#### Parameters
- **Request Timeout**: Configure maximum wait time for HTTP requests (1 second to 3 hours)
  - Default: 5 minutes (300 seconds)
  - Maximum: 3 hours (10800 seconds)
  - Quick presets: 30s, 1m, 2m, 5m, 10m, 15m, 30m, 1h, 2h, 3h

## 🏗️ Project Structure

```
rikuest/
├── cmd/
│   ├── server/          # Web mode entry point
│   └── wails/           # Wails-specific entry point (legacy)
├── internal/
│   ├── database/        # SQLite database operations
│   ├── handlers/         # HTTP request handlers (web mode)
│   ├── models/          # Data models
│   └── services/        # Business logic services
├── frontend/
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── stores/      # Zustand state management
│   │   ├── hooks/       # Custom React hooks
│   │   ├── locales/     # Translation files (i18n)
│   │   ├── views/       # Page components
│   │   └── adapters/    # API adapters (web/wails)
│   ├── dist/            # Built frontend assets
│   └── public/          # Static assets
├── build/               # Build artifacts and icons
├── main.go              # Wails entry point (native desktop)
├── wails.json           # Wails configuration
├── cmd/
│   └── icon-generator/  # Go tool for icon generation
└── Makefile            # Build automation
```

## 🛠️ Build Commands

### Web Mode
```bash
make deps              # Install Go + frontend dependencies
make dev               # Start backend API for web mode
make build             # Build full web bundle (runs frontend build)
make web-build         # Alias for build
make clean             # Clean build artifacts
```

### Native Desktop App (Wails)
```bash
make install-wails     # Install Wails CLI (first time only)
make wails-deps        # Install Wails prerequisites
make wails-dev         # Hot-reload desktop app (builds frontend first)
make wails-build       # Build for current platform (frontend included)
make wails-build-prod  # Build all platforms + frontend
make wails-clean       # Clean Wails build artifacts
make wails-generate    # Generate TypeScript bindings
make wails-package     # Package macOS/Windows/Linux binaries (runs wails-build-prod)
```

### macOS Distribution Preparation
```bash
make wails-prepare-macos      # Prepare app for distribution (remove quarantine + sign)
make wails-remove-quarantine  # Remove quarantine attribute only
make wails-sign-adhoc         # Sign with ad-hoc signature (no certificate needed)
make wails-sign-dev CERT="..." # Sign with Developer ID (requires Apple Developer account)
```

**Note**: Before distributing macOS apps, run `make wails-prepare-macos` to ensure the app can be executed by other users. See `DISTRIBUTION.md` for detailed instructions.

### Icon Generation
```bash
make generate-icon      # Generate appicon.png (1024x1024) from embedded SVG
make generate-all-icons # Generate .icns, .ico & Linux PNGs for all platforms
```

The icon generator is a Go tool located in `cmd/icon-generator/` that renders the lightning bolt icon from an embedded SVG. The icon features:
- **Black background** with white lightning bolt symbol
- **Configurable stroke width** (currently set to 50 for a bold appearance)
- **Proportional padding** for better visual balance
- **No external dependencies** (pure Go implementation)

## 📁 Data Storage

### Database Location
The application stores data in OS-standard directories:

- **macOS**: `~/Library/Application Support/Rikuest/rikuest.db`
- **Windows**: `%USERPROFILE%\AppData\Local\Rikuest\rikuest.db`
- **Linux**: `$XDG_DATA_HOME/rikuest/rikuest.db` or `~/.local/share/rikuest/rikuest.db`

The database is automatically created on first run if it doesn't exist.

## 🌍 Internationalization

### Available Languages
- **🇺🇸 English** - Default
- **🇪🇸 Español** - Full translation
- **🇫🇷 Français** - Full translation

### Changing Language
1. Click the **globe icon** (🌐) in the header for quick access
2. Or go to **Settings → Language** for full options
3. Language preference is saved automatically

### Adding New Languages
1. Create translation file in `frontend/src/locales/[code].json`
2. Add language to `LANGUAGES` in `frontend/src/hooks/useTranslation.js`
3. Follow the structure of existing translation files

## 🎨 Icon Generation

The project includes a Go tool to generate icons from an embedded SVG:

### Generate Main Icon
```bash
make generate-icon
```
Generates `build/appicon.png` (1024x1024) with black background and white lightning bolt symbol.

### Generate All Platform Icons
```bash
make generate-all-icons
```
Generates icons for:
- **macOS**: `.icns` file with multiple sizes (using `iconutil`)
- **Windows**: `.ico` file with multiple sizes
- **Linux**: PNG files in standard sizes

### Icon Tool Details
- **Location**: `cmd/icon-generator/main.go`
- **Technology**: Pure Go implementation using `oksvg` and `rasterx` for SVG rendering
- **Features**: 
  - Black background (#000000)
  - White lightning bolt symbol (#FFFFFF)
  - Configurable stroke width (currently 50 for bold appearance)
  - Proportional padding (3 units on each side)
  - No Python or external dependencies required

See `README_ICONS.md` for detailed icon generation documentation.

## 🎯 API Endpoints (Web Mode)

The backend provides REST API endpoints:

### Projects
- `GET /api/projects` - List all projects
- `POST /api/projects` - Create a new project
- `GET /api/project/:id` - Get project details
- `PUT /api/project/:id` - Update project
- `DELETE /api/project/:id` - Delete project
- `GET /api/project/:id/requests` - List requests in project
- `GET /api/project/:id/folders` - List folders in project

### Folders
- `POST /api/folders` - Create a new folder
- `PUT /api/folder/:id` - Update folder
- `DELETE /api/folder/:id` - Delete folder

### Requests
- `POST /api/requests` - Create a new request
- `GET /api/request/:id` - Get request details
- `PUT /api/request/:id` - Update request
- `DELETE /api/request/:id` - Delete request
- `POST /api/request/:id/execute` - Execute request
- `GET /api/request/:id/history` - Get request history
- `DELETE /api/request/:id/history/:historyId` - Delete history item
- `POST /api/request/move` - Move request to folder
- `GET /api/request/:id/copy` - Get request in various formats
- `GET /api/request/:id/copy-all` - Get all request formats

## 🔧 Configuration

### Wails Configuration (`wails.json`)
- Application metadata
- Window dimensions and behavior
- Frontend and backend paths
- Build options

### Platform-specific Settings
- **macOS**: `build/darwin/Info.plist`
- **Windows**: `build/windows/info.json` and `wails.exe.manifest`
- **Linux**: Default GTK application settings

## 📦 Distribution & Release Workflow

### Building for Production

#### Single Platform
```bash
make wails-build
```

#### Multiple Platforms
```bash
make wails-build-prod
```
Both commands automatically run the frontend build so that `frontend/dist/index.html` exists before Wails compiles the desktop binaries.

### Packaging a Release
Use this checklist whenever you need to publish a new desktop build:

```bash
# 1) Update metadata & version only once in wails.json
#    Go services read config.Version() so everything stays in sync.
vim wails.json

# 2) Refresh icons if logo/padding changed
make generate-icon
make generate-all-icons   # optional but keeps every platform in sync

# 3) Build + package every platform (includes frontend build)
make wails-deps           # first time only
make wails-package
```

`make wails-package` depends on `wails-build-prod`, so the resulting artifacts in `build/bin/` are already named `Rikuest` for macOS (Intel/ARM), Windows, and Linux.

### Output Locations
- **macOS**: `build/bin/Rikuest-arm64.app` (Apple Silicon) or `build/bin/Rikuest-amd64.app` (Intel)
- **Windows**: `build/bin/Rikuest-amd64.exe`
- **Linux**: `build/bin/Rikuest-amd64`

### macOS Distribution

Before sharing macOS applications, prepare them to avoid Gatekeeper issues:

```bash
# Recommended: Prepare app for distribution
make wails-prepare-macos
```

This command:
- Removes the quarantine attribute (added when downloading from internet)
- Signs the app with an ad-hoc signature (allows execution without Apple Developer certificate)

**For detailed distribution instructions**, including troubleshooting "Launch failed" errors, see `DISTRIBUTION.md`.

### Versioning Tips
- Change the application version in a single place: `wails.json` (`info.productVersion` & `fileVersion`). The Go runtime, telemetry, and UI all call `config.Version()`, which reads this file, keeping every layer synchronized.
- After bumping the version, rebuild with `make wails-package` to ensure binary metadata, About dialogs, and telemetry payloads reflect the new value.

## 🧪 Development

### Technology Stack
- **Backend**: Go 1.22+ with Gin web framework
- **Frontend**: React 19+ with Vite, Zustand for state management
- **Database**: SQLite with go-sqlite3 driver
- **Desktop**: Wails v2 for native desktop applications
- **UI**: Tailwind CSS, Headless UI, Lucide React icons
- **i18n**: Custom translation system with React hooks

### Key Dependencies
- `github.com/wailsapp/wails/v2` - Desktop framework
- `github.com/gin-gonic/gin` - Web framework (web mode)
- `github.com/mattn/go-sqlite3` - SQLite driver
- `react`, `react-router-dom`, `zustand` - Frontend core
- `tailwindcss`, `lucide-react` - UI framework

## 🐛 Troubleshooting

### Database Issues
- Database is created automatically in OS data directory
- Check logs for database path on startup
- Ensure write permissions to application data directory

### Icon Generation
- Requires **Go 1.22+** (no Python needed)
- The icon generator is a pure Go tool in `cmd/icon-generator/`
- Uses `oksvg` and `rasterx` for SVG rendering
- For macOS `.icns` generation, requires `iconutil` (included with macOS)
- If icon generation fails, ensure Go dependencies are installed: `go mod download`

### Wails Build Issues
- Ensure CGO is enabled: `export CGO_ENABLED=1`
- Verify all dependencies: `make wails-deps`
- Clean and rebuild: `make wails-clean && make wails-build`
- Ensure frontend is built: `make frontend` before `make wails-build-prod`

### macOS "Launch failed" Error
If users encounter "Launch failed" error when opening the app:
1. **Before distributing**: Run `make wails-prepare-macos` to prepare the app
2. **For users**: See `DISTRIBUTION.md` for detailed solutions
3. **Quick fix**: Right-click app → "Open" → Click "Open" in the dialog

### Language Not Changing
- Check browser console for errors
- Verify translation files exist in `frontend/src/locales/`
- Clear browser cache/localStorage

## 📚 Additional Documentation

- **`README-WAILS.md`**: Detailed Wails-specific documentation
- **`README_ICONS.md`**: Icon generation guide
- **`DISTRIBUTION.md`**: macOS distribution guide and troubleshooting
- **`CLAUDE.md`**: Development guidelines for AI assistants

## 📄 License

MIT License - see LICENSE file for details.

## 🙏 Acknowledgments

- Built with [Wails](https://wails.io/) for native desktop applications
- UI components inspired by modern design systems
- Icons by [Lucide](https://lucide.dev/)
