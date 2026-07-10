package database

import (
	"rikuest/internal/models"
)

// Folder operations
func (db *DB) CreateFolder(folder *models.Folder) error {
	// Position is computed inside the INSERT so the MAX(position)+1 read and
	// the write happen atomically (no race between concurrent creates).
	query := `INSERT INTO folders (project_id, name, parent_id, position)
			  VALUES (?, ?, ?,
			  (SELECT COALESCE(MAX(position), -1) + 1 FROM folders WHERE project_id = ? AND parent_id IS ?))
			  RETURNING id, position, created_at, updated_at`
	err := db.QueryRow(query, folder.ProjectID, folder.Name, folder.ParentID,
		folder.ProjectID, folder.ParentID).Scan(
		&folder.ID, &folder.Position, &folder.CreatedAt, &folder.UpdatedAt,
	)
	return err
}

func (db *DB) GetFolders(projectID int) ([]models.Folder, error) {
	query := `SELECT id, project_id, name, parent_id, position, created_at, updated_at 
			  FROM folders WHERE project_id = ? ORDER BY position ASC`
	rows, err := db.Query(query, projectID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var folders []models.Folder
	for rows.Next() {
		var folder models.Folder
		var parentID *int
		err := rows.Scan(&folder.ID, &folder.ProjectID, &folder.Name, &parentID,
			&folder.Position, &folder.CreatedAt, &folder.UpdatedAt)
		if err != nil {
			return nil, err
		}
		folder.ParentID = parentID
		folders = append(folders, folder)
	}

	return folders, nil
}

func (db *DB) UpdateFolder(folder *models.Folder) error {
	query := `UPDATE folders SET name = ?, parent_id = ?, position = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
	_, err := db.Exec(query, folder.Name, folder.ParentID, folder.Position, folder.ID)
	return err
}

func (db *DB) DeleteFolder(id int) error {
	// First, move all requests in this folder to root level
	_, err := db.Exec("UPDATE requests SET folder_id = NULL WHERE folder_id = ?", id)
	if err != nil {
		return err
	}

	// Then delete the folder
	query := `DELETE FROM folders WHERE id = ?`
	_, err = db.Exec(query, id)
	return err
}

// GetFolderVariables returns variables for a folder.
// GetFolderAncestry returns the folder IDs from the root ancestor down to
// (and including) the given folder, in root-first order.
func (db *DB) GetFolderAncestry(folderID int) ([]int, error) {
	rows, err := db.Query(`
		WITH RECURSIVE chain(id, parent_id, depth) AS (
			SELECT id, parent_id, 0 FROM folders WHERE id = ?
			UNION ALL
			SELECT f.id, f.parent_id, c.depth + 1
			FROM folders f JOIN chain c ON f.id = c.parent_id
		)
		SELECT id FROM chain ORDER BY depth DESC`, folderID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var ids []int
	for rows.Next() {
		var id int
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		ids = append(ids, id)
	}
	return ids, rows.Err()
}

func (db *DB) GetFolderVariables(folderID int) ([]models.Variable, error) {
	rows, err := db.Query(
		`SELECT id, key, value, created_at, updated_at FROM folder_variables WHERE folder_id = ? ORDER BY key ASC`,
		folderID,
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

// UpdateFolderVariables replaces all variables for a folder (batch replace).

// UpdateFolderVariables replaces all variables for a folder (batch replace).
func (db *DB) UpdateFolderVariables(folderID int, variables []models.Variable) error {
	tx, err := db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	if _, err := tx.Exec(`DELETE FROM folder_variables WHERE folder_id = ?`, folderID); err != nil {
		return err
	}
	for _, v := range variables {
		if _, err := tx.Exec(
			`INSERT INTO folder_variables (folder_id, key, value) VALUES (?, ?, ?)`,
			folderID, v.Key, v.Value,
		); err != nil {
			return err
		}
	}
	return tx.Commit()
}

// GetResponseCaptures returns capture rules for a request.
