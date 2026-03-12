package services

import (
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

func (s *EnvironmentService) GetFolderVariables(folderID int) ([]models.Variable, error) {
	return s.db.GetFolderVariables(folderID)
}

func (s *EnvironmentService) UpdateFolderVariables(folderID int, variables []models.Variable) error {
	return s.db.UpdateFolderVariables(folderID, variables)
}
