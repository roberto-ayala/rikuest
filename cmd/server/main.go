package main

import (
	"context"
	"errors"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"rikuest/internal/database"
	"rikuest/internal/handlers"
	"rikuest/internal/services"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func main() {
	db, err := database.NewDB("rikuest.db")
	if err != nil {
		log.Fatal("Failed to initialize database:", err)
	}
	defer db.Close()

	// Initialize services (webhook URL empty for server mode)
	servicesContainer := services.NewServices(db, "")
	handler := handlers.NewHandler(servicesContainer)

	if os.Getenv("RIKUEST_DEBUG") == "" {
		gin.SetMode(gin.ReleaseMode)
	}
	r := gin.Default()

	// The server executes arbitrary HTTP requests on behalf of the UI, so it
	// must only be reachable from the local frontend: restrict CORS to the
	// Vite dev server and the embedded frontend origin.
	r.Use(cors.New(cors.Config{
		AllowOrigins: []string{
			"http://localhost:5173", "http://127.0.0.1:5173",
			"http://localhost:8080", "http://127.0.0.1:8080",
		},
		AllowMethods:  []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:  []string{"Origin", "Content-Type", "Accept"},
		ExposeHeaders: []string{"Content-Length"},
	}))

	api := r.Group("/api")
	{
		// Projects routes
		api.POST("/projects", handler.CreateProject)
		api.GET("/projects", handler.GetProjects)
		api.GET("/project/:id", handler.GetProject)
		api.PUT("/project/:id", handler.UpdateProject)
		api.DELETE("/project/:id", handler.DeleteProject)
		api.GET("/project/:id/requests", handler.GetRequests)
		api.GET("/project/:id/folders", handler.GetFolders)

		// Folders routes
		api.POST("/folders", handler.CreateFolder)
		api.PUT("/folder/:id", handler.UpdateFolder)
		api.DELETE("/folder/:id", handler.DeleteFolder)
		api.GET("/folder/:id/variables", handler.GetFolderVariables)
		api.PUT("/folder/:id/variables", handler.UpdateFolderVariables)

		// Requests routes
		api.POST("/requests", handler.CreateRequest)
		api.GET("/request/:id", handler.GetRequest)
		api.PUT("/request/:id", handler.UpdateRequest)
		api.DELETE("/request/:id", handler.DeleteRequest)
		api.POST("/request/:id/execute", handler.ExecuteRequest)
		api.GET("/request/:id/history", handler.GetRequestHistory)
		api.DELETE("/request/:id/history/:historyId", handler.DeleteRequestHistoryItem)
		api.POST("/request/move", handler.MoveRequest)
		api.GET("/request/:id/copy", handler.CopyRequestFormats)
		api.GET("/request/:id/copy-all", handler.CopyAllRequestFormats)
		api.GET("/request/:id/captures", handler.GetResponseCaptures)
		api.PUT("/request/:id/captures", handler.UpdateResponseCaptures)
		api.GET("/request/:id/variables", handler.GetRequestVariables)

		// Environments routes
		api.GET("/project/:id/environments", handler.GetEnvironments)
		api.POST("/project/:id/environments", handler.CreateEnvironment)
		api.POST("/project/:id/environments/deactivate", handler.DeactivateEnvironments)
		api.PUT("/environment/:id", handler.UpdateEnvironment)
		api.DELETE("/environment/:id", handler.DeleteEnvironment)
		api.POST("/environment/:id/activate", handler.SetActiveEnvironment)
		api.PUT("/environment/:id/variables", handler.UpdateEnvironmentVariables)

		// Cookies routes
		api.GET("/project/:id/cookies", handler.GetProjectCookies)
		api.DELETE("/cookie/:id", handler.DeleteCookie)
		api.DELETE("/project/:id/cookies", handler.ClearProjectCookies)
	}

	// Serve static files for non-API routes
	r.Static("/assets", "./frontend/dist/assets")
	r.StaticFile("/vite.svg", "./frontend/dist/vite.svg")

	r.NoRoute(func(c *gin.Context) {
		// Only serve index.html for non-API routes
		if !strings.HasPrefix(c.Request.URL.Path, "/api") {
			c.File("./frontend/dist/index.html")
		} else {
			c.JSON(404, gin.H{"error": "API endpoint not found"})
		}
	})

	srv := &http.Server{Addr: ":8080", Handler: r}

	go func() {
		log.Println("Server starting on :8080")
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Printf("server error: %v", err)
		}
	}()

	// Wait for SIGINT/SIGTERM, then drain in-flight requests before exiting
	// so the deferred db.Close() actually runs.
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("Shutting down...")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		log.Printf("forced shutdown: %v", err)
	}
}
