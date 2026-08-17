package services

import (
	"fmt"

	"rikuest/internal/database"
	"rikuest/internal/models"
)

type EnvironmentService struct {
	db *database.DB
}

func NewEnvironmentService(db *database.DB) *EnvironmentService {
	return &EnvironmentService{db: db}
}

func (s *EnvironmentService) GetEnvironments(projectID int) ([]models.Environment, error) {
	return s.db.GetEnvironments(projectID)
}

func (s *EnvironmentService) CreateEnvironment(env *models.Environment) error {
	return s.db.CreateEnvironment(env)
}

func (s *EnvironmentService) UpdateEnvironmentName(id int, name string) error {
	return s.db.UpdateEnvironmentName(id, name)
}

func (s *EnvironmentService) DeleteEnvironment(id int) error {
	return s.db.DeleteEnvironment(id)
}

func (s *EnvironmentService) SetActiveEnvironment(projectID, environmentID int) error {
	return s.db.SetActiveEnvironment(projectID, environmentID)
}

func (s *EnvironmentService) DeactivateAllEnvironments(projectID int) error {
	return s.db.DeactivateAllEnvironments(projectID)
}

func (s *EnvironmentService) UpdateEnvironmentVariables(environmentID int, variables []models.Variable) error {
	return s.db.UpdateEnvironmentVariables(environmentID, variables)
}

// GetFolderVariables returns one scope of a folder's variables: environmentID
// 0 is the default shared by every environment, any other value is that
// environment's own overrides.
func (s *EnvironmentService) GetFolderVariables(folderID int, environmentID int) ([]models.Variable, error) {
	return s.db.GetFolderVariables(folderID, folderScope(environmentID))
}

// UpdateFolderVariables replaces one scope of a folder's variables, leaving the
// other scopes (the shared defaults and every other environment) untouched.
func (s *EnvironmentService) UpdateFolderVariables(folderID int, environmentID int, variables []models.Variable) error {
	if environmentID != 0 {
		ok, err := s.db.EnvironmentBelongsToFolderProject(folderID, environmentID)
		if err != nil {
			return err
		}
		if !ok {
			return fmt.Errorf("environment %d does not belong to the folder's project", environmentID)
		}
	}
	return s.db.UpdateFolderVariables(folderID, folderScope(environmentID), variables)
}

// folderScope maps the API's 0-means-shared-default convention onto the
// nullable environment_id the repository expects.
func folderScope(environmentID int) *int {
	if environmentID == 0 {
		return nil
	}
	return &environmentID
}
