package main

import (
	"log"
	"strings"

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

	// Initialize services
	servicesContainer := services.NewServices(db)
	handler := handlers.NewHandler(servicesContainer)

	r := gin.Default()

	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"*"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"*"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
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

		// Requests routes
		api.POST("/requests", handler.CreateRequest)
		api.GET("/request/:id", handler.GetRequest)
		api.PUT("/request/:id", handler.UpdateRequest)
		api.DELETE("/request/:id", handler.DeleteRequest)
		api.POST("/request/:id/execute", handler.ExecuteRequest)
		api.GET("/request/:id/history", handler.GetRequestHistory)
		api.DELETE("/request/:id/history/:historyId", handler.DeleteRequestHistoryItem)
		api.POST("/request/move", handler.MoveRequest)
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

	log.Println("Server starting on :8080")
	log.Fatal(r.Run(":8080"))
}