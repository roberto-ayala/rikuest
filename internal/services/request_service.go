package services

import (
	"rikuest/internal/database"
	"rikuest/internal/models"
)

type RequestService struct {
	db *database.DB
}

func NewRequestService(db *database.DB) *RequestService {
	return &RequestService{db: db}
}

func (s *RequestService) GetRequests(projectID int) ([]models.Request, error) {
	return s.db.GetRequests(projectID)
}

func (s *RequestService) GetRequest(id int) (*models.Request, error) {
	return s.db.GetRequest(id)
}

func (s *RequestService) CreateRequest(request *models.Request) error {
	return s.db.CreateRequest(request)
}

func (s *RequestService) UpdateRequest(request *models.Request) error {
	return s.db.UpdateRequest(request)
}

func (s *RequestService) DeleteRequest(id int) error {
	return s.db.DeleteRequest(id)
}

func (s *RequestService) SaveRequestHistory(history *models.RequestHistory) error {
	return s.db.SaveRequestHistory(history)
}

func (s *RequestService) GetRequestHistory(requestID int) ([]models.RequestHistory, error) {
	return s.db.GetRequestHistory(requestID)
}

func (s *RequestService) MoveRequest(requestID int, folderID *int, position int) error {
	return s.db.MoveRequest(requestID, folderID, position)
}