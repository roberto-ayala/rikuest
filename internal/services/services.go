package services

import "rikuest/internal/database"

// Services contains all business logic services
type Services struct {
	Project         *ProjectService
	Request         *RequestService
	Folder          *FolderService
	Format          *FormatService
	Config          *ConfigService
	Telemetry       *TelemetryService
	Environment     *EnvironmentService
	VariableResolver *VariableResolver
	ResponseCapture *ResponseCaptureService
	Cookie          *CookieService
}

// NewServices creates a new services container
func NewServices(db *database.DB, webhookURL string) *Services {
	resolver := NewVariableResolver(db)
	captureSvc := NewResponseCaptureService(db)
	cookieSvc := NewCookieService(db)
	requestSvc := NewRequestService(db, resolver, captureSvc, cookieSvc)

	return &Services{
		Project:         NewProjectService(db),
		Request:         requestSvc,
		Folder:          NewFolderService(db),
		Format:          NewFormatService(),
		Config:          NewConfigService(db),
		Telemetry:       NewTelemetryService(db, webhookURL),
		Environment:     NewEnvironmentService(db),
		VariableResolver: resolver,
		ResponseCapture: captureSvc,
		Cookie:          cookieSvc,
	}
}
