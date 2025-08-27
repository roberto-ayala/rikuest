package main

import (
	"log"

	"rikuest/internal/database"
	"rikuest/internal/handlers"

	"github.com/gin-contrib/cors"
	"github.com/gin-contrib/static"
	"github.com/gin-gonic/gin"
)

func main() {
	db, err := database.NewDB("rikuest.db")
	if err != nil {
		log.Fatal("Failed to initialize database:", err)
	}
	defer db.Close()

	handler := handlers.NewHandler(db)

	r := gin.Default()

	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"*"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"*"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
	}))

	r.Use(static.Serve("/", static.LocalFile("./frontend/dist", true)))

	api := r.Group("/api")
	{
		// Projects routes
		api.POST("/projects", handler.CreateProject)
		api.GET("/projects", handler.GetProjects)
		api.GET("/project/:id", handler.GetProject)
		api.PUT("/project/:id", handler.UpdateProject)
		api.DELETE("/project/:id", handler.DeleteProject)
		api.GET("/project/:id/requests", handler.GetRequests)

		// Requests routes
		api.POST("/requests", handler.CreateRequest)
		api.GET("/request/:id", handler.GetRequest)
		api.PUT("/request/:id", handler.UpdateRequest)
		api.DELETE("/request/:id", handler.DeleteRequest)
		api.POST("/request/:id/execute", handler.ExecuteRequest)
		api.GET("/request/:id/history", handler.GetRequestHistory)
	}

	r.NoRoute(func(c *gin.Context) {
		c.File("./frontend/dist/index.html")
	})

	log.Println("Server starting on :8080")
	log.Fatal(r.Run(":8080"))
}