package services

import (
	"encoding/json"
	"testing"

	"rikuest/internal/models"
)

func TestExtractDotPath(t *testing.T) {
	var data interface{}
	if err := json.Unmarshal([]byte(`{
		"token": "abc",
		"data": {"user": {"id": 42}, "list": [1, 2]},
		"null_field": null
	}`), &data); err != nil {
		t.Fatal(err)
	}

	tests := []struct {
		name, path string
		want       interface{}
		wantErr    bool
	}{
		{"top-level key", "token", "abc", false},
		{"nested key", "data.user.id", float64(42), false},
		{"null value", "null_field", nil, false},
		{"missing key", "nope", nil, true},
		{"missing nested key", "data.nope", nil, true},
		{"array index", "data.list.0", float64(1), false},
		{"array index in brackets", "data.list[1]", float64(2), false},
		{"array index out of range", "data.list.9", nil, true},
		{"array index not numeric", "data.list.nope", nil, true},
		{"unclosed bracket", "data.list[0", nil, true},
		{"empty path", "", nil, true},
		{"through scalar fails", "token.sub", nil, true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := extractDotPath(data, tt.path)
			if (err != nil) != tt.wantErr {
				t.Fatalf("extractDotPath(%q) error = %v; wantErr %v", tt.path, err, tt.wantErr)
			}
			if !tt.wantErr && got != tt.want {
				t.Errorf("extractDotPath(%q) = %v; want %v", tt.path, got, tt.want)
			}
		})
	}
}

func TestApplyCapturesStoresIntoActiveEnvironment(t *testing.T) {
	db := newTestDB(t)
	p := createProject(t, db, "p")
	env := createActiveEnv(t, db, p.ID, nil)

	req := &models.Request{ProjectID: p.ID, Name: "r", Method: "POST", URL: "http://x"}
	if err := db.CreateRequest(req); err != nil {
		t.Fatalf("CreateRequest: %v", err)
	}
	err := db.UpdateResponseCaptures(req.ID, []models.ResponseCapture{
		{VariableName: "auth_token", JSONPath: "data.token"},
		{VariableName: "missing", JSONPath: "data.nope"},
	})
	if err != nil {
		t.Fatalf("UpdateResponseCaptures: %v", err)
	}

	svc := NewResponseCaptureService(db)
	results := svc.ApplyCaptures(req.ID, p.ID, `{"data": {"token": "tok-123"}}`)
	if len(results) != 2 {
		t.Fatalf("results = %+v; want one per rule", results)
	}
	if results[0].Status != models.CaptureApplied || results[0].Value != "tok-123" {
		t.Errorf("applied rule reported as %+v", results[0])
	}
	if results[1].Status != models.CapturePathNotFound {
		t.Errorf("missing-path rule reported as %+v", results[1])
	}

	active, err := db.GetActiveEnvironment(p.ID)
	if err != nil {
		t.Fatalf("GetActiveEnvironment: %v", err)
	}
	if active.ID != env.ID {
		t.Fatalf("active env changed")
	}
	found := map[string]string{}
	for _, v := range active.Variables {
		found[v.Key] = v.Value
	}
	if found["auth_token"] != "tok-123" {
		t.Errorf("auth_token = %q; want tok-123 (vars: %v)", found["auth_token"], found)
	}
	if _, exists := found["missing"]; exists {
		t.Error("capture with missing path should not create a variable")
	}
}

func TestApplyCapturesReportsWhyItDidNothing(t *testing.T) {
	db := newTestDB(t)
	p := createProject(t, db, "p")
	req := &models.Request{ProjectID: p.ID, Name: "r", Method: "GET", URL: "http://x"}
	if err := db.CreateRequest(req); err != nil {
		t.Fatalf("CreateRequest: %v", err)
	}
	svc := NewResponseCaptureService(db)

	// No rules at all: nothing to report.
	if results := svc.ApplyCaptures(req.ID, p.ID, "not json at all"); results != nil {
		t.Errorf("ApplyCaptures without rules = %+v; want nil", results)
	}

	if err := db.UpdateResponseCaptures(req.ID, []models.ResponseCapture{
		{VariableName: "token", JSONPath: "token"},
		{VariableName: "", JSONPath: "ignored"}, // half-written row, must be dropped
	}); err != nil {
		t.Fatalf("UpdateResponseCaptures: %v", err)
	}

	// A project with no active environment has nowhere to store captures: the
	// rule must be reported rather than silently skipped.
	results := svc.ApplyCaptures(req.ID, p.ID, `{"token": "abc"}`)
	if len(results) != 1 || results[0].Status != models.CaptureNoEnvironment {
		t.Fatalf("without active env = %+v; want single no_active_environment", results)
	}

	createActiveEnv(t, db, p.ID, nil)
	results = svc.ApplyCaptures(req.ID, p.ID, "not json at all")
	if len(results) != 1 || results[0].Status != models.CaptureInvalidJSON {
		t.Fatalf("on non-JSON = %+v; want single invalid_json", results)
	}

	skipped := svc.SkippedResults(req.ID, models.CaptureSkippedErrorStatus, "status 500")
	if len(skipped) != 1 || skipped[0].Status != models.CaptureSkippedErrorStatus {
		t.Fatalf("SkippedResults = %+v", skipped)
	}
}

func TestStringifyCaptured(t *testing.T) {
	var data interface{}
	if err := json.Unmarshal([]byte(`{
		"int": 42,
		"float": 1.5,
		"bool": true,
		"null": null,
		"obj": {"a": 1},
		"arr": [1, "two"]
	}`), &data); err != nil {
		t.Fatal(err)
	}

	tests := map[string]string{
		"int":   "42",
		"float": "1.5",
		"bool":  "true",
		"null":  "",
		"obj":   `{"a":1}`,
		"arr":   `[1,"two"]`,
	}
	for path, want := range tests {
		value, err := extractDotPath(data, path)
		if err != nil {
			t.Fatalf("extractDotPath(%q): %v", path, err)
		}
		if got := stringifyCaptured(value); got != want {
			t.Errorf("stringifyCaptured(%s) = %q; want %q", path, got, want)
		}
	}
}
