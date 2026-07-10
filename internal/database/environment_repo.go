package database

import (
	"database/sql"

	"rikuest/internal/models"
)

func (db *DB) CreateEnvironment(env *models.Environment) error {
	query := `INSERT INTO environments (project_id, name, is_active) VALUES (?, ?, 0) RETURNING id, created_at, updated_at`
	return db.QueryRow(query, env.ProjectID, env.Name).Scan(&env.ID, &env.CreatedAt, &env.UpdatedAt)
}

func (db *DB) GetEnvironments(projectID int) ([]models.Environment, error) {
	rows, err := db.Query(
		`SELECT id, project_id, name, is_active, created_at, updated_at FROM environments WHERE project_id = ? ORDER BY created_at ASC`,
		projectID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var envs []models.Environment
	for rows.Next() {
		var e models.Environment
		var isActive int
		if err := rows.Scan(&e.ID, &e.ProjectID, &e.Name, &isActive, &e.CreatedAt, &e.UpdatedAt); err != nil {
			return nil, err
		}
		e.IsActive = isActive == 1
		envs = append(envs, e)
	}

	if envs == nil {
		return []models.Environment{}, nil
	}

	// Load all variables for the project in one query instead of one per environment
	varRows, err := db.Query(
		`SELECT ev.environment_id, ev.id, ev.key, ev.value, ev.created_at, ev.updated_at
		 FROM environment_variables ev
		 JOIN environments e ON e.id = ev.environment_id
		 WHERE e.project_id = ? ORDER BY ev.key ASC`,
		projectID,
	)
	if err != nil {
		return nil, err
	}
	defer varRows.Close()

	varsByEnv := make(map[int][]models.Variable)
	for varRows.Next() {
		var envID int
		var v models.Variable
		if err := varRows.Scan(&envID, &v.ID, &v.Key, &v.Value, &v.CreatedAt, &v.UpdatedAt); err != nil {
			return nil, err
		}
		varsByEnv[envID] = append(varsByEnv[envID], v)
	}
	if err := varRows.Err(); err != nil {
		return nil, err
	}

	for i := range envs {
		if vars := varsByEnv[envs[i].ID]; vars != nil {
			envs[i].Variables = vars
		} else {
			envs[i].Variables = []models.Variable{}
		}
	}
	return envs, nil
}

func (db *DB) GetActiveEnvironment(projectID int) (*models.Environment, error) {
	var e models.Environment
	var isActive int
	err := db.QueryRow(
		`SELECT id, project_id, name, is_active, created_at, updated_at FROM environments WHERE project_id = ? AND is_active = 1`,
		projectID,
	).Scan(&e.ID, &e.ProjectID, &e.Name, &isActive, &e.CreatedAt, &e.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	e.IsActive = true
	vars, err := db.getEnvironmentVariables(e.ID)
	if err != nil {
		return nil, err
	}
	e.Variables = vars
	return &e, nil
}

func (db *DB) getEnvironmentVariables(environmentID int) ([]models.Variable, error) {
	rows, err := db.Query(
		`SELECT id, key, value, created_at, updated_at FROM environment_variables WHERE environment_id = ? ORDER BY key ASC`,
		environmentID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var vars []models.Variable
	for rows.Next() {
		var v models.Variable
		if err := rows.Scan(&v.ID, &v.Key, &v.Value, &v.CreatedAt, &v.UpdatedAt); err != nil {
			return nil, err
		}
		vars = append(vars, v)
	}
	if vars == nil {
		vars = []models.Variable{}
	}
	return vars, nil
}

func (db *DB) UpdateEnvironmentName(id int, name string) error {
	_, err := db.Exec(`UPDATE environments SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, name, id)
	return err
}

func (db *DB) DeleteEnvironment(id int) error {
	_, err := db.Exec(`DELETE FROM environments WHERE id = ?`, id)
	return err
}

func (db *DB) SetActiveEnvironment(projectID, environmentID int) error {
	tx, err := db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	if _, err := tx.Exec(`UPDATE environments SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE project_id = ?`, projectID); err != nil {
		return err
	}
	if _, err := tx.Exec(`UPDATE environments SET is_active = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, environmentID); err != nil {
		return err
	}
	return tx.Commit()
}

func (db *DB) DeactivateAllEnvironments(projectID int) error {
	_, err := db.Exec(`UPDATE environments SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE project_id = ?`, projectID)
	return err
}

// UpdateEnvironmentVariables replaces all variables for an environment (batch replace).

// UpdateEnvironmentVariables replaces all variables for an environment (batch replace).
func (db *DB) UpdateEnvironmentVariables(environmentID int, variables []models.Variable) error {
	tx, err := db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	if _, err := tx.Exec(`DELETE FROM environment_variables WHERE environment_id = ?`, environmentID); err != nil {
		return err
	}
	for _, v := range variables {
		if _, err := tx.Exec(
			`INSERT INTO environment_variables (environment_id, key, value) VALUES (?, ?, ?)`,
			environmentID, v.Key, v.Value,
		); err != nil {
			return err
		}
	}
	return tx.Commit()
}

// UpsertEnvironmentVariable adds or updates a single variable (used by response capture).

// UpsertEnvironmentVariable adds or updates a single variable (used by response capture).
func (db *DB) UpsertEnvironmentVariable(environmentID int, key, value string) error {
	_, err := db.Exec(`
		INSERT INTO environment_variables (environment_id, key, value)
		VALUES (?, ?, ?)
		ON CONFLICT(environment_id, key) DO UPDATE SET value = ?, updated_at = CURRENT_TIMESTAMP
	`, environmentID, key, value, value)
	return err
}

// GetFolderVariables returns variables for a folder.
// GetFolderAncestry returns the folder IDs from the root ancestor down to
// (and including) the given folder, in root-first order.
