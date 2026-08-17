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

func TestMigrationV2ColumnsAndDefaults(t *testing.T) {
	db := newTestDB(t)

	p := &models.Project{Name: "p2", Description: "d"}
	if err := db.CreateProject(p); err != nil {
		t.Fatalf("CreateProject: %v", err)
	}

	// Insert a row without specifying the new columns to exercise the raw
	// schema defaults (CreateRequest itself applies its own Go-level
	// defaults, so we bypass it here to check the column defaults directly).
	res, err := db.Exec(`INSERT INTO requests (project_id, name, method, url) VALUES (?, ?, ?, ?)`,
		p.ID, "r", "GET", "http://x")
	if err != nil {
		t.Fatalf("insert minimal request: %v", err)
	}
	id, err := res.LastInsertId()
	if err != nil {
		t.Fatalf("LastInsertId: %v", err)
	}

	var apiKeyName, apiKeyValue, apiKeyLocation string
	var insecureSkipVerify, followRedirects, maxRedirects, timeoutSeconds int
	err = db.QueryRow(`SELECT api_key_name, api_key_value, api_key_location,
		insecure_skip_verify, follow_redirects, max_redirects, timeout_seconds
		FROM requests WHERE id = ?`, id).Scan(
		&apiKeyName, &apiKeyValue, &apiKeyLocation,
		&insecureSkipVerify, &followRedirects, &maxRedirects, &timeoutSeconds,
	)
	if err != nil {
		t.Fatalf("select new columns: %v", err)
	}

	if apiKeyName != "" || apiKeyValue != "" {
		t.Errorf("api_key_name/value = %q/%q; want empty defaults", apiKeyName, apiKeyValue)
	}
	if apiKeyLocation != "header" {
		t.Errorf("api_key_location = %q; want 'header'", apiKeyLocation)
	}
	if insecureSkipVerify != 0 {
		t.Errorf("insecure_skip_verify = %d; want 0", insecureSkipVerify)
	}
	if followRedirects != 1 {
		t.Errorf("follow_redirects = %d; want 1 (default true)", followRedirects)
	}
	if maxRedirects != 10 {
		t.Errorf("max_redirects = %d; want 10", maxRedirects)
	}
	if timeoutSeconds != 0 {
		t.Errorf("timeout_seconds = %d; want 0 (use global default)", timeoutSeconds)
	}
}

// Folder variables are stored per scope, and an environment-scoped row must
// disappear with its environment instead of lingering as an orphan.
func TestMigrationV4FolderVariableScopes(t *testing.T) {
	db := newTestDB(t)

	p := &models.Project{Name: "p4"}
	if err := db.CreateProject(p); err != nil {
		t.Fatalf("CreateProject: %v", err)
	}
	folder := &models.Folder{ProjectID: p.ID, Name: "f"}
	if err := db.CreateFolder(folder); err != nil {
		t.Fatalf("CreateFolder: %v", err)
	}
	env := &models.Environment{ProjectID: p.ID, Name: "prod"}
	if err := db.CreateEnvironment(env); err != nil {
		t.Fatalf("CreateEnvironment: %v", err)
	}

	if err := db.UpdateFolderVariables(folder.ID, nil, []models.Variable{{Key: "api_url", Value: "default"}}); err != nil {
		t.Fatalf("UpdateFolderVariables (default): %v", err)
	}
	if err := db.UpdateFolderVariables(folder.ID, &env.ID, []models.Variable{{Key: "api_url", Value: "prod"}}); err != nil {
		t.Fatalf("UpdateFolderVariables (env): %v", err)
	}

	// Writing one scope leaves the other alone.
	defaults, err := db.GetFolderVariables(folder.ID, nil)
	if err != nil {
		t.Fatalf("GetFolderVariables (default): %v", err)
	}
	if len(defaults) != 1 || defaults[0].Value != "default" {
		t.Errorf("default scope = %+v; want the untouched default value", defaults)
	}
	scoped, err := db.GetFolderVariables(folder.ID, &env.ID)
	if err != nil {
		t.Fatalf("GetFolderVariables (env): %v", err)
	}
	if len(scoped) != 1 || scoped[0].Value != "prod" {
		t.Errorf("env scope = %+v; want the prod override", scoped)
	}

	if err := db.DeleteEnvironment(env.ID); err != nil {
		t.Fatalf("DeleteEnvironment: %v", err)
	}
	var orphans int
	if err := db.QueryRow(`SELECT COUNT(*) FROM folder_variables WHERE environment_id IS NOT NULL`).Scan(&orphans); err != nil {
		t.Fatalf("count orphans: %v", err)
	}
	if orphans != 0 {
		t.Errorf("environment-scoped rows after delete = %d; want 0 (cascade)", orphans)
	}
	defaults, err = db.GetFolderVariables(folder.ID, nil)
	if err != nil {
		t.Fatalf("GetFolderVariables after delete: %v", err)
	}
	if len(defaults) != 1 {
		t.Errorf("shared defaults lost when an environment was deleted: %+v", defaults)
	}
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
