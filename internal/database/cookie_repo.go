package database

import (
	"rikuest/internal/models"
)

// GetCookiesForProject returns all cookies stored for a project, ordered by
// domain then name.
func (db *DB) GetCookiesForProject(projectID int) ([]models.Cookie, error) {
	query := `SELECT id, project_id, domain, path, name, value, expires_at, secure, http_only, same_site,
			  created_at, updated_at
			  FROM project_cookies WHERE project_id = ? ORDER BY domain ASC, name ASC`
	rows, err := db.Query(query, projectID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var cookies []models.Cookie
	for rows.Next() {
		var c models.Cookie
		var secure, httpOnly int
		if err := rows.Scan(&c.ID, &c.ProjectID, &c.Domain, &c.Path, &c.Name, &c.Value,
			&c.ExpiresAt, &secure, &httpOnly, &c.SameSite, &c.CreatedAt, &c.UpdatedAt); err != nil {
			return nil, err
		}
		c.Secure = secure == 1
		c.HttpOnly = httpOnly == 1
		cookies = append(cookies, c)
	}

	return cookies, rows.Err()
}

// UpsertCookie inserts a new cookie or updates the existing one for the same
// (project_id, domain, path, name) tuple, populating id/created_at/updated_at
// back onto c.
func (db *DB) UpsertCookie(c *models.Cookie) error {
	secure := 0
	if c.Secure {
		secure = 1
	}
	httpOnly := 0
	if c.HttpOnly {
		httpOnly = 1
	}

	query := `INSERT INTO project_cookies (project_id, domain, path, name, value, expires_at, secure, http_only, same_site)
			  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
			  ON CONFLICT(project_id, domain, path, name) DO UPDATE SET
			    value = excluded.value,
			    expires_at = excluded.expires_at,
			    secure = excluded.secure,
			    http_only = excluded.http_only,
			    same_site = excluded.same_site,
			    updated_at = CURRENT_TIMESTAMP
			  RETURNING id, created_at, updated_at`
	return db.QueryRow(query, c.ProjectID, c.Domain, c.Path, c.Name, c.Value, c.ExpiresAt, secure, httpOnly, c.SameSite).
		Scan(&c.ID, &c.CreatedAt, &c.UpdatedAt)
}

// DeleteCookie removes a single cookie by id.
func (db *DB) DeleteCookie(id int) error {
	_, err := db.Exec(`DELETE FROM project_cookies WHERE id = ?`, id)
	return err
}

// DeleteCookiesForProject removes all cookies stored for a project.
func (db *DB) DeleteCookiesForProject(projectID int) error {
	_, err := db.Exec(`DELETE FROM project_cookies WHERE project_id = ?`, projectID)
	return err
}
