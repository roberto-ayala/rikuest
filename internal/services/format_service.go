package services

import (
	"encoding/base64"
	"fmt"
	"net/url"
	"strings"

	"rikuest/internal/models"
)

// FormatService handles request format generation
type FormatService struct{}

// NewFormatService creates a new FormatService instance
func NewFormatService() *FormatService {
	return &FormatService{}
}

// RequestFormats contains all available formats for a request
type RequestFormats struct {
	Raw    string `json:"raw"`
	Curl   string `json:"curl"`
	Fetch  string `json:"fetch"`
	Python string `json:"python"`
}

// GetAllFormats generates all available formats for a request
func (fs *FormatService) GetAllFormats(request *models.Request) *RequestFormats {
	return &RequestFormats{
		Raw:    fs.BuildRawRequest(request),
		Curl:   fs.BuildCurlRequest(request),
		Fetch:  fs.BuildFetchRequest(request),
		Python: fs.BuildPythonRequest(request),
	}
}

// GetFormat generates a specific format for a request
func (fs *FormatService) GetFormat(request *models.Request, format string) (string, error) {
	switch format {
	case "raw":
		return fs.BuildRawRequest(request), nil
	case "curl":
		return fs.BuildCurlRequest(request), nil
	case "fetch":
		return fs.BuildFetchRequest(request), nil
	case "python":
		return fs.BuildPythonRequest(request), nil
	default:
		return "", fmt.Errorf("unsupported format. Supported formats: raw, curl, fetch, python")
	}
}

