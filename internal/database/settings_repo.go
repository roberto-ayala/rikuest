package database

import (
	"database/sql"
)

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
