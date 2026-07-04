package services

import (
	"path/filepath"
	"testing"

	"rikuest/internal/database"
	"rikuest/internal/models"
)

func newTestDB(t *testing.T) *database.DB {
	t.Helper()
	db, err := database.NewDB(filepath.Join(t.TempDir(), "test.db"))
	if err != nil {
		t.Fatalf("NewDB: %v", err)
	}
	t.Cleanup(func() { db.Close() })
	return db
}

func createProject(t *testing.T, db *database.DB, name string) *models.Project {
	t.Helper()
	p := &models.Project{Name: name}
	if err := db.CreateProject(p); err != nil {
		t.Fatalf("CreateProject: %v", err)
	}
	return p
}

// createActiveEnv creates an environment with the given variables and marks it active.
func createActiveEnv(t *testing.T, db *database.DB, projectID int, vars map[string]string) *models.Environment {
	t.Helper()
	env := &models.Environment{ProjectID: projectID, Name: "test-env"}
	if err := db.CreateEnvironment(env); err != nil {
		t.Fatalf("CreateEnvironment: %v", err)
	}
	var list []models.Variable
	for k, v := range vars {
		list = append(list, models.Variable{Key: k, Value: v})
	}
	if err := db.UpdateEnvironmentVariables(env.ID, list); err != nil {
		t.Fatalf("UpdateEnvironmentVariables: %v", err)
	}
	if err := db.SetActiveEnvironment(projectID, env.ID); err != nil {
		t.Fatalf("SetActiveEnvironment: %v", err)
	}
	return env
}
