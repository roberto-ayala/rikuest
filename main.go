package main

import (
	"context"
	"embed"
	"log"
	"os"
	"path/filepath"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"

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

	// Get the application data directory
	dataDir, err := getAppDataDir()
	if err != nil {
		log.Fatal("Failed to get application data directory:", err)
	}

	// Create the data directory if it doesn't exist
	if err := os.MkdirAll(dataDir, 0755); err != nil {
		log.Fatal("Failed to create application data directory:", err)
	}

	// Database path in the application data directory
	dbPath := filepath.Join(dataDir, "rikuest.db")
	log.Printf("Using database at: %s", dbPath)

	// Initialize database (will create if it doesn't exist)
	db, err := database.NewDB(dbPath)
	if err != nil {
		log.Fatal("Failed to initialize database:", err)
	}

	// Initialize services
	a.services = services.NewServices(db)
	log.Println("Wails App initialized with native bindings")
}

// OnDomReady is called after front-end resources have been loaded
func (a *App) OnDomReady(ctx context.Context) {
	// This is a good place to allocate and start your main application
}

// OnShutdown is called when the application is about to quit
func (a *App) OnShutdown(ctx context.Context) {
	// Cleanup if needed
}

// GetPlatform returns the current platform
func (a *App) GetPlatform() string {
	return "desktop"
}

// GetVersion returns the application version
func (a *App) GetVersion() string {
	return "1.0.0"
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

// getAppDataDir returns the appropriate application data directory for the current OS
func getAppDataDir() (string, error) {
	homeDir, err := os.UserHomeDir()
	if err != nil {
		return "", err
	}

	// Platform-specific application data directories
	switch {
	case filepath.Separator == '\\': // Windows
		return filepath.Join(homeDir, "AppData", "Local", "Rikuest"), nil
	case os.Getenv("XDG_DATA_HOME") != "": // Linux with XDG
		return filepath.Join(os.Getenv("XDG_DATA_HOME"), "rikuest"), nil
	case filepath.Separator == '/': // macOS and Linux
		return filepath.Join(homeDir, "Library", "Application Support", "Rikuest"), nil
	default:
		// Fallback to current directory
		return ".", nil
	}
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
