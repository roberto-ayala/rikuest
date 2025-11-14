package services

import (
	"strconv"
	"time"

	"rikuest/internal/database"
)

type ConfigService struct {
	db *database.DB
}

func NewConfigService(db *database.DB) *ConfigService {
	return &ConfigService{db: db}
}

// GetRequestTimeout returns the configured request timeout in seconds
// Defaults to 300 seconds (5 minutes) if not set
// Maximum allowed is 3 hours (10800 seconds)
func (s *ConfigService) GetRequestTimeout() (time.Duration, error) {
	value, err := s.db.GetSetting("request_timeout_seconds")
	if err != nil {
		return 300 * time.Second, err
	}
	
	if value == "" {
		return 300 * time.Second, nil
	}
	
	seconds, err := strconv.Atoi(value)
	if err != nil {
		return 300 * time.Second, err
	}
	
	// Ensure minimum of 1 second and maximum of 3 hours (10800 seconds)
	if seconds < 1 {
		seconds = 1
	}
	if seconds > 10800 {
		seconds = 10800
	}
	
	return time.Duration(seconds) * time.Second, nil
}

// SetRequestTimeout sets the request timeout in seconds
// Maximum allowed is 3 hours (10800 seconds)
func (s *ConfigService) SetRequestTimeout(seconds int) error {
	// Ensure minimum of 1 second and maximum of 3 hours (10800 seconds)
	if seconds < 1 {
		seconds = 1
	}
	if seconds > 10800 {
		seconds = 10800
	}
	
	return s.db.SetSetting("request_timeout_seconds", strconv.Itoa(seconds))
}

// GetRequestTimeoutSeconds returns the timeout as an integer (for frontend)
func (s *ConfigService) GetRequestTimeoutSeconds() (int, error) {
	timeout, err := s.GetRequestTimeout()
	if err != nil {
		return 300, err
	}
	return int(timeout.Seconds()), nil
}

