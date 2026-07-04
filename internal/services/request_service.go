package services

import (
	"context"
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

// maxResponseBodyBytes caps how much of a response body is kept in memory
// and stored in request_history (bodies beyond this are truncated).
const maxResponseBodyBytes int64 = 10 * 1024 * 1024 // 10 MB

type RequestService struct {
	db              *database.DB
	config          *ConfigService
	format          *FormatService
	resolver        *VariableResolver
	captureService  *ResponseCaptureService
}

func NewRequestService(db *database.DB, resolver *VariableResolver, capture *ResponseCaptureService) *RequestService {
	return &RequestService{
		db:             db,
		config:         NewConfigService(db),
		format:         NewFormatService(),
		resolver:       resolver,
		captureService: capture,
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

func (s *RequestService) ExecuteRequest(ctx context.Context, requestID int) (*models.RequestResponse, error) {
	request, err := s.GetRequest(requestID)
	if err != nil {
		return nil, err
	}

	// Resolve {{variables}} before executing
	vars, err := s.resolver.BuildVariableMap(request.ProjectID, request.FolderID)
	if err == nil && len(vars) > 0 {
		request = s.resolver.ResolveRequest(request, vars)
	}

	response, err := s.executeHTTPRequest(ctx, request)
	if err != nil {
		return nil, err
	}

	// Apply response captures on successful responses
	if response.Status >= 200 && response.Status < 300 {
		s.captureService.ApplyCaptures(requestID, request.ProjectID, response.Body)
	}

	history := &models.RequestHistory{
		RequestID: requestID,
		Response:  *response,
	}
	if err := s.SaveRequestHistory(history); err != nil {
		fmt.Printf("Warning: Failed to save request history: %v\n", err)
	}

	return response, nil
}

func (s *RequestService) executeHTTPRequest(ctx context.Context, request *models.Request) (*models.RequestResponse, error) {
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

	req, err := http.NewRequestWithContext(ctx, request.Method, finalURL, body)
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
	rawRequestString := s.format.BuildRawRequest(request)
	
	var response models.RequestResponse
	
	if err != nil {
		// Handle network/connection errors as a response
		statusText := errorStatusText(err.Error())
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

		// Cap how much of the body is kept in memory (and later stored in
		// request_history): an unbounded ReadAll on a large download would
		// exhaust memory and bloat the SQLite file.
		limited := io.LimitReader(resp.Body, maxResponseBodyBytes+1)
		responseBody, err := io.ReadAll(limited)
		truncated := false
		if err == nil && int64(len(responseBody)) > maxResponseBodyBytes {
			responseBody = responseBody[:maxResponseBodyBytes]
			truncated = true
		}
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

			bodyText := string(responseBody)
			if truncated {
				bodyText += fmt.Sprintf("\n\n[Rikuest] Response truncated: body exceeded the %d MB limit", maxResponseBodyBytes/(1024*1024))
			}

			response = models.RequestResponse{
				Status:     resp.StatusCode,
				StatusText: resp.Status,
				Headers:    responseHeaders,
				Body:       bodyText,
				Duration:   duration.Milliseconds(),
				Size:       int64(len(responseBody)),
				RawRequest: rawRequestString,
			}
		}
	}

	return &response, nil
}

// errorStatusText returns a user-friendly status text based on the error message
func errorStatusText(errorMsg string) string {
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