package database

import (
	"path/filepath"
	"testing"

	"rikuest/internal/models"
)

func newTestDB(t *testing.T) *DB {
	t.Helper()
	db, err := NewDB(filepath.Join(t.TempDir(), "test.db"))
	if err != nil {
		t.Fatalf("NewDB: %v", err)
	}
	t.Cleanup(func() { db.Close() })
	return db
}

func TestCreateRequestAssignsSequentialPositions(t *testing.T) {
	db := newTestDB(t)

	p := &models.Project{Name: "p", Description: "d"}
	if err := db.CreateProject(p); err != nil {
		t.Fatalf("CreateProject: %v", err)
	}

	r1 := &models.Request{ProjectID: p.ID, Name: "r1", Method: "GET", URL: "http://x"}
	r2 := &models.Request{ProjectID: p.ID, Name: "r2", Method: "GET", URL: "http://x"}
	if err := db.CreateRequest(r1); err != nil {
		t.Fatalf("CreateRequest r1: %v", err)
	}
	if err := db.CreateRequest(r2); err != nil {
		t.Fatalf("CreateRequest r2: %v", err)
	}
	if r1.Position != 0 || r2.Position != 1 {
		t.Errorf("positions = %d, %d; want 0, 1", r1.Position, r2.Position)
	}

	f := &models.Folder{ProjectID: p.ID, Name: "f"}
	if err := db.CreateFolder(f); err != nil {
		t.Fatalf("CreateFolder: %v", err)
	}
	if f.Position != 0 {
		t.Errorf("folder position = %d; want 0", f.Position)
	}

	// Requests inside a folder get their own position sequence
	r3 := &models.Request{ProjectID: p.ID, FolderID: &f.ID, Name: "r3", Method: "GET", URL: "http://x"}
	if err := db.CreateRequest(r3); err != nil {
		t.Fatalf("CreateRequest r3: %v", err)
	}
	if r3.Position != 0 {
		t.Errorf("in-folder position = %d; want 0", r3.Position)
	}
}

func TestForeignKeysEnforced(t *testing.T) {
	db := newTestDB(t)

	bad := &models.Request{ProjectID: 9999, Name: "bad", Method: "GET", URL: "http://x"}
	if err := db.CreateRequest(bad); err == nil {
		t.Fatal("CreateRequest with missing project succeeded; foreign keys are not enforced")
	}
}

func TestDeleteProjectCascades(t *testing.T) {
	db := newTestDB(t)

	p := &models.Project{Name: "p", Description: ""}
	if err := db.CreateProject(p); err != nil {
		t.Fatalf("CreateProject: %v", err)
	}
	r := &models.Request{ProjectID: p.ID, Name: "r", Method: "GET", URL: "http://x"}
	if err := db.CreateRequest(r); err != nil {
		t.Fatalf("CreateRequest: %v", err)
	}

	if err := db.DeleteProject(p.ID); err != nil {
		t.Fatalf("DeleteProject: %v", err)
	}
	reqs, err := db.GetRequests(p.ID)
	if err != nil {
		t.Fatalf("GetRequests: %v", err)
	}
	if len(reqs) != 0 {
		t.Errorf("requests after project delete = %d; want 0 (cascade)", len(reqs))
	}
}

func TestMigrationsApplied(t *testing.T) {
	db := newTestDB(t)

	var version int
	if err := db.QueryRow("PRAGMA user_version").Scan(&version); err != nil {
		t.Fatalf("read user_version: %v", err)
	}
	want := migrations[len(migrations)-1].version
	if version != want {
		t.Errorf("user_version = %d; want %d", version, want)
	}

	var count int
	err := db.QueryRow(`SELECT COUNT(*) FROM sqlite_master WHERE type = 'index' AND name = 'idx_requests_project_id'`).Scan(&count)
	if err != nil || count != 1 {
		t.Errorf("idx_requests_project_id missing (count=%d, err=%v)", count, err)
	}

	// Re-opening the same DB must be a no-op, not an error
	db2, err := NewDB(filepath.Join(t.TempDir(), "reopen.db"))
	if err != nil {
		t.Fatalf("NewDB fresh: %v", err)
	}
	db2.Close()
}

func TestTelemetryDisabledByDefault(t *testing.T) {
	db := newTestDB(t)

	tc, err := db.GetTelemetryConfig()
	if err != nil {
		t.Fatalf("GetTelemetryConfig: %v", err)
	}
	if tc.Enabled {
		t.Error("telemetry enabled by default; want opt-in (disabled)")
	}
}
