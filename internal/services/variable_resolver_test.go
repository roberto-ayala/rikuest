package services

import (
	"testing"

	"rikuest/internal/models"
)

func TestResolve(t *testing.T) {
	r := &VariableResolver{}
	vars := map[string]string{"host": "api.example.com", "token": "abc123", "empty": ""}

	tests := []struct {
		name, in, want string
	}{
		{"single variable", "https://{{host}}/users", "https://api.example.com/users"},
		{"multiple variables", "{{host}}:{{token}}", "api.example.com:abc123"},
		{"unknown variable left literal", "https://{{unknown}}/x", "https://{{unknown}}/x"},
		{"empty value substituted", "a{{empty}}b", "ab"},
		{"no variables", "plain text", "plain text"},
		{"malformed braces ignored", "{{not closed", "{{not closed"},
		{"nested-looking", "{{{host}}}", "{api.example.com}"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := r.Resolve(tt.in, vars); got != tt.want {
				t.Errorf("Resolve(%q) = %q; want %q", tt.in, got, tt.want)
			}
		})
	}
}

func TestResolveRequestDoesNotMutateOriginal(t *testing.T) {
	r := &VariableResolver{}
	vars := map[string]string{"host": "api.example.com", "key": "secret"}

	original := &models.Request{
		URL:         "https://{{host}}/v1",
		Body:        `{"key": "{{key}}"}`,
		BearerToken: "{{key}}",
		Headers:     map[string]string{"X-Api-Key": "{{key}}"},
		QueryParams: []models.QueryParam{{Key: "q", Value: "{{key}}", Enabled: true}},
		BasicAuth:   models.BasicAuth{Username: "{{key}}", Password: "{{key}}"},
		FormData:    []models.FormData{{Key: "f", Value: "{{key}}"}},
	}

	resolved := r.ResolveRequest(original, vars)

	if resolved.URL != "https://api.example.com/v1" {
		t.Errorf("URL = %q", resolved.URL)
	}
	if resolved.Body != `{"key": "secret"}` {
		t.Errorf("Body = %q", resolved.Body)
	}
	if resolved.BearerToken != "secret" || resolved.Headers["X-Api-Key"] != "secret" ||
		resolved.QueryParams[0].Value != "secret" || resolved.BasicAuth.Username != "secret" ||
		resolved.FormData[0].Value != "secret" {
		t.Error("not all fields were resolved")
	}

	// Original untouched
	if original.URL != "https://{{host}}/v1" || original.Headers["X-Api-Key"] != "{{key}}" ||
		original.QueryParams[0].Value != "{{key}}" || original.FormData[0].Value != "{{key}}" {
		t.Error("ResolveRequest mutated the original request")
	}
}

func TestBuildVariableMapPrecedence(t *testing.T) {
	db := newTestDB(t)
	p := createProject(t, db, "p")
	createActiveEnv(t, db, p.ID, map[string]string{"host": "env-host", "shared": "from-env"})

	folder := &models.Folder{ProjectID: p.ID, Name: "f"}
	if err := db.CreateFolder(folder); err != nil {
		t.Fatalf("CreateFolder: %v", err)
	}
	err := db.UpdateFolderVariables(folder.ID, []models.Variable{{Key: "shared", Value: "from-folder"}})
	if err != nil {
		t.Fatalf("UpdateFolderVariables: %v", err)
	}

	r := NewVariableResolver(db)

	// Without folder: env vars only
	vars, err := r.BuildVariableMap(p.ID, nil)
	if err != nil {
		t.Fatalf("BuildVariableMap: %v", err)
	}
	if vars["host"] != "env-host" || vars["shared"] != "from-env" {
		t.Errorf("env-only map = %v", vars)
	}

	// With folder: folder vars override env vars
	vars, err = r.BuildVariableMap(p.ID, &folder.ID)
	if err != nil {
		t.Fatalf("BuildVariableMap with folder: %v", err)
	}
	if vars["shared"] != "from-folder" {
		t.Errorf("folder override failed: shared = %q; want from-folder", vars["shared"])
	}
	if vars["host"] != "env-host" {
		t.Errorf("env var lost when folder present: host = %q", vars["host"])
	}
}

func TestBuildVariableMapNoActiveEnvironment(t *testing.T) {
	db := newTestDB(t)
	p := createProject(t, db, "p")

	vars, err := NewVariableResolver(db).BuildVariableMap(p.ID, nil)
	if err != nil {
		t.Fatalf("BuildVariableMap: %v", err)
	}
	if len(vars) != 0 {
		t.Errorf("expected empty map, got %v", vars)
	}
}
