package services

import (
	"rikuest/internal/database"
	"rikuest/internal/models"
)

type ProjectService struct {
	db *database.DB
}

func NewProjectService(db *database.DB) *ProjectService {
	return &ProjectService{db: db}
}

func (s *ProjectService) GetProjects() ([]models.Project, error) {
	return s.db.GetProjects()
}

func (s *ProjectService) GetProject(id int) (*models.Project, error) {
	return s.db.GetProject(id)
}

func (s *ProjectService) CreateProject(project *models.Project) error {
	return s.db.CreateProject(project)
}

func (s *ProjectService) UpdateProject(project *models.Project) error {
	return s.db.UpdateProject(project)
}

func (s *ProjectService) DeleteProject(id int) error {
	return s.db.DeleteProject(id)
}