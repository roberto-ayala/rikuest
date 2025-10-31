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
	db, err := sql.Open("sqlite3", dataSourceName)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

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
		// Insert default config
		_, err = db.Exec("INSERT INTO telemetry_config (id, enabled, webhook_url, installation_id) VALUES (1, 1, '', '')")
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
		`CREATE TABLE IF NOT EXISTS telemetry_config (
			id INTEGER PRIMARY KEY,
			enabled INTEGER DEFAULT 1,
			webhook_url TEXT DEFAULT '',
			installation_id TEXT DEFAULT ''
		)`,
		`CREATE TABLE IF NOT EXISTS telemetry_events_cache (
			event_hash TEXT PRIMARY KEY,
			timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
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
	return err != nil && (
		errStr == "duplicate column name: query_params" ||
		errStr == "duplicate column name: auth_type" ||
		errStr == "duplicate column name: bearer_token" ||
		errStr == "duplicate column name: basic_auth" ||
		errStr == "duplicate column name: body_type" ||
		errStr == "duplicate column name: form_data" ||
		errStr == "duplicate column name: folder_id" ||
		errStr == "duplicate column name: position")
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
	
	// Get the next position for this folder (or root level)
	var maxPosition int
	if request.FolderID == nil {
		db.QueryRow("SELECT COALESCE(MAX(position), -1) FROM requests WHERE project_id = ? AND folder_id IS NULL", 
			request.ProjectID).Scan(&maxPosition)
	} else {
		db.QueryRow("SELECT COALESCE(MAX(position), -1) FROM requests WHERE project_id = ? AND folder_id = ?", 
			request.ProjectID, request.FolderID).Scan(&maxPosition)
	}
	request.Position = maxPosition + 1
	
	query := `INSERT INTO requests (project_id, folder_id, name, method, url, headers, body, 
			  query_params, auth_type, bearer_token, basic_auth, body_type, form_data, position) 
			  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id, created_at, updated_at`
	err := db.QueryRow(query, request.ProjectID, request.FolderID, request.Name, request.Method, 
		request.URL, string(headersJSON), request.Body, string(queryParamsJSON),
		request.AuthType, request.BearerToken, string(basicAuthJSON), 
		request.BodyType, string(formDataJSON), request.Position).Scan(
		&request.ID, &request.CreatedAt, &request.UpdatedAt,
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
	// Get the next position for this parent folder (or root level)
	var maxPosition int
	if folder.ParentID == nil {
		db.QueryRow("SELECT COALESCE(MAX(position), -1) FROM folders WHERE project_id = ? AND parent_id IS NULL", 
			folder.ProjectID).Scan(&maxPosition)
	} else {
		db.QueryRow("SELECT COALESCE(MAX(position), -1) FROM folders WHERE project_id = ? AND parent_id = ?", 
			folder.ProjectID, folder.ParentID).Scan(&maxPosition)
	}
	folder.Position = maxPosition + 1

	query := `INSERT INTO folders (project_id, name, parent_id, position) 
			  VALUES (?, ?, ?, ?) RETURNING id, created_at, updated_at`
	err := db.QueryRow(query, folder.ProjectID, folder.Name, folder.ParentID, folder.Position).Scan(
		&folder.ID, &folder.CreatedAt, &folder.UpdatedAt,
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