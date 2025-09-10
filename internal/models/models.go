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
	ID          int               `json:"id" db:"id"`
	ProjectID   int               `json:"project_id" db:"project_id"`
	FolderID    *int              `json:"folder_id" db:"folder_id"`
	Name        string            `json:"name" db:"name"`
	Method      string            `json:"method" db:"method"`
	URL         string            `json:"url" db:"url"`
	Headers     map[string]string `json:"headers" db:"headers"`
	Body        string            `json:"body" db:"body"`
	QueryParams []QueryParam      `json:"query_params" db:"query_params"`
	AuthType    string            `json:"auth_type" db:"auth_type"`
	BearerToken string            `json:"bearer_token" db:"bearer_token"`
	BasicAuth   BasicAuth         `json:"basic_auth" db:"basic_auth"`
	BodyType    string            `json:"body_type" db:"body_type"`
	FormData    []FormData        `json:"form_data" db:"form_data"`
	Position    int               `json:"position" db:"position"`
	Response    *RequestResponse  `json:"response,omitempty"`
	CreatedAt   time.Time         `json:"created_at" db:"created_at"`
	UpdatedAt   time.Time         `json:"updated_at" db:"updated_at"`
}

type RequestResponse struct {
	Status     int               `json:"status"`
	StatusText string            `json:"status_text"`
	Headers    map[string]string `json:"headers"`
	Body       string            `json:"body"`
	Duration   int64             `json:"duration"`
	Size       int64             `json:"size"`
	RawRequest string            `json:"raw_request"`
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
