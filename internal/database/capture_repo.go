package database

import (
	"rikuest/internal/models"
)

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
