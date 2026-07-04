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
		{"through array fails", "data.list.0", nil, true},
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
	if err := svc.ApplyCaptures(req.ID, p.ID, `{"data": {"token": "tok-123"}}`); err != nil {
		t.Fatalf("ApplyCaptures: %v", err)
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

func TestApplyCapturesIsSilentOnNonJSONOrNoEnv(t *testing.T) {
	db := newTestDB(t)
	p := createProject(t, db, "p")
	req := &models.Request{ProjectID: p.ID, Name: "r", Method: "GET", URL: "http://x"}
	if err := db.CreateRequest(req); err != nil {
		t.Fatalf("CreateRequest: %v", err)
	}

	svc := NewResponseCaptureService(db)
	// No captures, no env, non-JSON body: all must be nil errors
	if err := svc.ApplyCaptures(req.ID, p.ID, "not json at all"); err != nil {
		t.Errorf("ApplyCaptures on non-JSON = %v; want nil", err)
	}
}
