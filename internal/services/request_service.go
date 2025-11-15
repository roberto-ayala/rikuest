package services

import (
	"encoding/base64"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
	
	"rikuest/internal/database"
	"rikuest/internal/models"
)

type RequestService struct {
	db     *database.DB
	config *ConfigService
}

func NewRequestService(db *database.DB) *RequestService {
	return &RequestService{
		db:     db,
		config: NewConfigService(db),
	}
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

func (s *RequestService) DeleteRequestHistoryItem(requestID int, historyID int) error {
	return s.db.DeleteRequestHistoryItem(requestID, historyID)
}

func (s *RequestService) MoveRequest(requestID int, folderID *int, position int) error {
	return s.db.MoveRequest(requestID, folderID, position)
}

func (s *RequestService) ExecuteRequest(requestID int) (*models.RequestResponse, error) {
	// Get the request details
	request, err := s.GetRequest(requestID)
	if err != nil {
		return nil, err
	}

	// Execute the request using the same logic as the HTTP handler
	response, err := s.executeHTTPRequest(request)
	if err != nil {
		return nil, err
	}

	// Save to history
	history := &models.RequestHistory{
		RequestID: requestID,
		Response:  *response,
	}
	
	// Save to history (ignore errors to ensure response is always returned)
	if err := s.SaveRequestHistory(history); err != nil {
		// Log the error but don't fail the request execution
		fmt.Printf("Warning: Failed to save request history: %v\n", err)
	}

	return response, nil
}

func (s *RequestService) executeHTTPRequest(request *models.Request) (*models.RequestResponse, error) {
	start := time.Now()

	// Get configured timeout, default to 5 minutes
	timeout, err := s.config.GetRequestTimeout()
	if err != nil {
		timeout = 300 * time.Second // Default to 5 minutes on error
	}

	client := &http.Client{
		Timeout: timeout,
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
		return nil, fmt.Errorf("failed to create request: %w", err)
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
	rawRequestString := s.buildRawRequest(request)
	
	var response models.RequestResponse
	
	if err != nil {
		// Handle network/connection errors as a response
		statusText := s.getErrorStatusText(err.Error())
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

	return &response, nil
}

// buildRawRequest constructs the raw HTTP request string
func (s *RequestService) buildRawRequest(request *models.Request) string {
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
	
	// Add Content-Type for form data if not already present
	if request.BodyType == "form" && len(request.FormData) > 0 {
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
	}
	
	// Add Content-Length if there's a body
	var bodyContent string
	if request.BodyType == "form" && len(request.FormData) > 0 {
		formValues := url.Values{}
		for _, item := range request.FormData {
			if item.Key != "" {
				formValues.Add(item.Key, item.Value)
			}
		}
		bodyContent = formValues.Encode()
	} else if request.Body != "" {
		bodyContent = request.Body
	}
	
	if bodyContent != "" {
		rawRequest.WriteString(fmt.Sprintf("Content-Length: %d\r\n", len(bodyContent)))
	}
	
	rawRequest.WriteString("\r\n")
	
	// Add body if present
	if bodyContent != "" {
		rawRequest.WriteString(bodyContent)
	}
	
	return rawRequest.String()
}

// getErrorStatusText returns a user-friendly status text based on the error message
func (s *RequestService) getErrorStatusText(errorMsg string) string {
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