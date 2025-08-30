package handlers

import (
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"
	"encoding/base64"

	"rikuest/internal/models"
	"rikuest/internal/services"

	"github.com/gin-gonic/gin"
)

type Handler struct {
	services *services.Services
}

// getErrorStatusText returns a user-friendly status text based on the error message
func getErrorStatusText(errorMsg string) string {
	errorMsg = strings.ToLower(errorMsg)
	
	if strings.Contains(errorMsg, "connection refused") {
		return "Connection Refused"
	}
	if strings.Contains(errorMsg, "no such host") || strings.Contains(errorMsg, "no such domain") {
		return "Host Not Found"
	}
	if strings.Contains(errorMsg, "timeout") || strings.Contains(errorMsg, "timed out") {
		return "Request Timeout"
	}
	if strings.Contains(errorMsg, "eof") {
		return "Connection Closed"
	}
	if strings.Contains(errorMsg, "certificate") || strings.Contains(errorMsg, "tls") || strings.Contains(errorMsg, "ssl") {
		return "SSL/TLS Error"
	}
	if strings.Contains(errorMsg, "network") {
		return "Network Error"
	}
	if strings.Contains(errorMsg, "dns") {
		return "DNS Error"
	}
	
	// Default for unknown network errors
	return "Connection Failed"
}

func NewHandler(services *services.Services) *Handler {
	return &Handler{services: services}
}

// buildRawRequest constructs the raw HTTP request string
func buildRawRequest(request *models.Request) string {
	var rawRequest strings.Builder
	
	// Parse URL to extract query parameters
	parsedURL, err := url.Parse(request.URL)
	if err != nil {
		parsedURL = &url.URL{Path: request.URL}
	}
	
	// Build query parameters from request.QueryParams
	queryParams := url.Values{}
	for _, param := range request.QueryParams {
		if param.Enabled && param.Key != "" {
			queryParams.Add(param.Key, param.Value)
		}
	}
	
	// Construct the request line
	requestPath := parsedURL.Path
	if requestPath == "" {
		requestPath = "/"
	}
	
	if len(queryParams) > 0 {
		requestPath += "?" + queryParams.Encode()
	}
	
	// Add host from URL
	host := parsedURL.Host
	if host == "" {
		host = "unknown-host"
	}
	
	rawRequest.WriteString(fmt.Sprintf("%s %s HTTP/1.1\r\n", request.Method, requestPath))
	rawRequest.WriteString(fmt.Sprintf("Host: %s\r\n", host))
	
	// Add custom User-Agent header
	rawRequest.WriteString("User-Agent: Rikuest/1.0 (HTTP API Client)\r\n")
	
	// Add headers
	for key, value := range request.Headers {
		rawRequest.WriteString(fmt.Sprintf("%s: %s\r\n", key, value))
	}
	
	// Add authorization headers based on auth type
	switch request.AuthType {
	case "bearer":
		if request.BearerToken != "" {
			rawRequest.WriteString(fmt.Sprintf("Authorization: Bearer %s\r\n", request.BearerToken))
		}
	case "basic":
		if request.BasicAuth.Username != "" || request.BasicAuth.Password != "" {
			auth := request.BasicAuth.Username + ":" + request.BasicAuth.Password
			encodedAuth := base64.StdEncoding.EncodeToString([]byte(auth))
			rawRequest.WriteString(fmt.Sprintf("Authorization: Basic %s\r\n", encodedAuth))
		}
	}
	
	// Determine the actual body content
	var actualBody string
	if request.BodyType == "form" && len(request.FormData) > 0 {
		// Build form data body
		formValues := url.Values{}
		for _, item := range request.FormData {
			if item.Key != "" {
				formValues.Add(item.Key, item.Value)
			}
		}
		actualBody = formValues.Encode()
		
		// Ensure Content-Type header for form data
		hasContentType := false
		for key := range request.Headers {
			if strings.ToLower(key) == "content-type" {
				hasContentType = true
				break
			}
		}
		if !hasContentType {
			rawRequest.WriteString("Content-Type: application/x-www-form-urlencoded\r\n")
		}
	} else if request.Body != "" {
		actualBody = request.Body
	}
	
	// Add content length if there's a body
	if actualBody != "" {
		rawRequest.WriteString(fmt.Sprintf("Content-Length: %d\r\n", len(actualBody)))
	}
	
	// End headers section
	rawRequest.WriteString("\r\n")
	
	// Add body if present
	if actualBody != "" {
		rawRequest.WriteString(actualBody)
	}
	
	return rawRequest.String()
}

