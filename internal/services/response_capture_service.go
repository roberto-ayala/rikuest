package services

import (
	"encoding/json"
	"fmt"
	"slices"
	"strconv"
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

// ApplyCaptures extracts values from a JSON response body and stores them into
// the active environment. It never fails the request: every rule is reported
// back through a CaptureResult so the UI can explain why a rule did nothing
// (no active environment, non-JSON body, path not found).
func (s *ResponseCaptureService) ApplyCaptures(requestID int, projectID int, responseBody string) []models.CaptureResult {
	captures, err := s.db.GetResponseCaptures(requestID)
	if err != nil || len(captures) == 0 {
		return nil
	}

	captures = validCaptures(captures)
	if len(captures) == 0 {
		return nil
	}

	activeEnv, err := s.db.GetActiveEnvironment(projectID)
	if err != nil || activeEnv == nil {
		// Nowhere to store the values: report it instead of silently skipping,
		// which used to look like the capture feature being broken.
		return allWithStatus(captures, models.CaptureNoEnvironment, "")
	}

	var jsonData interface{}
	if err := json.Unmarshal([]byte(responseBody), &jsonData); err != nil {
		return allWithStatus(captures, models.CaptureInvalidJSON, "response body is not valid JSON")
	}

	results := make([]models.CaptureResult, 0, len(captures))
	for _, capture := range captures {
		result := models.CaptureResult{VariableName: capture.VariableName, JSONPath: capture.JSONPath}

		value, err := extractDotPath(jsonData, capture.JSONPath)
		if err != nil {
			result.Status = models.CapturePathNotFound
			result.Detail = err.Error()
			results = append(results, result)
			continue
		}

		stored := stringifyCaptured(value)
		if err := s.db.UpsertEnvironmentVariable(activeEnv.ID, capture.VariableName, stored); err != nil {
			result.Status = models.CaptureFailed
			result.Detail = err.Error()
			results = append(results, result)
			continue
		}

		result.Status = models.CaptureApplied
		result.Value = stored
		results = append(results, result)
	}
	return results
}

// SkippedResults reports every configured rule as skipped, used when the
// response status makes capturing inapplicable.
func (s *ResponseCaptureService) SkippedResults(requestID int, status string, detail string) []models.CaptureResult {
	captures, err := s.db.GetResponseCaptures(requestID)
	if err != nil {
		return nil
	}
	captures = validCaptures(captures)
	if len(captures) == 0 {
		return nil
	}
	return allWithStatus(captures, status, detail)
}

// validCaptures drops half-written rules (a row with only one field filled in).
func validCaptures(captures []models.ResponseCapture) []models.ResponseCapture {
	valid := make([]models.ResponseCapture, 0, len(captures))
	for _, c := range captures {
		if strings.TrimSpace(c.VariableName) == "" || strings.TrimSpace(c.JSONPath) == "" {
			continue
		}
		valid = append(valid, c)
	}
	return valid
}

func allWithStatus(captures []models.ResponseCapture, status string, detail string) []models.CaptureResult {
	results := make([]models.CaptureResult, 0, len(captures))
	for _, c := range captures {
		results = append(results, models.CaptureResult{
			VariableName: c.VariableName,
			JSONPath:     c.JSONPath,
			Status:       status,
			Detail:       detail,
		})
	}
	return results
}

// stringifyCaptured renders an extracted JSON value as the string stored in the
// variable: scalars keep their literal form (no float formatting artifacts for
// integers), null becomes empty, and objects/arrays are re-encoded as JSON
// instead of Go's map/slice syntax.
func stringifyCaptured(value interface{}) string {
	switch v := value.(type) {
	case nil:
		return ""
	case string:
		return v
	case bool:
		return strconv.FormatBool(v)
	case float64:
		return strconv.FormatFloat(v, 'f', -1, 64)
	case json.Number:
		return v.String()
	default:
		encoded, err := json.Marshal(v)
		if err != nil {
			return fmt.Sprintf("%v", v)
		}
		return string(encoded)
	}
}

// extractDotPath navigates a parsed JSON value using dot notation, with array
// indices written either as a bare segment or in brackets.
// Supports: "token", "data.token", "data.users.0.id", "data.users[0].id"
func extractDotPath(data interface{}, path string) (interface{}, error) {
	segments, err := splitPath(path)
	if err != nil {
		return nil, err
	}

	current := data
	for _, segment := range segments {
		switch container := current.(type) {
		case map[string]interface{}:
			val, exists := container[segment]
			if !exists {
				return nil, fmt.Errorf("path %q: key %q not found", path, segment)
			}
			current = val
		case []interface{}:
			index, convErr := strconv.Atoi(segment)
			if convErr != nil {
				return nil, fmt.Errorf("path %q: segment %q is not an array index", path, segment)
			}
			if index < 0 || index >= len(container) {
				return nil, fmt.Errorf("path %q: index %d out of range (length %d)", path, index, len(container))
			}
			current = container[index]
		default:
			return nil, fmt.Errorf("path %q: cannot descend into segment %q", path, segment)
		}
	}
	return current, nil
}

// splitPath turns "data.users[0].id" into ["data", "users", "0", "id"].
func splitPath(path string) ([]string, error) {
	trimmed := strings.TrimSpace(path)
	if trimmed == "" {
		return nil, fmt.Errorf("empty path")
	}

	var segments []string
	for _, part := range strings.Split(trimmed, ".") {
		for part != "" {
			open := strings.IndexByte(part, '[')
			if open == -1 {
				segments = append(segments, part)
				break
			}
			closing := strings.IndexByte(part[open:], ']')
			if closing == -1 {
				return nil, fmt.Errorf("path %q: unclosed '[' in segment %q", path, part)
			}
			closing += open
			if open > 0 {
				segments = append(segments, part[:open])
			}
			index := strings.TrimSpace(part[open+1 : closing])
			if index == "" {
				return nil, fmt.Errorf("path %q: empty index in segment %q", path, part)
			}
			segments = append(segments, index)
			part = part[closing+1:]
		}
	}

	if len(segments) == 0 {
		return nil, fmt.Errorf("path %q: no usable segments", path)
	}
	if slices.Contains(segments, "") {
		return nil, fmt.Errorf("path %q: empty segment", path)
	}
	return segments, nil
}
