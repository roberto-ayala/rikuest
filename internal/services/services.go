package services

import "rikuest/internal/database"

// Services contains all business logic services
type Services struct {
	Project   *ProjectService
	Request   *RequestService
	Folder    *FolderService
	Format    *FormatService
	Telemetry *TelemetryService
}

// NewServices creates a new services container
func NewServices(db *database.DB, webhookURL string) *Services {
	return &Services{
		Project:   NewProjectService(db),
		Request:   NewRequestService(db),
		Folder:    NewFolderService(db),
		Format:    NewFormatService(),
		Telemetry: NewTelemetryService(db, webhookURL),
	}
}
