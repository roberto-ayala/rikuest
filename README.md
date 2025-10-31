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

# 4. Build native desktop app
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
- **Language**: Choose between English, Spanish, French
- **Theme**: Light, dark, or system
- **UI Size**: Adjust text and component sizes
- **Primary Color**: Customize the color scheme
- **Background**: Choose background color themes
- **Layout**: Default or compact layout
- **Response Theme**: Syntax highlighting theme for responses

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
├── generate_icon.py     # Icon generation script
├── generate_all_icons.py # Multi-platform icon generator
└── Makefile            # Build automation
```

## 🛠️ Build Commands

### Web Mode
```bash
make deps              # Install all dependencies
make dev               # Start development server
make build             # Build web application
make web-build         # Alias for build
make clean             # Clean build artifacts
```

### Native Desktop App (Wails)
```bash
make install-wails     # Install Wails CLI (first time only)
make wails-deps        # Install Wails dependencies
make wails-dev         # Development mode with hot-reload
make wails-build       # Build for current platform
make wails-build-prod  # Build for all platforms (Windows, macOS, Linux)
make wails-clean       # Clean Wails build artifacts
```

### Icon Generation
```bash
make generate-icon     # Generate appicon.png (main icon)
make generate-all-icons # Generate icons for all platforms
```

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

The project includes scripts to generate icons from the SVG logo:

### Generate Main Icon
```bash
make generate-icon
```
Generates `build/appicon.png` (1024x1024) with black background and white symbol.

### Generate All Platform Icons
```bash
make generate-all-icons
```
Generates icons for:
- **macOS**: `.icns` file with multiple sizes
- **Windows**: `.ico` file with multiple sizes
- **Linux**: PNG files in standard sizes

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

## 📦 Distribution

### Building for Production

#### Single Platform
```bash
make wails-build
```

#### Multiple Platforms
```bash
make wails-build-prod
```
Builds for Windows (amd64), macOS (amd64, arm64), and Linux (amd64).

### Output Locations
- **macOS**: `build/bin/Rikuest.app`
- **Windows**: `build/bin/rikuest.exe`
- **Linux**: `build/bin/rikuest`

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
- Requires Python 3 with Pillow
- For best quality, install cairosvg: `pip install cairosvg`
- Use virtual environment: `python3 -m venv .venv`

### Wails Build Issues
- Ensure CGO is enabled: `export CGO_ENABLED=1`
- Verify all dependencies: `make wails-deps`
- Clean and rebuild: `make wails-clean && make wails-build`

### Language Not Changing
- Check browser console for errors
- Verify translation files exist in `frontend/src/locales/`
- Clear browser cache/localStorage

## 📚 Additional Documentation

- **`README-WAILS.md`**: Detailed Wails-specific documentation
- **`README_ICONS.md`**: Icon generation guide
- **`CLAUDE.md`**: Development guidelines for AI assistants

## 📄 License

MIT License - see LICENSE file for details.

## 🙏 Acknowledgments

- Built with [Wails](https://wails.io/) for native desktop applications
- UI components inspired by modern design systems
- Icons by [Lucide](https://lucide.dev/)
