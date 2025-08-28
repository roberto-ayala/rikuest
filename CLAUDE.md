# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Backend (Go)
- `make dev` - Start development server (runs backend on :8080)
- `go run ./cmd/server/main.go` - Alternative way to start backend
- `make backend` - Build Go binary to `bin/rikuest`
- `go build -o bin/rikuest ./cmd/server` - Alternative build command

### Frontend (React)
- `cd frontend && npm run dev` - Start frontend dev server with hot reload (proxies API to backend)
- `cd frontend && npm run build` - Build frontend for production
- `cd frontend && npm install` - Install frontend dependencies

### Full Application
- `make build` - Build both frontend and backend (creates single binary with embedded frontend)
- `make deps` - Install all dependencies (Go modules + npm packages)
- `make clean` - Remove build artifacts and database
- `make run` - Run the built binary
- `./bin/rikuest` - Run the application after building

## Architecture Overview

### Technology Stack
- **Backend**: Go 1.21+ with Gin web framework
- **Frontend**: React with Vite, Zustand for state management
- **Database**: SQLite with local file storage (`rikuest.db`)
- **UI Components**: Tailwind CSS, Headless UI, custom React components
- **HTTP Client**: Axios for API calls

### Application Structure
This is a REST API client application (similar to Postman/Insomnia) with a Go backend serving a React frontend.

#### Backend Architecture (`/internal`)
- **`cmd/server/main.go`** - Application entry point with Gin router setup
- **`internal/database/`** - SQLite operations with JSON serialization for complex fields
- **`internal/handlers/`** - HTTP request handlers for REST API endpoints
- **`internal/models/`** - Data models for Projects, Requests, and Response history

#### Frontend Architecture (`/frontend/src`)
- **`stores/`** - Zustand stores for projects and requests state management
- **`views/`** - Page components (Home.jsx, Project.jsx)
- **`components/`** - UI components including RequestBuilder.jsx and ui/ components
- **Vite config** - Proxy setup to backend API during development

### Key Patterns

#### Database Layer
- Uses SQLite with manual table creation and migrations
- JSON serialization for complex fields (headers, query params, form data, auth)
- Automatic timestamps with `CURRENT_TIMESTAMP`
- Foreign key constraints with `ON DELETE CASCADE`

#### API Layer
- RESTful endpoints with `/api` prefix
- Consistent error handling with JSON responses
- Request execution with 30-second timeout
- Response history tracking (last 10 executions per request)

#### Frontend State Management
- Zustand stores handle API communication
- Async actions with error handling
- Loading states for UI feedback
- Current item tracking (currentProject, currentRequest)
- React Router for client-side routing

## Development Workflow

**IMPORTANT: DO NOT START OR RESTART SERVICES**
The development services (frontend and backend) are already running and automatically reload on code changes. Never use `make dev`, `npm run dev`, or any other command to start services. Changes are applied automatically through hot reload.

### Frontend Development
1. Backend is already running on :8080
2. Frontend is already running with hot reload enabled (proxies API calls to backend)
3. All code changes are automatically applied - no restart needed

### Production Build
1. `make build` creates single binary with embedded frontend
2. Serves static files from embedded `frontend/dist`
3. API routes on `/api/*`, SPA routing handled by fallback to `index.html`

### Database Schema
- **projects**: id, name, description, timestamps
- **requests**: project association, HTTP details, complex fields as JSON
- **request_history**: execution results with response data

## API Endpoints

### Projects
- `POST /api/projects` - Create project
- `GET /api/projects` - List all projects
- `GET /api/project/:id` - Get single project
- `PUT /api/project/:id` - Update project
- `DELETE /api/project/:id` - Delete project
- `GET /api/project/:id/requests` - Get requests in project

### Requests
- `POST /api/requests` - Create request
- `GET /api/request/:id` - Get single request
- `PUT /api/request/:id` - Update request
- `DELETE /api/request/:id` - Delete request
- `POST /api/request/:id/execute` - Execute HTTP request
- `GET /api/request/:id/history` - Get execution history

## Testing & Quality
No specific test framework is configured. When adding tests, examine the existing structure and choose appropriate Go testing tools.