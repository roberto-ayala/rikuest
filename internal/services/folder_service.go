package services

import (
	"rikuest/internal/database"
	"rikuest/internal/models"
)

type FolderService struct {
	db *database.DB
}

func NewFolderService(db *database.DB) *FolderService {
	return &FolderService{db: db}
}

func (s *FolderService) GetFolders(projectID int) ([]models.Folder, error) {
	return s.db.GetFolders(projectID)
}

func (s *FolderService) CreateFolder(folder *models.Folder) error {
	return s.db.CreateFolder(folder)
}

func (s *FolderService) UpdateFolder(folder *models.Folder) error {
	return s.db.UpdateFolder(folder)
}

func (s *FolderService) DeleteFolder(id int) error {
	return s.db.DeleteFolder(id)
}