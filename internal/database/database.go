package database

import (
	"database/sql"
	"fmt"

	_ "github.com/mattn/go-sqlite3"
)

type DB struct {
	*sql.DB
}

func NewDB(dataSourceName string) (*DB, error) {
	// _foreign_keys: the schema relies on ON DELETE CASCADE/SET NULL, which
	// SQLite ignores unless enabled per-connection.
	// WAL + busy_timeout: tolerate concurrent writers (telemetry goroutine
	// writes while request history is being saved).
	db, err := sql.Open("sqlite3", dataSourceName+"?_foreign_keys=on&_journal_mode=WAL&_busy_timeout=5000")
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	// SQLite serializes writes; a single connection avoids "database is locked"
	// errors and makes the per-connection pragmas above apply everywhere.
	db.SetMaxOpenConns(1)

	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	database := &DB{db}
	if err := database.createTables(); err != nil {
		return nil, fmt.Errorf("failed to create tables: %w", err)
	}

	// Apply schema migrations (versioned via PRAGMA user_version)
	if err := database.migrate(); err != nil {
		return nil, fmt.Errorf("failed to migrate database: %w", err)
	}

	// Initialize default settings
	if err := database.initializeDefaultSettings(); err != nil {
		return nil, fmt.Errorf("failed to initialize default settings: %w", err)
	}

	// Initialize telemetry config
	if err := database.initializeTelemetryConfig(); err != nil {
		return nil, fmt.Errorf("failed to initialize telemetry config: %w", err)
	}

	return database, nil
}

func (db *DB) initializeTelemetryConfig() error {
	// Check if config exists
	var count int
	err := db.QueryRow("SELECT COUNT(*) FROM telemetry_config WHERE id = 1").Scan(&count)
	if err != nil {
		return err
	}

	if count == 0 {
		// Insert default config (telemetry is opt-in: disabled until the user enables it)
		_, err = db.Exec("INSERT INTO telemetry_config (id, enabled, webhook_url, installation_id) VALUES (1, 0, '', '')")
		return err
	}

	return nil
}

func (db *DB) createTables() error {
	queries := []string{
		`CREATE TABLE IF NOT EXISTS projects (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT NOT NULL UNIQUE,
			description TEXT,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE TABLE IF NOT EXISTS folders (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			project_id INTEGER NOT NULL,
			name TEXT NOT NULL,
			parent_id INTEGER,
			position INTEGER DEFAULT 0,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
			FOREIGN KEY (parent_id) REFERENCES folders(id) ON DELETE CASCADE
		)`,
		`CREATE TABLE IF NOT EXISTS requests (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			project_id INTEGER NOT NULL,
			folder_id INTEGER,
			name TEXT NOT NULL,
			method TEXT NOT NULL DEFAULT 'GET',
			url TEXT NOT NULL,
			headers TEXT DEFAULT '{}',
			body TEXT DEFAULT '',
			query_params TEXT DEFAULT '[]',
			auth_type TEXT DEFAULT 'none',
			bearer_token TEXT DEFAULT '',
			basic_auth TEXT DEFAULT '{}',
			body_type TEXT DEFAULT 'none',
			form_data TEXT DEFAULT '[]',
			position INTEGER DEFAULT 0,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
			FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE SET NULL
		)`,
		`CREATE TABLE IF NOT EXISTS request_history (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			request_id INTEGER NOT NULL,
			response TEXT NOT NULL,
			executed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (request_id) REFERENCES requests(id) ON DELETE CASCADE
		)`,
		`CREATE TABLE IF NOT EXISTS settings (
			key TEXT PRIMARY KEY,
			value TEXT NOT NULL,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE TABLE IF NOT EXISTS telemetry_config (
			id INTEGER PRIMARY KEY,
			enabled INTEGER DEFAULT 0,
			webhook_url TEXT DEFAULT '',
			installation_id TEXT DEFAULT ''
		)`,
		`CREATE TABLE IF NOT EXISTS telemetry_events_cache (
			event_hash TEXT PRIMARY KEY,
			timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE TABLE IF NOT EXISTS environments (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			project_id INTEGER NOT NULL,
			name TEXT NOT NULL,
			is_active INTEGER DEFAULT 0,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
		)`,
		`CREATE TABLE IF NOT EXISTS environment_variables (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			environment_id INTEGER NOT NULL,
			key TEXT NOT NULL,
			value TEXT NOT NULL DEFAULT '',
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (environment_id) REFERENCES environments(id) ON DELETE CASCADE,
			UNIQUE(environment_id, key)
		)`,
		`CREATE TABLE IF NOT EXISTS folder_variables (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			folder_id INTEGER NOT NULL,
			key TEXT NOT NULL,
			value TEXT NOT NULL DEFAULT '',
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE CASCADE
		)`,
		`CREATE TABLE IF NOT EXISTS response_captures (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			request_id INTEGER NOT NULL,
			variable_name TEXT NOT NULL,
			json_path TEXT NOT NULL,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (request_id) REFERENCES requests(id) ON DELETE CASCADE
		)`,
	}

	for _, query := range queries {
		if _, err := db.Exec(query); err != nil {
			return fmt.Errorf("failed to execute query: %w", err)
		}
	}

	return nil
}