func (h *Handler) CreateProject(c *gin.Context) {
	var project models.Project
	if err := c.ShouldBindJSON(&project); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.services.Project.CreateProject(&project); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, project)
}

func (h *Handler) GetProjects(c *gin.Context) {
	projects, err := h.services.Project.GetProjects()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, projects)
}

func (h *Handler) GetProject(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid project ID"})
		return
	}

	project, err := h.services.Project.GetProject(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Project not found"})
		return
	}

	c.JSON(http.StatusOK, project)
}

func (h *Handler) UpdateProject(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid project ID"})
		return
	}

	var project models.Project
	if err := c.ShouldBindJSON(&project); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	project.ID = id
	if err := h.services.Project.UpdateProject(&project); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, project)
}

func (h *Handler) DeleteProject(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid project ID"})
		return
	}

	if err := h.services.Project.DeleteProject(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Project deleted successfully"})
}

func (h *Handler) CreateRequest(c *gin.Context) {
	var request models.Request
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.services.Request.CreateRequest(&request); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, request)
}

func (h *Handler) GetRequests(c *gin.Context) {
	projectID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid project ID"})
		return
	}

	requests, err := h.services.Request.GetRequests(projectID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, requests)
}

func (h *Handler) GetRequest(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request ID"})
		return
	}

	request, err := h.services.Request.GetRequest(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Request not found"})
		return
	}

	c.JSON(http.StatusOK, request)
}

func (h *Handler) UpdateRequest(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request ID"})
		return
	}

	var request models.Request
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	request.ID = id
	if err := h.services.Request.UpdateRequest(&request); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, request)
}

func (h *Handler) DeleteRequest(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request ID"})
		return
	}

	if err := h.services.Request.DeleteRequest(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Request deleted successfully"})
}

