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
	err := db.UpdateFolderVariables(folder.ID, nil, []models.Variable{{Key: "shared", Value: "from-folder"}})
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

	// With folder: the active environment wins over the folder default, so
	// switching environments still changes the resolved value.
	vars, err = r.BuildVariableMap(p.ID, &folder.ID)
	if err != nil {
		t.Fatalf("BuildVariableMap with folder: %v", err)
	}
	if vars["shared"] != "from-env" {
		t.Errorf("environment must override folder: shared = %q; want from-env", vars["shared"])
	}
	if vars["host"] != "env-host" {
		t.Errorf("env var lost when folder present: host = %q", vars["host"])
	}
}

func TestBuildVariableMapAncestorFolderChain(t *testing.T) {
	db := newTestDB(t)
	p := createProject(t, db, "p")
	// No overlap with the folder keys: this test is about folder-vs-folder
	// ordering, not the environment layer on top of it.
	createActiveEnv(t, db, p.ID, map[string]string{"host": "env-host"})

	root := &models.Folder{ProjectID: p.ID, Name: "root"}
	if err := db.CreateFolder(root); err != nil {
		t.Fatal(err)
	}
	child := &models.Folder{ProjectID: p.ID, Name: "child", ParentID: &root.ID}
	if err := db.CreateFolder(child); err != nil {
		t.Fatal(err)
	}
	if err := db.UpdateFolderVariables(root.ID, nil, []models.Variable{
		{Key: "from_root", Value: "root-val"},
		{Key: "shared", Value: "from-root"},
	}); err != nil {
		t.Fatal(err)
	}
	if err := db.UpdateFolderVariables(child.ID, nil, []models.Variable{
		{Key: "shared", Value: "from-child"},
	}); err != nil {
		t.Fatal(err)
	}

	vars, err := NewVariableResolver(db).BuildVariableMap(p.ID, &child.ID)
	if err != nil {
		t.Fatalf("BuildVariableMap: %v", err)
	}
	if vars["from_root"] != "root-val" {
		t.Errorf("ancestor variable not inherited: from_root = %q", vars["from_root"])
	}
	if vars["shared"] != "from-child" {
		t.Errorf("deepest folder must win: shared = %q; want from-child", vars["shared"])
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

// A captured value is written into the active environment, so it must beat a
// folder variable of the same name — otherwise the capture reports "applied"
// while the request keeps using the stale folder value.
func TestBuildVariableMapCapturedValueBeatsFolder(t *testing.T) {
	db := newTestDB(t)
	p := createProject(t, db, "p")
	env := createActiveEnv(t, db, p.ID, nil)

	folder := &models.Folder{ProjectID: p.ID, Name: "auth"}
	if err := db.CreateFolder(folder); err != nil {
		t.Fatalf("CreateFolder: %v", err)
	}
	if err := db.UpdateFolderVariables(folder.ID, nil, []models.Variable{
		{Key: "token", Value: "stale-folder-token"},
	}); err != nil {
		t.Fatalf("UpdateFolderVariables: %v", err)
	}
	// Not even a folder variable scoped to the very environment the capture
	// writes into may shadow it: the environment is always the top layer.
	if err := db.UpdateFolderVariables(folder.ID, &env.ID, []models.Variable{
		{Key: "token", Value: "stale-env-scoped-token"},
	}); err != nil {
		t.Fatalf("UpdateFolderVariables (env scope): %v", err)
	}
	if err := db.UpsertEnvironmentVariable(env.ID, "token", "captured-token"); err != nil {
		t.Fatalf("UpsertEnvironmentVariable: %v", err)
	}

	vars, err := NewVariableResolver(db).BuildVariableMap(p.ID, &folder.ID)
	if err != nil {
		t.Fatalf("BuildVariableMap: %v", err)
	}
	if vars["token"] != "captured-token" {
		t.Errorf("captured value shadowed by folder: token = %q", vars["token"])
	}
}

// A folder can hold a per-environment value for a key: the shared default
// applies to every environment, and the environment-scoped row replaces it
// while that environment is active.
func TestBuildVariableMapFolderEnvironmentScope(t *testing.T) {
	db := newTestDB(t)
	p := createProject(t, db, "p")
	staging := createNamedActiveEnv(t, db, p.ID, "staging", nil)
	prod := createNamedActiveEnv(t, db, p.ID, "prod", nil) // created last, so active

	folder := &models.Folder{ProjectID: p.ID, Name: "logistics"}
	if err := db.CreateFolder(folder); err != nil {
		t.Fatalf("CreateFolder: %v", err)
	}
	if err := db.UpdateFolderVariables(folder.ID, nil, []models.Variable{
		{Key: "api_url", Value: "default-url"},
		{Key: "api_user", Value: "shared-user"},
	}); err != nil {
		t.Fatalf("UpdateFolderVariables (default): %v", err)
	}
	if err := db.UpdateFolderVariables(folder.ID, &prod.ID, []models.Variable{
		{Key: "api_url", Value: "prod-url"},
	}); err != nil {
		t.Fatalf("UpdateFolderVariables (prod): %v", err)
	}

	r := NewVariableResolver(db)

	vars, err := r.BuildVariableMap(p.ID, &folder.ID)
	if err != nil {
		t.Fatalf("BuildVariableMap: %v", err)
	}
	if vars["api_url"] != "prod-url" {
		t.Errorf("prod scope must win while prod is active: api_url = %q", vars["api_url"])
	}
	if vars["api_user"] != "shared-user" {
		t.Errorf("shared default lost: api_user = %q", vars["api_user"])
	}

	// Switching environments falls back to the shared default, since staging
	// has no override of its own.
	if err := db.SetActiveEnvironment(p.ID, staging.ID); err != nil {
		t.Fatalf("SetActiveEnvironment: %v", err)
	}
	vars, err = r.BuildVariableMap(p.ID, &folder.ID)
	if err != nil {
		t.Fatalf("BuildVariableMap: %v", err)
	}
	if vars["api_url"] != "default-url" {
		t.Errorf("staging must fall back to the default: api_url = %q", vars["api_url"])
	}
}

// Folder depth stays the primary axis: a child folder's shared default beats an
// ancestor's environment-scoped value, the same way it beats any other
// ancestor value.
func TestBuildVariableMapChildFolderBeatsAncestorEnvironmentScope(t *testing.T) {
	db := newTestDB(t)
	p := createProject(t, db, "p")
	env := createActiveEnv(t, db, p.ID, nil)

	root := &models.Folder{ProjectID: p.ID, Name: "root"}
	if err := db.CreateFolder(root); err != nil {
		t.Fatal(err)
	}
	child := &models.Folder{ProjectID: p.ID, Name: "child", ParentID: &root.ID}
	if err := db.CreateFolder(child); err != nil {
		t.Fatal(err)
	}
	if err := db.UpdateFolderVariables(root.ID, &env.ID, []models.Variable{
		{Key: "shared", Value: "root-env-scoped"},
	}); err != nil {
		t.Fatal(err)
	}
	if err := db.UpdateFolderVariables(child.ID, nil, []models.Variable{
		{Key: "shared", Value: "child-default"},
	}); err != nil {
		t.Fatal(err)
	}

	vars, err := NewVariableResolver(db).BuildVariableMap(p.ID, &child.ID)
	if err != nil {
		t.Fatalf("BuildVariableMap: %v", err)
	}
	if vars["shared"] != "child-default" {
		t.Errorf("deeper folder must win over an ancestor scope: shared = %q", vars["shared"])
	}
}

func TestListVariablesReportsSource(t *testing.T) {
	db := newTestDB(t)
	p := createProject(t, db, "p")
	env := createActiveEnv(t, db, p.ID, map[string]string{"host": "env-host", "shared": "from-env"})

	folder := &models.Folder{ProjectID: p.ID, Name: "auth"}
	if err := db.CreateFolder(folder); err != nil {
		t.Fatalf("CreateFolder: %v", err)
	}
	if err := db.UpdateFolderVariables(folder.ID, nil, []models.Variable{
		{Key: "shared", Value: "from-folder"},
		{Key: "folder_only", Value: "only-here"},
	}); err != nil {
		t.Fatalf("UpdateFolderVariables: %v", err)
	}

	list, err := NewVariableResolver(db).ListVariables(p.ID, &folder.ID)
	if err != nil {
		t.Fatalf("ListVariables: %v", err)
	}
	if len(list) != 3 {
		t.Fatalf("ListVariables = %+v; want one entry per effective key", list)
	}
	// Sorted by key: folder_only, host, shared
	if list[0].Key != "folder_only" || list[0].Value != "only-here" ||
		list[0].Source != models.VariableSourceFolder || list[0].SourceName != "auth" {
		t.Errorf("folder-only variable = %+v", list[0])
	}
	if list[1].Key != "host" || list[1].Source != models.VariableSourceEnvironment || list[1].SourceName != env.Name {
		t.Errorf("env variable = %+v", list[1])
	}
	if list[2].Key != "shared" || list[2].Value != "from-env" ||
		list[2].Source != models.VariableSourceEnvironment || list[2].SourceName != env.Name {
		t.Errorf("environment override = %+v", list[2])
	}
}
