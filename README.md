# Rikuest - REST API Client

A modern, elegant REST API client built with Go and Vue.js, similar to Insomnia or Postman. Store and organize your API requests with project-based collections, execute HTTP requests, and view detailed responses.

## Features

### Core Features
- 🚀 **Fast and Lightweight**: Built with Go backend and Vue3 frontend
- 📁 **Project Organization**: Organize requests into projects
- 🔄 **HTTP Methods**: Support for GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS
- 📝 **Request Builder**: Easy-to-use interface for building HTTP requests
- 🎯 **Response Viewer**: Formatted JSON and text response display
- 📊 **Headers Management**: Add custom headers to requests
- 📋 **Request Body**: Support for JSON, text, and form data
- 🕒 **Request History**: Track execution history for each request
- 💾 **SQLite Storage**: All data stored locally in SQLite database

### Interface Features
- 🎨 **Modern UI**: Clean, elegant interface built with Element Plus
- 📱 **Responsive Design**: Optimized layout for different screen sizes
- ⚡ **Real-time Updates**: Instant feedback and updates
- 🌈 **Status Indicators**: Color-coded HTTP status responses
- 📏 **Response Metrics**: Duration, size, and status information

## Getting Started

### Prerequisites
- Go 1.21 or higher
- Node.js 16+ (for development)
- npm or yarn (for development)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd rikuest
```

2. Build the application:
```bash
make build
```

3. Run the application:
```bash
./bin/rikuest
```

The application will start on http://localhost:8080

### Development

For development mode with hot reloading:

1. Install dependencies:
```bash
make deps
```

2. Start the backend:
```bash
make dev
```

3. In a separate terminal, start the frontend development server:
```bash
cd frontend
npm run dev
```

## Usage

### Creating Projects
1. Click "New Project" from the home page
2. Enter a project name and optional description
3. Click "Create" to create your project

### Creating Requests
1. Navigate to a project
2. Click "New Request"
3. Fill in the request details (name, method, URL)
4. Click "Create"

### Building Requests
1. Select a request from the sidebar
2. Configure the HTTP method and URL
3. Add headers in the Headers tab
4. Add request body in the Body tab (JSON, text, or form data)
5. Click "Send" to execute the request

### Viewing Responses
- Response body is displayed with syntax highlighting for JSON
- Response headers are shown in a separate tab
- Status code, response time, and size are displayed
- Request history shows previous executions

## Project Structure

```
rikuest/
├── cmd/server/          # Main application entry point
├── internal/
│   ├── database/        # SQLite database operations
│   ├── handlers/        # HTTP request handlers
│   └── models/          # Data models
├── frontend/            # Vue.js frontend application
│   ├── src/
│   │   ├── components/  # Vue components
│   │   ├── stores/      # Pinia state management
│   │   └── views/       # Page components
├── Makefile            # Build automation
└── README.md
```

## API Endpoints

The backend provides REST API endpoints for:

- `GET /api/projects` - List all projects
- `POST /api/projects` - Create a new project
- `GET /api/projects/:id` - Get project details
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project
- `GET /api/projects/:id/requests` - List requests in project
- `POST /api/requests` - Create a new request
- `GET /api/requests/:id` - Get request details
- `PUT /api/requests/:id` - Update request
- `DELETE /api/requests/:id` - Delete request
- `POST /api/requests/:id/execute` - Execute request
- `GET /api/requests/:id/history` - Get request history

## Building and Distribution

### Build for Production
```bash
make build
```

This creates a single binary at `bin/rikuest` that includes the embedded frontend.

### Cross-compilation
```bash
# For Linux
GOOS=linux GOARCH=amd64 go build -o bin/rikuest-linux ./cmd/server

# For Windows
GOOS=windows GOARCH=amd64 go build -o bin/rikuest-windows.exe ./cmd/server

# For macOS
GOOS=darwin GOARCH=amd64 go build -o bin/rikuest-macos ./cmd/server
```

## License

MIT License - see LICENSE file for details.