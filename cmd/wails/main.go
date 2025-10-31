package main

import (
	"context"
	"embed"
	"log"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"

	"rikuest/internal/config"
	"rikuest/internal/database"
	"rikuest/internal/models"
	"rikuest/internal/services"
)

//go:embed all:frontend/dist
var assets embed.FS

// App struct with native bindings
type App struct {
	ctx      context.Context
	services *services.Services
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}

// OnStartup is called when the app starts, before the frontend is loaded
func (a *App) OnStartup(ctx context.Context) {
	a.ctx = ctx

	// Initialize database
	db, err := database.NewDB("rikuest.db")
	if err != nil {
		log.Fatal("Failed to initialize database:", err)
	}

	// Get webhook URL from centralized config
	webhookURL := config.DiscordWebhookURL()

	// Initialize services
	a.services = services.NewServices(db, webhookURL)

	// Update webhook URL from config if available (allows runtime override from DB)
	telemetryConfig, err := a.services.Telemetry.GetConfig()
	if err == nil && telemetryConfig.WebhookURL != "" {
		// Use webhook from config (allows users to override via DB)
		a.services.Telemetry = services.NewTelemetryService(db, telemetryConfig.WebhookURL)
	}

	log.Println("Wails App initialized with native bindings")
}

// OnDomReady is called after front-end resources have been loaded
func (a *App) OnDomReady(ctx context.Context) {
	// Report session start
	a.services.Telemetry.ReportSessionStart()
}

// OnShutdown is called when the application is about to quit
func (a *App) OnShutdown(ctx context.Context) {
	// Report session end with final metrics
	if a.services != nil && a.services.Telemetry != nil {
		a.services.Telemetry.ReportSessionEnd()
	}
}

// GetPlatform returns the current platform
func (a *App) GetPlatform() string {
	return "desktop"
}

// GetVersion returns the application version
func (a *App) GetVersion() string {
	return config.Version()
}

// ===== PROJECT BINDINGS =====

func (a *App) GetProjects() ([]models.Project, error) {
	return a.services.Project.GetProjects()
}

func (a *App) GetProject(id int) (*models.Project, error) {
	return a.services.Project.GetProject(id)
}

func (a *App) CreateProject(project models.Project) (*models.Project, error) {
	err := a.services.Project.CreateProject(&project)
	if err != nil {
		return nil, err
	}
	// Return the created project with ID
	return a.services.Project.GetProject(project.ID)
}

func (a *App) UpdateProject(project models.Project) (*models.Project, error) {
	err := a.services.Project.UpdateProject(&project)
	if err != nil {
		return nil, err
	}
	return &project, nil
}

func (a *App) DeleteProject(id int) error {
	return a.services.Project.DeleteProject(id)
}

// ===== REQUEST BINDINGS =====

func (a *App) GetRequests(projectID int) ([]models.Request, error) {
	return a.services.Request.GetRequests(projectID)
}

func (a *App) GetRequest(id int) (*models.Request, error) {
	return a.services.Request.GetRequest(id)
}

func (a *App) CreateRequest(request models.Request) (*models.Request, error) {
	err := a.services.Request.CreateRequest(&request)
	if err != nil {
		return nil, err
	}
	return a.services.Request.GetRequest(request.ID)
}

func (a *App) UpdateRequest(request models.Request) (*models.Request, error) {
	err := a.services.Request.UpdateRequest(&request)
	if err != nil {
		return nil, err
	}
	return &request, nil
}

func (a *App) DeleteRequest(id int) error {
	return a.services.Request.DeleteRequest(id)
}

func (a *App) GetRequestHistory(requestID int) ([]models.RequestHistory, error) {
	return a.services.Request.GetRequestHistory(requestID)
}

func (a *App) ExecuteRequest(requestID int) (*models.RequestResponse, error) {
	return a.services.Request.ExecuteRequest(requestID)
}

func (a *App) DeleteRequestHistoryItem(requestID int, historyID int) error {
	return a.services.Request.DeleteRequestHistoryItem(requestID, historyID)
}

func (a *App) MoveRequest(requestID int, folderID *int, position int) error {
	return a.services.Request.MoveRequest(requestID, folderID, position)
}

func (a *App) CopyRequest(requestID int, format string) (string, error) {
	request, err := a.services.Request.GetRequest(requestID)
	if err != nil {
		return "", err
	}

	return a.services.Format.GetFormat(request, format)
}

func (a *App) CopyAllRequestFormats(requestID int) (map[string]string, error) {
	request, err := a.services.Request.GetRequest(requestID)
	if err != nil {
		return nil, err
	}

	allFormats := a.services.Format.GetAllFormats(request)
	formats := map[string]string{
		"raw":    allFormats.Raw,
		"curl":   allFormats.Curl,
		"fetch":  allFormats.Fetch,
		"python": allFormats.Python,
	}

	return formats, nil
}

// ===== FOLDER BINDINGS =====

func (a *App) GetFolders(projectID int) ([]models.Folder, error) {
	return a.services.Folder.GetFolders(projectID)
}

func (a *App) CreateFolder(folder models.Folder) (*models.Folder, error) {
	err := a.services.Folder.CreateFolder(&folder)
	if err != nil {
		return nil, err
	}
	return &folder, nil
}

func (a *App) UpdateFolder(folder models.Folder) (*models.Folder, error) {
	err := a.services.Folder.UpdateFolder(&folder)
	if err != nil {
		return nil, err
	}
	return &folder, nil
}

func (a *App) DeleteFolder(id int) error {
	return a.services.Folder.DeleteFolder(id)
}

func main() {
	// Create an instance of the app structure
	app := NewApp()

	// Create application with options
	err := wails.Run(&options.App{
		Title:     "Rikuest",
		Width:     1280,
		Height:    720,
		MinWidth:  800,
		MinHeight: 600,
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
		BackgroundColour: &options.RGBA{R: 255, G: 255, B: 255, A: 1},
		OnStartup:        app.OnStartup,
		OnDomReady:       app.OnDomReady,
		OnShutdown:       app.OnShutdown,
		Bind: []interface{}{
			app,
		},
	})

	if err != nil {
		log.Fatal("Error:", err)
	}
}