// migration is a numbered schema change. Applied migrations are tracked via
// PRAGMA user_version; to evolve the schema, append a new entry with the next
// version number (never edit an already-shipped migration).
type migration struct {
	version    int
	statements []string
}

var migrations = []migration{
	{
		version: 1,
		statements: []string{
			`CREATE INDEX IF NOT EXISTS idx_folders_project_id ON folders(project_id)`,
			`CREATE INDEX IF NOT EXISTS idx_folders_parent_id ON folders(parent_id)`,
			`CREATE INDEX IF NOT EXISTS idx_requests_project_id ON requests(project_id)`,
			`CREATE INDEX IF NOT EXISTS idx_requests_folder_id ON requests(folder_id)`,
			`CREATE INDEX IF NOT EXISTS idx_request_history_request_id ON request_history(request_id)`,
			`CREATE INDEX IF NOT EXISTS idx_environments_project_id ON environments(project_id)`,
			`CREATE INDEX IF NOT EXISTS idx_folder_variables_folder_id ON folder_variables(folder_id)`,
			`CREATE INDEX IF NOT EXISTS idx_response_captures_request_id ON response_captures(request_id)`,
		},
	},
}

func (db *DB) migrate() error {
	// Legacy pre-versioning columns: DBs created before the requests table
	// gained these columns need them added; detection is by inspecting the
	// actual schema, not by matching error strings.
	if err := db.ensureRequestColumns(); err != nil {
		return err
	}

	var current int
	if err := db.QueryRow("PRAGMA user_version").Scan(&current); err != nil {
		return fmt.Errorf("failed to read schema version: %w", err)
	}

	for _, m := range migrations {
		if m.version <= current {
			continue
		}
		tx, err := db.Begin()
		if err != nil {
			return err
		}
		for _, stmt := range m.statements {
			if _, err := tx.Exec(stmt); err != nil {
				tx.Rollback()
				return fmt.Errorf("migration %d failed: %w", m.version, err)
			}
		}
		if _, err := tx.Exec(fmt.Sprintf("PRAGMA user_version = %d", m.version)); err != nil {
			tx.Rollback()
			return fmt.Errorf("failed to set schema version %d: %w", m.version, err)
		}
		if err := tx.Commit(); err != nil {
			return err
		}
		current = m.version
	}

	return nil
}

func (db *DB) ensureRequestColumns() error {
	rows, err := db.Query(`PRAGMA table_info(requests)`)
	if err != nil {
		return err
	}
	defer rows.Close()

	existing := make(map[string]bool)
	for rows.Next() {
		var cid int
		var name, colType string
		var notNull, pk int
		var dflt sql.NullString
		if err := rows.Scan(&cid, &name, &colType, &notNull, &dflt, &pk); err != nil {
			return err
		}
		existing[name] = true
	}
	if err := rows.Err(); err != nil {
		return err
	}

	columns := []struct {
		name string
		stmt string
	}{
		{"query_params", `ALTER TABLE requests ADD COLUMN query_params TEXT DEFAULT '[]'`},
		{"auth_type", `ALTER TABLE requests ADD COLUMN auth_type TEXT DEFAULT 'none'`},
		{"bearer_token", `ALTER TABLE requests ADD COLUMN bearer_token TEXT DEFAULT ''`},
		{"basic_auth", `ALTER TABLE requests ADD COLUMN basic_auth TEXT DEFAULT '{}'`},
		{"body_type", `ALTER TABLE requests ADD COLUMN body_type TEXT DEFAULT 'none'`},
		{"form_data", `ALTER TABLE requests ADD COLUMN form_data TEXT DEFAULT '[]'`},
		{"folder_id", `ALTER TABLE requests ADD COLUMN folder_id INTEGER`},
		{"position", `ALTER TABLE requests ADD COLUMN position INTEGER DEFAULT 0`},
	}

	for _, col := range columns {
		if existing[col.name] {
			continue
		}
		if _, err := db.Exec(col.stmt); err != nil {
			return fmt.Errorf("failed to add column %s: %w", col.name, err)
		}
	}

	return nil
}