// BuildRawRequest constructs the raw HTTP request string
func (fs *FormatService) BuildRawRequest(request *models.Request) string {
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

// BuildCurlRequest constructs a curl command string
func (fs *FormatService) BuildCurlRequest(request *models.Request) string {
	var curlCmd strings.Builder

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

	// Construct the final URL
	finalURL := request.URL
	if len(queryParams) > 0 {
		parsedURL.RawQuery = queryParams.Encode()
		finalURL = parsedURL.String()
	}

	curlCmd.WriteString("curl -X " + request.Method)

	// Add headers
	for key, value := range request.Headers {
		curlCmd.WriteString(fmt.Sprintf(" -H \"%s: %s\"", key, value))
	}

	// Add authorization headers based on auth type
	switch request.AuthType {
	case "bearer":
		if request.BearerToken != "" {
			curlCmd.WriteString(fmt.Sprintf(" -H \"Authorization: Bearer %s\"", request.BearerToken))
		}
	case "basic":
		if request.BasicAuth.Username != "" || request.BasicAuth.Password != "" {
			curlCmd.WriteString(fmt.Sprintf(" -u \"%s:%s\"", request.BasicAuth.Username, request.BasicAuth.Password))
		}
	}

	// Add body data
	if request.BodyType == "form" && len(request.FormData) > 0 {
		// Build form data
		formValues := url.Values{}
		for _, item := range request.FormData {
			if item.Key != "" {
				formValues.Add(item.Key, item.Value)
			}
		}
		curlCmd.WriteString(fmt.Sprintf(" -d \"%s\"", formValues.Encode()))
	} else if request.Body != "" {
		curlCmd.WriteString(fmt.Sprintf(" -d '%s'", request.Body))
	}

	// Add the URL
	curlCmd.WriteString(fmt.Sprintf(" \"%s\"", finalURL))

	return curlCmd.String()
}

// BuildFetchRequest constructs a JavaScript fetch request string
func (fs *FormatService) BuildFetchRequest(request *models.Request) string {
	var fetchCmd strings.Builder

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

	// Construct the final URL
	finalURL := request.URL
	if len(queryParams) > 0 {
		parsedURL.RawQuery = queryParams.Encode()
		finalURL = parsedURL.String()
	}

	// Build headers object
	headers := make(map[string]string)
	for key, value := range request.Headers {
		headers[key] = value
	}

	// Add authorization headers based on auth type
	switch request.AuthType {
	case "bearer":
		if request.BearerToken != "" {
			headers["Authorization"] = "Bearer " + request.BearerToken
		}
	case "basic":
		if request.BasicAuth.Username != "" || request.BasicAuth.Password != "" {
			auth := request.BasicAuth.Username + ":" + request.BasicAuth.Password
			encodedAuth := base64.StdEncoding.EncodeToString([]byte(auth))
			headers["Authorization"] = "Basic " + encodedAuth
		}
	}

	// Build body
	var bodyContent string
	if request.BodyType == "form" && len(request.FormData) > 0 {
		// Build form data
		formValues := url.Values{}
		for _, item := range request.FormData {
			if item.Key != "" {
				formValues.Add(item.Key, item.Value)
			}
		}
		bodyContent = fmt.Sprintf("'%s'", formValues.Encode())
	} else if request.Body != "" {
		bodyContent = fmt.Sprintf("'%s'", strings.ReplaceAll(request.Body, "'", "\\'"))
	}

	// Start building the fetch command
	fetchCmd.WriteString("fetch('" + finalURL + "', {\n")
	fetchCmd.WriteString("  method: '" + request.Method + "',\n")

	// Add headers
	if len(headers) > 0 {
		fetchCmd.WriteString("  headers: {\n")
		headerCount := 0
		for key, value := range headers {
			if headerCount > 0 {
				fetchCmd.WriteString(",\n")
			}
			fetchCmd.WriteString(fmt.Sprintf("    '%s': '%s'", key, strings.ReplaceAll(value, "'", "\\'")))
			headerCount++
		}
		fetchCmd.WriteString("\n  },\n")
	}

	// Add body if present
	if bodyContent != "" {
		fetchCmd.WriteString("  body: " + bodyContent + "\n")
	}

	fetchCmd.WriteString("})")

	return fetchCmd.String()
}

// BuildPythonRequest constructs a Python requests library string
func (fs *FormatService) BuildPythonRequest(request *models.Request) string {
	var pythonCmd strings.Builder

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

	// Construct the final URL
	finalURL := request.URL
	if len(queryParams) > 0 {
		parsedURL.RawQuery = queryParams.Encode()
		finalURL = parsedURL.String()
	}

	// Build headers
	headers := make(map[string]string)
	for key, value := range request.Headers {
		headers[key] = value
	}

	// Add authorization headers based on auth type
	switch request.AuthType {
	case "bearer":
		if request.BearerToken != "" {
			headers["Authorization"] = "Bearer " + request.BearerToken
		}
	case "basic":
		if request.BasicAuth.Username != "" || request.BasicAuth.Password != "" {
			headers["Authorization"] = "Basic " + base64.StdEncoding.EncodeToString([]byte(request.BasicAuth.Username+":"+request.BasicAuth.Password))
		}
	}

	// Build body
	var bodyContent string
	if request.BodyType == "form" && len(request.FormData) > 0 {
		// Build form data
		formData := make(map[string]string)
		for _, item := range request.FormData {
			if item.Key != "" {
				formData[item.Key] = item.Value
			}
		}
		bodyContent = "data=" + fmt.Sprintf("%v", formData)
	} else if request.Body != "" {
		bodyContent = "json=" + request.Body
	}

	// Start building the Python command
	pythonCmd.WriteString("import requests\n\n")
	pythonCmd.WriteString("response = requests." + strings.ToLower(request.Method) + "(\n")
	pythonCmd.WriteString("    '" + finalURL + "'")

	// Add headers
	if len(headers) > 0 {
		pythonCmd.WriteString(",\n    headers=" + fmt.Sprintf("%v", headers))
	}

	// Add body if present
	if bodyContent != "" {
		pythonCmd.WriteString(",\n    " + bodyContent)
	}

	pythonCmd.WriteString("\n)\n")
	pythonCmd.WriteString("print(response.text)")

	return pythonCmd.String()
}
