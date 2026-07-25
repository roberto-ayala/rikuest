package services

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"rikuest/internal/models"
)

// End-to-end: a capture rule must reach the active environment through the real
// ExecuteRequest path, and the response must report what happened.
func TestExecuteRequestAppliesCaptures(t *testing.T) {
	db := newTestDB(t)
	svc := NewRequestService(db, NewVariableResolver(db), NewResponseCaptureService(db), NewCookieService(db))

	status := http.StatusOK
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(status)
		w.Write([]byte(`{"data":{"tokens":[{"access":"tok-999"}]}}`))
	}))
	defer server.Close()

	p := createProject(t, db, "p")
	env := createActiveEnv(t, db, p.ID, map[string]string{"access_token": "stale"})

	req := &models.Request{ProjectID: p.ID, Name: "login", Method: "GET", URL: server.URL}
	if err := db.CreateRequest(req); err != nil {
		t.Fatalf("CreateRequest: %v", err)
	}
	if err := db.UpdateResponseCaptures(req.ID, []models.ResponseCapture{
		{VariableName: "access_token", JSONPath: "data.tokens[0].access"},
	}); err != nil {
		t.Fatalf("UpdateResponseCaptures: %v", err)
	}

	resp, err := svc.ExecuteRequest(context.Background(), req.ID)
	if err != nil {
		t.Fatalf("ExecuteRequest: %v", err)
	}
	if len(resp.Captures) != 1 || resp.Captures[0].Status != models.CaptureApplied {
		t.Fatalf("resp.Captures = %+v; want one applied", resp.Captures)
	}

	active, err := db.GetActiveEnvironment(p.ID)
	if err != nil {
		t.Fatalf("GetActiveEnvironment: %v", err)
	}
	if active.ID != env.ID {
		t.Fatalf("active environment changed")
	}
	for _, v := range active.Variables {
		if v.Key == "access_token" && v.Value != "tok-999" {
			t.Fatalf("access_token = %q; want tok-999", v.Value)
		}
	}

	// A non-2xx response must not overwrite the captured value, and must say so.
	status = http.StatusInternalServerError
	resp, err = svc.ExecuteRequest(context.Background(), req.ID)
	if err != nil {
		t.Fatalf("ExecuteRequest (500): %v", err)
	}
	if len(resp.Captures) != 1 || resp.Captures[0].Status != models.CaptureSkippedErrorStatus {
		t.Fatalf("resp.Captures on 500 = %+v; want skipped_error_status", resp.Captures)
	}
}
