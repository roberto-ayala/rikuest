package services

import (
	"encoding/json"
	"fmt"
	"strings"

	"rikuest/internal/database"
	"rikuest/internal/models"
)

type ResponseCaptureService struct {
	db *database.DB
}

func NewResponseCaptureService(db *database.DB) *ResponseCaptureService {
	return &ResponseCaptureService{db: db}
}

func (s *ResponseCaptureService) GetCaptures(requestID int) ([]models.ResponseCapture, error) {
	return s.db.GetResponseCaptures(requestID)
}

func (s *ResponseCaptureService) UpdateCaptures(requestID int, captures []models.ResponseCapture) error {
	return s.db.UpdateResponseCaptures(requestID, captures)
}

// ApplyCaptures extracts values from a JSON response body using dot notation
// and stores them into the active environment. Errors are silent (non-blocking).
func (s *ResponseCaptureService) ApplyCaptures(requestID int, projectID int, responseBody string) error {
	captures, err := s.db.GetResponseCaptures(requestID)
	if err != nil || len(captures) == 0 {
		return nil
	}

	activeEnv, err := s.db.GetActiveEnvironment(projectID)
	if err != nil || activeEnv == nil {
		return nil // no active environment, nowhere to store captures
	}

	var jsonData interface{}
	if err := json.Unmarshal([]byte(responseBody), &jsonData); err != nil {
		return nil // non-JSON response, skip silently
	}

	for _, capture := range captures {
		if capture.VariableName == "" || capture.JSONPath == "" {
			continue
		}
		value, err := extractDotPath(jsonData, capture.JSONPath)
		if err != nil {
			continue
		}
		_ = s.db.UpsertEnvironmentVariable(activeEnv.ID, capture.VariableName, fmt.Sprintf("%v", value))
	}
	return nil
}

// extractDotPath navigates a parsed JSON value using dot notation.
// Supports: "token", "data.token", "data.user.id"
func extractDotPath(data interface{}, path string) (interface{}, error) {
	parts := strings.Split(path, ".")
	current := data
	for _, part := range parts {
		m, ok := current.(map[string]interface{})
		if !ok {
			return nil, fmt.Errorf("path %q: not an object at segment %q", path, part)
		}
		val, exists := m[part]
		if !exists {
			return nil, fmt.Errorf("path %q: key %q not found", path, part)
		}
		current = val
	}
	return current, nil
}
