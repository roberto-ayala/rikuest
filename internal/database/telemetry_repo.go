package database

import (
	"rikuest/internal/models"
)

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
