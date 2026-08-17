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
- `adapters/` - adapterFactory picks apiAdapter (HTTP) or wailsAdapter (native bindings); all store calls go through this layer — never call fetch or Wails bindings directly. A dev-only parity check warns if the two adapters' method sets drift.
- `stores/` - Zustand stores: project, request, folder, environment, telemetry, ui, cookie, toast. Data stores wrap async work with `asyncAction` (stores/createAsyncAction.js) and all expose an `error` field — keep that contract when adding actions. `requestStore` tracks multi-tab state (`openTabIds`/`activeTabId`, per-request `responses`/`executingIds` maps) — `currentRequest`/`currentResponse`/`executing` are convenience mirrors of the active tab, never write them directly for a non-active request.
- `hooks/useTranslation.js` - Custom i18n (NOT react-i18next); locales in `locales/{en,es,fr}.json`, language persisted in localStorage key `rikuest-language`
- `components/`, `views/` - UI (Tailwind, Headless UI, Monaco editor for bodies)
- `components/ui/` - shared design primitives, imported via the barrel `components/ui/index.js`: `Modal`/`ModalHeader`/`ModalBody`/`ModalFooter` (the one modal shell — don't hand-roll `fixed inset-0` overlays), `Field`/`Label`/`Input`/`Textarea`/`Select`/`Checkbox`/`Switch`/`Button`/`IconButton`, plus `VariableInput` (Input + `{{name}}` highlighting/autocomplete — use it for any field the backend resolves variables in; pass layout classes via `wrapperClassName`). Form controls are size-aware via `useUISize` — build forms from these, not raw `<input>`/`<label>`. See `COMPONENT_UNIFICATION_PLAN.md` for the ongoing migration of legacy hand-rolled modals/fields onto these.

### Database
Tables: projects, folders (nested via parent_id), requests, request_history, environments, environment_variables, folder_variables, response_captures, settings, telemetry_config, telemetry_events_cache, project_cookies. Foreign keys with ON DELETE CASCADE; JSON-serialized complex fields. CRUD lives in `internal/database/*_repo.go` (one file per aggregate), not in `database.go` itself (connection setup, schema, migrations only).

**Two DB locations**:
- Web/server mode: `./rikuest.db` in the working directory (gitignored)
- Wails mode: OS app-data dir via `getAppDataDir()` in root `main.go` (XDG_DATA_HOME on Linux)

### API Endpoints
All routes under `/api`, registered in `cmd/server/main.go` — read that file for the current list (projects, folders, requests + execute/history/move/copy/captures, environments + variables/activate, project cookies).

## Gotchas
- Telemetry is opt-in and disabled by default. It only sends events to Discord when the user enables it AND the `RIKUEST_DISCORD_WEBHOOK` env var (read in `internal/config/config.go`) or a webhook in `telemetry_config` provides a URL.
- Each request carries its own auth (none/bearer/basic/apikey), TLS/redirect/timeout overrides (`insecure_skip_verify`, `follow_redirects`/`max_redirects`, `timeout_seconds`), and executes against a per-project cookie jar (`internal/services/cookie_service.go`, stdlib `net/http/cookiejar`) — an explicit `Cookie` header on the request skips the jar entirely rather than sending it twice.
- Variable precedence (`internal/services/variable_resolver.go`), lowest first: folder variables walking the ancestry root→leaf (within each folder, the shared default then the active environment's override for that folder), then the active environment's own variables. Folder depth is the primary axis; the environment always has the last word, which is what keeps captured values from being shadowed. `folder_variables.environment_id` NULL = the default shared by every environment; the services/Wails/HTTP boundary spells that scope `0`, not NULL.
- Response captures (`internal/services/response_capture_service.go`) only run on 2xx responses with a JSON body and write into the **active environment** — no active environment means nothing is stored. Every rule reports a `CaptureResult` back in `RequestResponse.Captures` (`applied`, `no_active_environment`, `invalid_json`, `path_not_found`, `skipped_error_status`, `failed`); keep that reporting when touching the flow, it is what makes a no-op visible in the UI.
- Go tests live in `internal/database` and `internal/services`; run with `go test ./...`. No JS test framework is configured — ESLint is the only frontend check.
- CI (`.github/workflows/ci.yml`) runs go build/vet/test and frontend lint+build. The lint step is non-blocking until the ~40 legacy no-unused-vars errors are cleaned up.
- SQLite runs with `_foreign_keys=on`, WAL, busy_timeout and `SetMaxOpenConns(1)` (set in `database.NewDB`) — don't open the DB elsewhere without them.
- Schema changes go through the versioned `migrations` list in `internal/database/database.go` (tracked via `PRAGMA user_version`): append a new numbered entry, never edit a shipped one.
- The web server runs Gin in release mode unless `RIKUEST_DEBUG` is set, and CORS only allows localhost origins (5173/8080).

## Development Workflow

**IMPORTANT: DO NOT START OR RESTART SERVICES**
The development services (frontend and backend) are already running and automatically reload on code changes. Never use `make dev`, `npm run dev`, or any other command to start services. Changes are applied automatically through hot reload.
