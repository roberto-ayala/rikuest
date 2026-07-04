package database

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"time"

	"rikuest/internal/models"

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

	// Run migrations for new columns
	if err := database.migrateRequestsTable(); err != nil {
		return nil, fmt.Errorf("failed to migrate requests table: %w", err)
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

func (db *DB) migrateRequestsTable() error {
	// Add new columns if they don't exist
	migrations := []string{
		`ALTER TABLE requests ADD COLUMN query_params TEXT DEFAULT '[]'`,
		`ALTER TABLE requests ADD COLUMN auth_type TEXT DEFAULT 'none'`,
		`ALTER TABLE requests ADD COLUMN bearer_token TEXT DEFAULT ''`,
		`ALTER TABLE requests ADD COLUMN basic_auth TEXT DEFAULT '{}'`,
		`ALTER TABLE requests ADD COLUMN body_type TEXT DEFAULT 'none'`,
		`ALTER TABLE requests ADD COLUMN form_data TEXT DEFAULT '[]'`,
		`ALTER TABLE requests ADD COLUMN folder_id INTEGER`,
		`ALTER TABLE requests ADD COLUMN position INTEGER DEFAULT 0`,
	}

	for _, migration := range migrations {
		_, err := db.Exec(migration)
		if err != nil && !isColumnExistsError(err) {
			return fmt.Errorf("migration failed: %w", err)
		}
	}

	return nil
}

func isColumnExistsError(err error) bool {
	errStr := fmt.Sprintf("%s", err)
	return err != nil && (errStr == "duplicate column name: query_params" ||
		errStr == "duplicate column name: auth_type" ||
		errStr == "duplicate column name: bearer_token" ||
		errStr == "duplicate column name: basic_auth" ||
		errStr == "duplicate column name: body_type" ||
		errStr == "duplicate column name: form_data" ||
		errStr == "duplicate column name: folder_id" ||
		errStr == "duplicate column name: position")
}

func (db *DB) initializeDefaultSettings() error {
	// Set default timeout to 5 minutes (300 seconds) if not exists
	_, err := db.Exec(`
		INSERT OR IGNORE INTO settings (key, value) 
		VALUES ('request_timeout_seconds', '300')
	`)
	return err
}

func (db *DB) GetSetting(key string) (string, error) {
	var value string
	err := db.QueryRow("SELECT value FROM settings WHERE key = ?", key).Scan(&value)
	if err == sql.ErrNoRows {
		return "", nil
	}
	return value, err
}

func (db *DB) SetSetting(key, value string) error {
	_, err := db.Exec(`
		INSERT INTO settings (key, value, updated_at) 
		VALUES (?, ?, CURRENT_TIMESTAMP)
		ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = CURRENT_TIMESTAMP
	`, key, value, value)
	return err
}

func (db *DB) CreateProject(project *models.Project) error {
	query := `INSERT INTO projects (name, description) VALUES (?, ?) RETURNING id, created_at, updated_at`
	err := db.QueryRow(query, project.Name, project.Description).Scan(
		&project.ID, &project.CreatedAt, &project.UpdatedAt,
	)
	return err
}

func (db *DB) GetProjects() ([]models.Project, error) {
	query := `SELECT id, name, description, created_at, updated_at FROM projects ORDER BY created_at DESC`
	rows, err := db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var projects []models.Project
	for rows.Next() {
		var project models.Project
		err := rows.Scan(&project.ID, &project.Name, &project.Description, &project.CreatedAt, &project.UpdatedAt)
		if err != nil {
			return nil, err
		}
		projects = append(projects, project)
	}

	return projects, nil
}

func (db *DB) GetProject(id int) (*models.Project, error) {
	query := `SELECT id, name, description, created_at, updated_at FROM projects WHERE id = ?`
	var project models.Project
	err := db.QueryRow(query, id).Scan(
		&project.ID, &project.Name, &project.Description, &project.CreatedAt, &project.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &project, nil
}

func (db *DB) UpdateProject(project *models.Project) error {
	query := `UPDATE projects SET name = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
	_, err := db.Exec(query, project.Name, project.Description, project.ID)
	return err
}

func (db *DB) DeleteProject(id int) error {
	query := `DELETE FROM projects WHERE id = ?`
	_, err := db.Exec(query, id)
	return err
}

func (db *DB) CreateRequest(request *models.Request) error {
	headersJSON, _ := json.Marshal(request.Headers)
	queryParamsJSON, _ := json.Marshal(request.QueryParams)
	basicAuthJSON, _ := json.Marshal(request.BasicAuth)
	formDataJSON, _ := json.Marshal(request.FormData)

	// Position is computed inside the INSERT so the MAX(position)+1 read and
	// the write happen atomically (no race between concurrent creates).
	query := `INSERT INTO requests (project_id, folder_id, name, method, url, headers, body,
			  query_params, auth_type, bearer_token, basic_auth, body_type, form_data, position)
			  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
			  (SELECT COALESCE(MAX(position), -1) + 1 FROM requests WHERE project_id = ? AND folder_id IS ?))
			  RETURNING id, position, created_at, updated_at`
	err := db.QueryRow(query, request.ProjectID, request.FolderID, request.Name, request.Method,
		request.URL, string(headersJSON), request.Body, string(queryParamsJSON),
		request.AuthType, request.BearerToken, string(basicAuthJSON),
		request.BodyType, string(formDataJSON), request.ProjectID, request.FolderID).Scan(
		&request.ID, &request.Position, &request.CreatedAt, &request.UpdatedAt,
	)
	return err
}

func (db *DB) GetRequests(projectID int) ([]models.Request, error) {
	query := `SELECT id, project_id, folder_id, name, method, url, headers, body, query_params, 
			  auth_type, bearer_token, basic_auth, body_type, form_data, position, created_at, updated_at 
			  FROM requests WHERE project_id = ? ORDER BY position ASC, created_at DESC`
	rows, err := db.Query(query, projectID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var requests []models.Request
	for rows.Next() {
		var request models.Request
		var headersJSON, queryParamsJSON, basicAuthJSON, formDataJSON string
		var folderID *int
		err := rows.Scan(&request.ID, &request.ProjectID, &folderID, &request.Name, &request.Method,
			&request.URL, &headersJSON, &request.Body, &queryParamsJSON,
			&request.AuthType, &request.BearerToken, &basicAuthJSON,
			&request.BodyType, &formDataJSON, &request.Position, &request.CreatedAt, &request.UpdatedAt)
		if err != nil {
			return nil, err
		}
		request.FolderID = folderID
		json.Unmarshal([]byte(headersJSON), &request.Headers)
		json.Unmarshal([]byte(queryParamsJSON), &request.QueryParams)
		json.Unmarshal([]byte(basicAuthJSON), &request.BasicAuth)
		json.Unmarshal([]byte(formDataJSON), &request.FormData)
		requests = append(requests, request)
	}

	return requests, nil
}

func (db *DB) GetRequest(id int) (*models.Request, error) {
	query := `SELECT id, project_id, folder_id, name, method, url, headers, body, query_params, 
			  auth_type, bearer_token, basic_auth, body_type, form_data, position, created_at, updated_at 
			  FROM requests WHERE id = ?`
	var request models.Request
	var headersJSON, queryParamsJSON, basicAuthJSON, formDataJSON string
	var folderID *int
	err := db.QueryRow(query, id).Scan(
		&request.ID, &request.ProjectID, &folderID, &request.Name, &request.Method,
		&request.URL, &headersJSON, &request.Body, &queryParamsJSON,
		&request.AuthType, &request.BearerToken, &basicAuthJSON,
		&request.BodyType, &formDataJSON, &request.Position, &request.CreatedAt, &request.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	request.FolderID = folderID
	json.Unmarshal([]byte(headersJSON), &request.Headers)
	json.Unmarshal([]byte(queryParamsJSON), &request.QueryParams)
	json.Unmarshal([]byte(basicAuthJSON), &request.BasicAuth)
	json.Unmarshal([]byte(formDataJSON), &request.FormData)
	return &request, nil
}

func (db *DB) UpdateRequest(request *models.Request) error {
	headersJSON, _ := json.Marshal(request.Headers)
	queryParamsJSON, _ := json.Marshal(request.QueryParams)
	basicAuthJSON, _ := json.Marshal(request.BasicAuth)
	formDataJSON, _ := json.Marshal(request.FormData)

	query := `UPDATE requests SET name = ?, method = ?, url = ?, headers = ?, body = ?, 
			  query_params = ?, auth_type = ?, bearer_token = ?, basic_auth = ?, 
			  body_type = ?, form_data = ?, folder_id = ?, position = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
	_, err := db.Exec(query, request.Name, request.Method, request.URL,
		string(headersJSON), request.Body, string(queryParamsJSON),
		request.AuthType, request.BearerToken, string(basicAuthJSON),
		request.BodyType, string(formDataJSON), request.FolderID, request.Position, request.ID)
	return err
}

func (db *DB) DeleteRequest(id int) error {
	query := `DELETE FROM requests WHERE id = ?`
	_, err := db.Exec(query, id)
	return err
}

func (db *DB) SaveRequestHistory(history *models.RequestHistory) error {
	responseJSON, _ := json.Marshal(history.Response)
	query := `INSERT INTO request_history (request_id, response, executed_at) VALUES (?, ?, ?)`
	_, err := db.Exec(query, history.RequestID, string(responseJSON), time.Now())
	return err
}

func (db *DB) GetRequestHistory(requestID int) ([]models.RequestHistory, error) {
	query := `SELECT id, request_id, response, executed_at FROM request_history 
			  WHERE request_id = ? ORDER BY executed_at DESC LIMIT 10`
	rows, err := db.Query(query, requestID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var history []models.RequestHistory
	for rows.Next() {
		var h models.RequestHistory
		var responseJSON string
		err := rows.Scan(&h.ID, &h.RequestID, &responseJSON, &h.ExecutedAt)
		if err != nil {
			return nil, err
		}
		json.Unmarshal([]byte(responseJSON), &h.Response)
		history = append(history, h)
	}

	return history, nil
}

func (db *DB) DeleteRequestHistoryItem(requestID int, historyID int) error {
	query := `DELETE FROM request_history WHERE id = ? AND request_id = ?`
	result, err := db.Exec(query, historyID, requestID)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rowsAffected == 0 {
		return fmt.Errorf("history item not found or does not belong to this request")
	}

	return nil
}

// Folder operations
func (db *DB) CreateFolder(folder *models.Folder) error {
	// Position is computed inside the INSERT so the MAX(position)+1 read and
	// the write happen atomically (no race between concurrent creates).
	query := `INSERT INTO folders (project_id, name, parent_id, position)
			  VALUES (?, ?, ?,
			  (SELECT COALESCE(MAX(position), -1) + 1 FROM folders WHERE project_id = ? AND parent_id IS ?))
			  RETURNING id, position, created_at, updated_at`
	err := db.QueryRow(query, folder.ProjectID, folder.Name, folder.ParentID,
		folder.ProjectID, folder.ParentID).Scan(
		&folder.ID, &folder.Position, &folder.CreatedAt, &folder.UpdatedAt,
	)
	return err
}

func (db *DB) GetFolders(projectID int) ([]models.Folder, error) {
	query := `SELECT id, project_id, name, parent_id, position, created_at, updated_at 
			  FROM folders WHERE project_id = ? ORDER BY position ASC`
	rows, err := db.Query(query, projectID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var folders []models.Folder
	for rows.Next() {
		var folder models.Folder
		var parentID *int
		err := rows.Scan(&folder.ID, &folder.ProjectID, &folder.Name, &parentID,
			&folder.Position, &folder.CreatedAt, &folder.UpdatedAt)
		if err != nil {
			return nil, err
		}
		folder.ParentID = parentID
		folders = append(folders, folder)
	}

	return folders, nil
}

func (db *DB) UpdateFolder(folder *models.Folder) error {
	query := `UPDATE folders SET name = ?, parent_id = ?, position = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
	_, err := db.Exec(query, folder.Name, folder.ParentID, folder.Position, folder.ID)
	return err
}

func (db *DB) DeleteFolder(id int) error {
	// First, move all requests in this folder to root level
	_, err := db.Exec("UPDATE requests SET folder_id = NULL WHERE folder_id = ?", id)
	if err != nil {
		return err
	}

	// Then delete the folder
	query := `DELETE FROM folders WHERE id = ?`
	_, err = db.Exec(query, id)
	return err
}

func (db *DB) MoveRequest(requestID int, folderID *int, position int) error {
	query := `UPDATE requests SET folder_id = ?, position = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
	_, err := db.Exec(query, folderID, position, requestID)
	return err
}

// Telemetry operations
func (db *DB) GetTelemetryConfig() (*models.TelemetryConfig, error) {
	var config models.TelemetryConfig
	var enabled int
	err := db.QueryRow("SELECT enabled, webhook_url, installation_id FROM telemetry_config WHERE id = 1").Scan(
		&enabled, &config.WebhookURL, &config.InstallationID,
	)
	if err != nil {
		return nil, err
	}
	config.Enabled = enabled == 1
	return &config, nil
}

func (db *DB) UpdateTelemetryConfig(config *models.TelemetryConfig) error {
	enabled := 0
	if config.Enabled {
		enabled = 1
	}
	query := `UPDATE telemetry_config SET enabled = ?, webhook_url = ?, installation_id = ? WHERE id = 1`
	_, err := db.Exec(query, enabled, config.WebhookURL, config.InstallationID)
	return err
}

func (db *DB) IsEventDuplicated(eventHash string) (bool, error) {
	// Clean old events (older than 1 hour)
	_, _ = db.Exec("DELETE FROM telemetry_events_cache WHERE timestamp < datetime('now', '-1 hour')")

	var count int
	err := db.QueryRow("SELECT COUNT(*) FROM telemetry_events_cache WHERE event_hash = ?", eventHash).Scan(&count)
	if err != nil {
		return false, err
	}
	return count > 0, nil
}

func (db *DB) CacheEventHash(eventHash string) error {
	query := `INSERT OR REPLACE INTO telemetry_events_cache (event_hash, timestamp) VALUES (?, CURRENT_TIMESTAMP)`
	_, err := db.Exec(query, eventHash)
	return err
}

// ===== ENVIRONMENT & VARIABLE METHODS =====

func (db *DB) CreateEnvironment(env *models.Environment) error {
	query := `INSERT INTO environments (project_id, name, is_active) VALUES (?, ?, 0) RETURNING id, created_at, updated_at`
	return db.QueryRow(query, env.ProjectID, env.Name).Scan(&env.ID, &env.CreatedAt, &env.UpdatedAt)
}

func (db *DB) GetEnvironments(projectID int) ([]models.Environment, error) {
	rows, err := db.Query(
		`SELECT id, project_id, name, is_active, created_at, updated_at FROM environments WHERE project_id = ? ORDER BY created_at ASC`,
		projectID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var envs []models.Environment
	for rows.Next() {
		var e models.Environment
		var isActive int
		if err := rows.Scan(&e.ID, &e.ProjectID, &e.Name, &isActive, &e.CreatedAt, &e.UpdatedAt); err != nil {
			return nil, err
		}
		e.IsActive = isActive == 1
		envs = append(envs, e)
	}

	// Load variables for each environment
	for i := range envs {
		vars, err := db.getEnvironmentVariables(envs[i].ID)
		if err != nil {
			return nil, err
		}
		envs[i].Variables = vars
	}

	if envs == nil {
		envs = []models.Environment{}
	}
	return envs, nil
}

func (db *DB) GetActiveEnvironment(projectID int) (*models.Environment, error) {
	var e models.Environment
	var isActive int
	err := db.QueryRow(
		`SELECT id, project_id, name, is_active, created_at, updated_at FROM environments WHERE project_id = ? AND is_active = 1`,
		projectID,
	).Scan(&e.ID, &e.ProjectID, &e.Name, &isActive, &e.CreatedAt, &e.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	e.IsActive = true
	vars, err := db.getEnvironmentVariables(e.ID)
	if err != nil {
		return nil, err
	}
	e.Variables = vars
	return &e, nil
}

func (db *DB) getEnvironmentVariables(environmentID int) ([]models.Variable, error) {
	rows, err := db.Query(
		`SELECT id, key, value, created_at, updated_at FROM environment_variables WHERE environment_id = ? ORDER BY key ASC`,
		environmentID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var vars []models.Variable
	for rows.Next() {
		var v models.Variable
		if err := rows.Scan(&v.ID, &v.Key, &v.Value, &v.CreatedAt, &v.UpdatedAt); err != nil {
			return nil, err
		}
		vars = append(vars, v)
	}
	if vars == nil {
		vars = []models.Variable{}
	}
	return vars, nil
}

func (db *DB) UpdateEnvironmentName(id int, name string) error {
	_, err := db.Exec(`UPDATE environments SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, name, id)
	return err
}

func (db *DB) DeleteEnvironment(id int) error {
	_, err := db.Exec(`DELETE FROM environments WHERE id = ?`, id)
	return err
}

func (db *DB) SetActiveEnvironment(projectID, environmentID int) error {
	tx, err := db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	if _, err := tx.Exec(`UPDATE environments SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE project_id = ?`, projectID); err != nil {
		return err
	}
	if _, err := tx.Exec(`UPDATE environments SET is_active = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, environmentID); err != nil {
		return err
	}
	return tx.Commit()
}

func (db *DB) DeactivateAllEnvironments(projectID int) error {
	_, err := db.Exec(`UPDATE environments SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE project_id = ?`, projectID)
	return err
}

// UpdateEnvironmentVariables replaces all variables for an environment (batch replace).
func (db *DB) UpdateEnvironmentVariables(environmentID int, variables []models.Variable) error {
	tx, err := db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	if _, err := tx.Exec(`DELETE FROM environment_variables WHERE environment_id = ?`, environmentID); err != nil {
		return err
	}
	for _, v := range variables {
		if _, err := tx.Exec(
			`INSERT INTO environment_variables (environment_id, key, value) VALUES (?, ?, ?)`,
			environmentID, v.Key, v.Value,
		); err != nil {
			return err
		}
	}
	return tx.Commit()
}

// UpsertEnvironmentVariable adds or updates a single variable (used by response capture).
func (db *DB) UpsertEnvironmentVariable(environmentID int, key, value string) error {
	_, err := db.Exec(`
		INSERT INTO environment_variables (environment_id, key, value)
		VALUES (?, ?, ?)
		ON CONFLICT(environment_id, key) DO UPDATE SET value = ?, updated_at = CURRENT_TIMESTAMP
	`, environmentID, key, value, value)
	return err
}

// GetFolderVariables returns variables for a folder.
func (db *DB) GetFolderVariables(folderID int) ([]models.Variable, error) {
	rows, err := db.Query(
		`SELECT id, key, value, created_at, updated_at FROM folder_variables WHERE folder_id = ? ORDER BY key ASC`,
		folderID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var vars []models.Variable
	for rows.Next() {
		var v models.Variable
		if err := rows.Scan(&v.ID, &v.Key, &v.Value, &v.CreatedAt, &v.UpdatedAt); err != nil {
			return nil, err
		}
		vars = append(vars, v)
	}
	if vars == nil {
		vars = []models.Variable{}
	}
	return vars, nil
}

// UpdateFolderVariables replaces all variables for a folder (batch replace).
func (db *DB) UpdateFolderVariables(folderID int, variables []models.Variable) error {
	tx, err := db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	if _, err := tx.Exec(`DELETE FROM folder_variables WHERE folder_id = ?`, folderID); err != nil {
		return err
	}
	for _, v := range variables {
		if _, err := tx.Exec(
			`INSERT INTO folder_variables (folder_id, key, value) VALUES (?, ?, ?)`,
			folderID, v.Key, v.Value,
		); err != nil {
			return err
		}
	}
	return tx.Commit()
}

// GetResponseCaptures returns capture rules for a request.
func (db *DB) GetResponseCaptures(requestID int) ([]models.ResponseCapture, error) {
	rows, err := db.Query(
		`SELECT id, request_id, variable_name, json_path FROM response_captures WHERE request_id = ? ORDER BY id ASC`,
		requestID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var captures []models.ResponseCapture
	for rows.Next() {
		var c models.ResponseCapture
		if err := rows.Scan(&c.ID, &c.RequestID, &c.VariableName, &c.JSONPath); err != nil {
			return nil, err
		}
		captures = append(captures, c)
	}
	if captures == nil {
		captures = []models.ResponseCapture{}
	}
	return captures, nil
}

// UpdateResponseCaptures replaces all capture rules for a request (batch replace).
func (db *DB) UpdateResponseCaptures(requestID int, captures []models.ResponseCapture) error {
	tx, err := db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	if _, err := tx.Exec(`DELETE FROM response_captures WHERE request_id = ?`, requestID); err != nil {
		return err
	}
	for _, c := range captures {
		if _, err := tx.Exec(
			`INSERT INTO response_captures (request_id, variable_name, json_path) VALUES (?, ?, ?)`,
			requestID, c.VariableName, c.JSONPath,
		); err != nil {
			return err
		}
	}
	return tx.Commit()
}
