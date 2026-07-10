package database

import (
	"rikuest/internal/models"
)

func (db *DB) CreateProject(project *models.Project) error {
	query := `INSERT INTO projects (name, description) VALUES (?, ?) RETURNING id, created_at, updated_at`
	err := db.QueryRow(query, project.Name, project.Description).Scan(
		&project.ID, &project.CreatedAt, &project.UpdatedAt,
	)
	return err
}

func (db *DB) GetProjects() ([]models.Project, error) {
	query := `SELECT id, name, description, created_at, updated_at FROM projects ORDER BY created_at DESC`
	rows, err := db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var projects []models.Project
	for rows.Next() {
		var project models.Project
		err := rows.Scan(&project.ID, &project.Name, &project.Description, &project.CreatedAt, &project.UpdatedAt)
		if err != nil {
			return nil, err
		}
		projects = append(projects, project)
	}

	return projects, nil
}

func (db *DB) GetProject(id int) (*models.Project, error) {
	query := `SELECT id, name, description, created_at, updated_at FROM projects WHERE id = ?`
	var project models.Project
	err := db.QueryRow(query, id).Scan(
		&project.ID, &project.Name, &project.Description, &project.CreatedAt, &project.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &project, nil
}

func (db *DB) UpdateProject(project *models.Project) error {
	query := `UPDATE projects SET name = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
	_, err := db.Exec(query, project.Name, project.Description, project.ID)
	return err
}

func (db *DB) DeleteProject(id int) error {
	query := `DELETE FROM projects WHERE id = ?`
	_, err := db.Exec(query, id)
	return err
}