func (h *Handler) ExecuteRequest(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request ID"})
		return
	}

	request, err := h.services.Request.GetRequest(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Request not found"})
		return
	}

	start := time.Now()

	client := &http.Client{
		Timeout: 30 * time.Second,
	}

	// Build the complete URL with query parameters
	finalURL := request.URL
	if len(request.QueryParams) > 0 {
		parsedURL, err := url.Parse(request.URL)
		if err == nil {
			queryValues := parsedURL.Query()
			
			// Add query parameters from the request
			for _, param := range request.QueryParams {
				if param.Enabled && param.Key != "" {
					queryValues.Add(param.Key, param.Value)
				}
			}
			
			parsedURL.RawQuery = queryValues.Encode()
			finalURL = parsedURL.String()
		}
	}

	// Prepare the request body based on body type
	var body io.Reader
	var bodyString string
	
	if request.BodyType == "form" && len(request.FormData) > 0 {
		// Handle form data
		formValues := url.Values{}
		for _, item := range request.FormData {
			if item.Key != "" {
				formValues.Add(item.Key, item.Value)
			}
		}
		bodyString = formValues.Encode()
		body = strings.NewReader(bodyString)
	} else if request.Body != "" {
		// Handle regular body content
		bodyString = request.Body
		body = strings.NewReader(request.Body)
	}

	req, err := http.NewRequest(request.Method, finalURL, body)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Set custom User-Agent header
	req.Header.Set("User-Agent", "Rikuest/1.0 (HTTP API Client)")
	
	// Set headers from the request
	for key, value := range request.Headers {
		req.Header.Set(key, value)
	}

	// Set authorization headers
	switch request.AuthType {
	case "bearer":
		if request.BearerToken != "" {
			req.Header.Set("Authorization", "Bearer "+request.BearerToken)
		}
	case "basic":
		if request.BasicAuth.Username != "" || request.BasicAuth.Password != "" {
			auth := request.BasicAuth.Username + ":" + request.BasicAuth.Password
			encodedAuth := base64.StdEncoding.EncodeToString([]byte(auth))
			req.Header.Set("Authorization", "Basic "+encodedAuth)
		}
	}

	// Ensure Content-Type is set for form data if not already present
	if request.BodyType == "form" && len(request.FormData) > 0 {
		if req.Header.Get("Content-Type") == "" {
			req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
		}
	}

	resp, err := client.Do(req)
	duration := time.Since(start)
	
	// Generate raw request
	rawRequestString := buildRawRequest(request)
	
	var response models.RequestResponse
	
	if err != nil {
		// Handle network/connection errors as a response
		statusText := getErrorStatusText(err.Error())
		response = models.RequestResponse{
			Status:     0,
			StatusText: statusText,
			Headers:    make(map[string]string),
			Body:       err.Error(),
			Duration:   duration.Milliseconds(),
			Size:       int64(len(err.Error())),
			RawRequest: rawRequestString,
		}
	} else {
		defer resp.Body.Close()

		responseBody, err := io.ReadAll(resp.Body)
		if err != nil {
			// Handle body read errors as a response
			response = models.RequestResponse{
				Status:     resp.StatusCode,
				StatusText: resp.Status,
				Headers:    make(map[string]string),
				Body:       "Failed to read response body: " + err.Error(),
				Duration:   duration.Milliseconds(),
				Size:       0,
				RawRequest: rawRequestString,
			}
		} else {
			responseHeaders := make(map[string]string)
			for key, values := range resp.Header {
				responseHeaders[key] = strings.Join(values, ", ")
			}

			response = models.RequestResponse{
				Status:     resp.StatusCode,
				StatusText: resp.Status,
				Headers:    responseHeaders,
				Body:       string(responseBody),
				Duration:   duration.Milliseconds(),
				Size:       int64(len(responseBody)),
				RawRequest: rawRequestString,
			}
		}
	}

	history := &models.RequestHistory{
		RequestID: id,
		Response:  response,
	}
	
	// Save to history (ignore errors to ensure response is always returned)
	if err := h.services.Request.SaveRequestHistory(history); err != nil {
		// Log the error but don't fail the request execution
		println("Warning: Failed to save request history:", err.Error())
	}

	c.JSON(http.StatusOK, response)
}

func (h *Handler) GetRequestHistory(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request ID"})
		return
	}

	history, err := h.services.Request.GetRequestHistory(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, history)
}

func (h *Handler) DeleteRequestHistoryItem(c *gin.Context) {
	requestID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request ID"})
		return
	}

	historyID, err := strconv.Atoi(c.Param("historyId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid history ID"})
		return
	}

	if err := h.services.Request.DeleteRequestHistoryItem(requestID, historyID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "History item deleted successfully"})
}

// Folder handlers
func (h *Handler) CreateFolder(c *gin.Context) {
	var folder models.Folder
	if err := c.ShouldBindJSON(&folder); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.services.Folder.CreateFolder(&folder); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, folder)
}

func (h *Handler) GetFolders(c *gin.Context) {
	projectID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid project ID"})
		return
	}

	folders, err := h.services.Folder.GetFolders(projectID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Ensure we return an empty array instead of null
	if folders == nil {
		folders = []models.Folder{}
	}

	c.JSON(http.StatusOK, folders)
}

func (h *Handler) UpdateFolder(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid folder ID"})
		return
	}

	var folder models.Folder
	if err := c.ShouldBindJSON(&folder); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	folder.ID = id
	if err := h.services.Folder.UpdateFolder(&folder); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, folder)
}

func (h *Handler) DeleteFolder(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid folder ID"})
		return
	}

	if err := h.services.Folder.DeleteFolder(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Folder deleted successfully"})
}

type MoveRequestPayload struct {
	RequestID int  `json:"request_id"`
	FolderID  *int `json:"folder_id"`
	Position  int  `json:"position"`
}

func (h *Handler) MoveRequest(c *gin.Context) {
	var payload MoveRequestPayload
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.services.Request.MoveRequest(payload.RequestID, payload.FolderID, payload.Position); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Request moved successfully"})
}
