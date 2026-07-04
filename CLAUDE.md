# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Backend (Go)
- `make dev` - Start development server on :8080 (uses `gow`, a file-watcher — must be installed)
- `make backend` - Build Go binary to `bin/rikuest`

### Frontend (React)
- `cd frontend && npm run dev` - Dev server with hot reload (port 5173, proxies /api to :8080)
- `cd frontend && npm run build` - Production build
- `cd frontend && npm run lint` - ESLint (flat config, eslint.config.js)

### Full Application
- `make build` - Build both frontend and backend (single binary with embedded frontend)
- `make deps` - Install all dependencies (Go modules + npm packages)
- `make clean` - Remove build artifacts and database
- `./bin/rikuest` - Run after building

### Native Desktop Application (Wails)
- `make install-wails` - Install Wails CLI (run once)
- `make wails-dev` - Native app in dev mode with hot reload
- `make wails-build` - Build native app for current platform
- `make wails-build-prod` - Build for Windows, macOS, and Linux
- `make wails-clean` - Clean all build artifacts including Wails

## Architecture Overview

REST API client (Postman/Insomnia-style). Go 1.22 + Gin backend, React 19 + Vite + Zustand frontend, SQLite. Runs in two modes sharing the same services layer:
- **Web mode**: `cmd/server/main.go` serves the API on :8080 + embedded frontend
- **Native mode (Wails)**: root `main.go` binds services directly to the frontend

### Backend (`/internal`)
- `internal/services/` - Business logic lives here: project, request, folder, environment, variable_resolver, response_capture, format, telemetry, config
- `internal/handlers/` - Gin HTTP handlers (web mode only), thin wrappers over services
- `internal/database/` - SQLite; complex fields (headers, auth, form data) stored as JSON
- `internal/models/` - Shared data models

### Frontend (`/frontend/src`)
- `adapters/` - adapterFactory picks apiAdapter (HTTP) or wailsAdapter (native bindings); all store calls go through this layer — never call axios or Wails bindings directly
- `stores/` - 6 Zustand stores: project, request, folder, environment, telemetry, ui
- `hooks/useTranslation.js` - Custom i18n (NOT react-i18next); locales in `locales/{en,es,fr}.json`, language persisted in localStorage key `rikuest-language`
- `components/`, `views/` - UI (Tailwind, Headless UI, Monaco editor for bodies)

### Database
Tables: projects, folders (nested via parent_id), requests, request_history, environments, environment_variables, folder_variables, response_captures, settings, telemetry_config, telemetry_events_cache. Foreign keys with ON DELETE CASCADE; JSON-serialized complex fields.

**Two DB locations**:
- Web/server mode: `./rikuest.db` in the working directory (gitignored)
- Wails mode: OS app-data dir via `getAppDataDir()` in root `main.go` (XDG_DATA_HOME on Linux)

### API Endpoints
All routes under `/api`, registered in `cmd/server/main.go` — read that file for the current list (projects, folders, requests + execute/history/move/copy/captures, environments + variables/activate).

## Gotchas
- Telemetry is opt-in and disabled by default. It only sends events to Discord when the user enables it AND the `RIKUEST_DISCORD_WEBHOOK` env var (read in `internal/config/config.go`) or a webhook in `telemetry_config` provides a URL.
- Go tests exist (start with `internal/database`); run with `go test ./...`. No JS test framework is configured — ESLint is the only frontend check.
- SQLite runs with `_foreign_keys=on`, WAL, busy_timeout and `SetMaxOpenConns(1)` (set in `database.NewDB`) — don't open the DB elsewhere without them.
- Schema changes go through the versioned `migrations` list in `internal/database/database.go` (tracked via `PRAGMA user_version`): append a new numbered entry, never edit a shipped one.
- The web server runs Gin in release mode unless `RIKUEST_DEBUG` is set, and CORS only allows localhost origins (5173/8080).

## Development Workflow

**IMPORTANT: DO NOT START OR RESTART SERVICES**
The development services (frontend and backend) are already running and automatically reload on code changes. Never use `make dev`, `npm run dev`, or any other command to start services. Changes are applied automatically through hot reload.
