package database

import (
	"encoding/json"
	"fmt"
	"time"

	"rikuest/internal/models"
)

func (db *DB) CreateRequest(request *models.Request) error {
	headersJSON, _ := json.Marshal(request.Headers)
	queryParamsJSON, _ := json.Marshal(request.QueryParams)
	basicAuthJSON, _ := json.Marshal(request.BasicAuth)
	formDataJSON, _ := json.Marshal(request.FormData)

	insecureSkipVerify := 0
	if request.InsecureSkipVerify {
		insecureSkipVerify = 1
	}

	// FollowRedirects/MaxRedirects: a freshly-constructed models.Request has
	// no way to distinguish "the client explicitly wants redirects disabled"
	// from "the client didn't send the field at all" (JSON bool zero-value).
	// New requests default to following redirects (parity with the
	// pre-feature behavior, where the client always followed redirects) with
	// a sane redirect cap; a client that wants different behavior sets it
	// explicitly afterward via UpdateRequest, where the stored value is
	// meaningful because it was already persisted once.
	followRedirects := 1
	maxRedirects := request.MaxRedirects
	if maxRedirects <= 0 {
		maxRedirects = 10
	}
	request.FollowRedirects = true
	request.MaxRedirects = maxRedirects

	// Position is computed inside the INSERT so the MAX(position)+1 read and
	// the write happen atomically (no race between concurrent creates).
	query := `INSERT INTO requests (project_id, folder_id, name, method, url, headers, body,
			  query_params, auth_type, bearer_token, basic_auth, api_key_name, api_key_value, api_key_location,
			  body_type, form_data, insecure_skip_verify, follow_redirects, max_redirects, timeout_seconds, position)
			  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
			  (SELECT COALESCE(MAX(position), -1) + 1 FROM requests WHERE project_id = ? AND folder_id IS ?))
			  RETURNING id, position, created_at, updated_at`
	err := db.QueryRow(query, request.ProjectID, request.FolderID, request.Name, request.Method,
		request.URL, string(headersJSON), request.Body, string(queryParamsJSON),
		request.AuthType, request.BearerToken, string(basicAuthJSON),
		request.ApiKeyName, request.ApiKeyValue, request.ApiKeyLocation,
		request.BodyType, string(formDataJSON),
		insecureSkipVerify, followRedirects, maxRedirects, request.TimeoutSeconds,
		request.ProjectID, request.FolderID).Scan(
		&request.ID, &request.Position, &request.CreatedAt, &request.UpdatedAt,
	)
	return err
}

func (db *DB) GetRequests(projectID int) ([]models.Request, error) {
	query := `SELECT id, project_id, folder_id, name, method, url, headers, body, query_params,
			  auth_type, bearer_token, basic_auth, api_key_name, api_key_value, api_key_location,
			  body_type, form_data, insecure_skip_verify, follow_redirects, max_redirects, timeout_seconds,
			  position, created_at, updated_at
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
		var insecureSkipVerify, followRedirects int
		err := rows.Scan(&request.ID, &request.ProjectID, &folderID, &request.Name, &request.Method,
			&request.URL, &headersJSON, &request.Body, &queryParamsJSON,
			&request.AuthType, &request.BearerToken, &basicAuthJSON,
			&request.ApiKeyName, &request.ApiKeyValue, &request.ApiKeyLocation,
			&request.BodyType, &formDataJSON,
			&insecureSkipVerify, &followRedirects, &request.MaxRedirects, &request.TimeoutSeconds,
			&request.Position, &request.CreatedAt, &request.UpdatedAt)
		if err != nil {
			return nil, err
		}
		request.FolderID = folderID
		request.InsecureSkipVerify = insecureSkipVerify == 1
		request.FollowRedirects = followRedirects == 1
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
			  auth_type, bearer_token, basic_auth, api_key_name, api_key_value, api_key_location,
			  body_type, form_data, insecure_skip_verify, follow_redirects, max_redirects, timeout_seconds,
			  position, created_at, updated_at
			  FROM requests WHERE id = ?`
	var request models.Request
	var headersJSON, queryParamsJSON, basicAuthJSON, formDataJSON string
	var folderID *int
	var insecureSkipVerify, followRedirects int
	err := db.QueryRow(query, id).Scan(
		&request.ID, &request.ProjectID, &folderID, &request.Name, &request.Method,
		&request.URL, &headersJSON, &request.Body, &queryParamsJSON,
		&request.AuthType, &request.BearerToken, &basicAuthJSON,
		&request.ApiKeyName, &request.ApiKeyValue, &request.ApiKeyLocation,
		&request.BodyType, &formDataJSON,
		&insecureSkipVerify, &followRedirects, &request.MaxRedirects, &request.TimeoutSeconds,
		&request.Position, &request.CreatedAt, &request.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	request.FolderID = folderID
	request.InsecureSkipVerify = insecureSkipVerify == 1
	request.FollowRedirects = followRedirects == 1
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
	insecureSkipVerify := 0
	if request.InsecureSkipVerify {
		insecureSkipVerify = 1
	}
	followRedirects := 0
	if request.FollowRedirects {
		followRedirects = 1
	}

	query := `UPDATE requests SET name = ?, method = ?, url = ?, headers = ?, body = ?,
			  query_params = ?, auth_type = ?, bearer_token = ?, basic_auth = ?,
			  api_key_name = ?, api_key_value = ?, api_key_location = ?,
			  body_type = ?, form_data = ?,
			  insecure_skip_verify = ?, follow_redirects = ?, max_redirects = ?, timeout_seconds = ?,
			  folder_id = ?, position = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
	_, err := db.Exec(query, request.Name, request.Method, request.URL,
		string(headersJSON), request.Body, string(queryParamsJSON),
		request.AuthType, request.BearerToken, string(basicAuthJSON),
		request.ApiKeyName, request.ApiKeyValue, request.ApiKeyLocation,
		request.BodyType, string(formDataJSON),
		insecureSkipVerify, followRedirects, request.MaxRedirects, request.TimeoutSeconds,
		request.FolderID, request.Position, request.ID)
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

func (db *DB) MoveRequest(requestID int, folderID *int, position int) error {
	query := `UPDATE requests SET folder_id = ?, position = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
	_, err := db.Exec(query, folderID, position, requestID)
	return err
}

// Telemetry operations
