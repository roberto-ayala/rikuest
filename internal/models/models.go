package models

import (
	"time"
)

type Project struct {
	ID          int       `json:"id" db:"id"`
	Name        string    `json:"name" db:"name"`
	Description string    `json:"description" db:"description"`
	CreatedAt   time.Time `json:"created_at" db:"created_at"`
	UpdatedAt   time.Time `json:"updated_at" db:"updated_at"`
}

type QueryParam struct {
	Key     string `json:"key"`
	Value   string `json:"value"`
	Enabled bool   `json:"enabled"`
}

type FormData struct {
	Key   string `json:"key"`
	Value string `json:"value"`
}

type BasicAuth struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type Folder struct {
	ID        int       `json:"id" db:"id"`
	ProjectID int       `json:"project_id" db:"project_id"`
	Name      string    `json:"name" db:"name"`
	ParentID  *int      `json:"parent_id" db:"parent_id"`
	Position  int       `json:"position" db:"position"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
	UpdatedAt time.Time `json:"updated_at" db:"updated_at"`
}

type Request struct {
	ID                 int               `json:"id" db:"id"`
	ProjectID          int               `json:"project_id" db:"project_id"`
	FolderID           *int              `json:"folder_id" db:"folder_id"`
	Name               string            `json:"name" db:"name"`
	Method             string            `json:"method" db:"method"`
	URL                string            `json:"url" db:"url"`
	Headers            map[string]string `json:"headers" db:"headers"`
	Body               string            `json:"body" db:"body"`
	QueryParams        []QueryParam      `json:"query_params" db:"query_params"`
	AuthType           string            `json:"auth_type" db:"auth_type"`
	BearerToken        string            `json:"bearer_token" db:"bearer_token"`
	BasicAuth          BasicAuth         `json:"basic_auth" db:"basic_auth"`
	ApiKeyName         string            `json:"api_key_name" db:"api_key_name"`
	ApiKeyValue        string            `json:"api_key_value" db:"api_key_value"`
	ApiKeyLocation     string            `json:"api_key_location" db:"api_key_location"`
	BodyType           string            `json:"body_type" db:"body_type"`
	FormData           []FormData        `json:"form_data" db:"form_data"`
	Position           int               `json:"position" db:"position"`
	InsecureSkipVerify bool              `json:"insecure_skip_verify" db:"insecure_skip_verify"`
	FollowRedirects    bool              `json:"follow_redirects" db:"follow_redirects"`
	MaxRedirects       int               `json:"max_redirects" db:"max_redirects"`
	TimeoutSeconds     int               `json:"timeout_seconds" db:"timeout_seconds"`
	Response           *RequestResponse  `json:"response,omitempty"`
	CreatedAt          time.Time         `json:"created_at" db:"created_at"`
	UpdatedAt          time.Time         `json:"updated_at" db:"updated_at"`
}

type RequestResponse struct {
	Status     int               `json:"status"`
	StatusText string            `json:"status_text"`
	Headers    map[string]string `json:"headers"`
	Body       string            `json:"body"`
	Duration   int64             `json:"duration"`
	Size       int64             `json:"size"`
	RawRequest string            `json:"raw_request"`
	// Captures reports, per configured capture rule, whether the value was
	// stored into the active environment and why not when it wasn't. It is
	// diagnostic output for the UI, so it is omitted when there are no rules.
	Captures []CaptureResult `json:"captures,omitempty"`
}

// Capture result statuses, reported back to the UI so a rule that silently
// does nothing (no active environment, non-JSON body, wrong path) is visible.
const (
	CaptureApplied            = "applied"
	CaptureNoEnvironment      = "no_active_environment"
	CaptureInvalidJSON        = "invalid_json"
	CapturePathNotFound       = "path_not_found"
	CaptureSkippedErrorStatus = "skipped_error_status"
	CaptureFailed             = "failed"
)

type CaptureResult struct {
	VariableName string `json:"variable_name"`
	JSONPath     string `json:"json_path"`
	Status       string `json:"status"`
	Value        string `json:"value,omitempty"`
	Detail       string `json:"detail,omitempty"`
}

type RequestHistory struct {
	ID         int             `json:"id" db:"id"`
	RequestID  int             `json:"request_id" db:"request_id"`
	Response   RequestResponse `json:"response" db:"response"`
	ExecutedAt time.Time       `json:"executed_at" db:"executed_at"`
}

type CopyRequestResponse struct {
	Format  string `json:"format"`
	Content string `json:"content"`
}

type TelemetryConfig struct {
	Enabled        bool   `json:"enabled" db:"enabled"`
	WebhookURL     string `json:"webhook_url" db:"webhook_url"`
	InstallationID string `json:"installation_id" db:"installation_id"`
}

// ===== VARIABLE SYSTEM =====

type Variable struct {
	ID        int       `json:"id"`
	Key       string    `json:"key"`
	Value     string    `json:"value"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// Variable sources, as reported by VariableResolver.ListVariables.
const (
	VariableSourceEnvironment = "environment"
	VariableSourceFolder      = "folder"
)

// VariableInfo is a resolved variable plus where its winning value came from.
// It feeds the {{name}} autocomplete/highlighting in the request builder, so
// the shape mirrors resolution precedence: one entry per effective key.
type VariableInfo struct {
	Key        string `json:"key"`
	Value      string `json:"value"`
	Source     string `json:"source"`
	SourceName string `json:"source_name"`
}

type Environment struct {
	ID        int        `json:"id"`
	ProjectID int        `json:"project_id"`
	Name      string     `json:"name"`
	IsActive  bool       `json:"is_active"`
	Variables []Variable `json:"variables"`
	CreatedAt time.Time  `json:"created_at"`
	UpdatedAt time.Time  `json:"updated_at"`
}

// ===== COOKIE JAR =====

type Cookie struct {
	ID        int        `json:"id" db:"id"`
	ProjectID int        `json:"project_id" db:"project_id"`
	Domain    string     `json:"domain" db:"domain"`
	Path      string     `json:"path" db:"path"`
	Name      string     `json:"name" db:"name"`
	Value     string     `json:"value" db:"value"`
	ExpiresAt *time.Time `json:"expires_at" db:"expires_at"`
	Secure    bool       `json:"secure" db:"secure"`
	HttpOnly  bool       `json:"http_only" db:"http_only"`
	SameSite  string     `json:"same_site" db:"same_site"`
	CreatedAt time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt time.Time  `json:"updated_at" db:"updated_at"`
}

type ResponseCapture struct {
	ID           int    `json:"id"`
	RequestID    int    `json:"request_id"`
	VariableName string `json:"variable_name"`
	JSONPath     string `json:"json_path"`
}
