package services

import (
	"bytes"
	"crypto/md5"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"runtime"
	"sync"
	"time"

	"rikuest/internal/config"
	"rikuest/internal/database"
	"rikuest/internal/models"

	"github.com/google/uuid"
)

type TelemetryService struct {
	db           *database.DB
	webhookURL   string
	eventQueue   []Event
	queueMutex   sync.Mutex
	rateLimiter  map[string]time.Time // Track last event time by type
	rateMutex    sync.Mutex
	metrics      Metrics
	metricsMutex sync.Mutex
	lastReport   time.Time
	sessionStart time.Time
}

type Event struct {
	Type      string                 `json:"type"` // error, usage, metrics
	Message   string                 `json:"message"`
	Metadata  map[string]interface{} `json:"metadata"`
	Stack     string                 `json:"stack,omitempty"`
	Timestamp time.Time              `json:"timestamp"`
}

type Metrics struct {
	RequestCount    int       `json:"request_count"`
	ProjectCount    int       `json:"project_count"`
	FolderCount     int       `json:"folder_count"`
	LastRequestTime time.Time `json:"last_request_time"`
	SessionStart    time.Time `json:"session_start"`
}

func NewTelemetryService(db *database.DB, webhookURL string) *TelemetryService {
	service := &TelemetryService{
		db:          db,
		webhookURL:  webhookURL,
		eventQueue:  make([]Event, 0),
		rateLimiter: make(map[string]time.Time),
		metrics: Metrics{
			SessionStart: time.Now(),
		},
		sessionStart: time.Now(),
		lastReport:   time.Now(),
	}

	// Start background processor
	go service.processQueue()

	return service
}

func (s *TelemetryService) GetConfig() (*models.TelemetryConfig, error) {
	return s.db.GetTelemetryConfig()
}

func (s *TelemetryService) UpdateConfig(config *models.TelemetryConfig) error {
	return s.db.UpdateTelemetryConfig(config)
}

func (s *TelemetryService) IsEnabled() (bool, error) {
	config, err := s.GetConfig()
	if err != nil {
		return false, err
	}

	// Use webhook URL from config if not set in service
	webhookURL := s.webhookURL
	if webhookURL == "" && config.WebhookURL != "" {
		webhookURL = config.WebhookURL
	}

	return config.Enabled && webhookURL != "", nil
}

func (s *TelemetryService) getWebhookURL() string {
	if s.webhookURL != "" {
		return s.webhookURL
	}

	// Try to get from config
	config, err := s.GetConfig()
	if err == nil && config.WebhookURL != "" {
		return config.WebhookURL
	}

	return ""
}

func (s *TelemetryService) ensureInstallationID() (string, error) {
	config, err := s.GetConfig()
	if err != nil {
		return "", err
	}

	if config.InstallationID == "" {
		// Generate new UUID
		id := uuid.New().String()
		config.InstallationID = id
		if err := s.UpdateConfig(config); err != nil {
			return "", err
		}
		return id, nil
	}

	return config.InstallationID, nil
}

func (s *TelemetryService) ReportError(err error, stackTrace string) {
	enabled, _ := s.IsEnabled()
	if !enabled {
		return
	}

	event := Event{
		Type:      "error",
		Message:   err.Error(),
		Metadata:  make(map[string]interface{}),
		Stack:     stackTrace,
		Timestamp: time.Now(),
	}

	s.queueEvent(event)
}

func (s *TelemetryService) ReportUsageEvent(eventType string, metadata map[string]interface{}) {
	enabled, _ := s.IsEnabled()
	if !enabled {
		return
	}

	// Update metrics
	s.metricsMutex.Lock()
	switch eventType {
	case "request_executed":
		s.metrics.RequestCount++
		s.metrics.LastRequestTime = time.Now()
	case "project_created":
		s.metrics.ProjectCount++
	case "folder_created":
		s.metrics.FolderCount++
	}
	s.metricsMutex.Unlock()

	event := Event{
		Type:      "usage",
		Message:   eventType,
		Metadata:  metadata,
		Timestamp: time.Now(),
	}

	s.queueEvent(event)
}

func (s *TelemetryService) ReportSessionStart() {
	enabled, _ := s.IsEnabled()
	if !enabled {
		return
	}

	event := Event{
		Type:      "session",
		Message:   "session_start",
		Metadata:  map[string]interface{}{},
		Timestamp: time.Now(),
	}

	// Send immediately (don't queue session events)
	webhookURL := s.getWebhookURL()
	if webhookURL != "" {
		s.sendEventSync(event)
	}
}

func (s *TelemetryService) ReportSessionEnd() {
	enabled, _ := s.IsEnabled()
	if !enabled {
		return
	}

	s.metricsMutex.Lock()
	sessionDuration := time.Since(s.metrics.SessionStart)
	metrics := s.metrics
	s.metricsMutex.Unlock()

	event := Event{
		Type:    "session",
		Message: "session_end",
		Metadata: map[string]interface{}{
			"request_count":     metrics.RequestCount,
			"project_count":     metrics.ProjectCount,
			"folder_count":      metrics.FolderCount,
			"session_duration":  sessionDuration.Seconds(),
			"last_request_time": metrics.LastRequestTime,
		},
		Timestamp: time.Now(),
	}

	// Send immediately (don't queue, app is closing)
	webhookURL := s.getWebhookURL()
	if webhookURL != "" {
		s.sendEventSync(event)
	}
}

func (s *TelemetryService) queueEvent(event Event) {
	s.queueMutex.Lock()
	s.eventQueue = append(s.eventQueue, event)
	s.queueMutex.Unlock()
}

func (s *TelemetryService) processQueue() {
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	for range ticker.C {
		s.queueMutex.Lock()
		events := make([]Event, len(s.eventQueue))
		copy(events, s.eventQueue)
		s.eventQueue = s.eventQueue[:0]
		s.queueMutex.Unlock()

		if len(events) > 0 {
			for _, event := range events {
				s.sendEvent(event)
			}
		}
	}
}

func (s *TelemetryService) sendEventSync(event Event) {
	webhookURL := s.getWebhookURL()
	if webhookURL == "" {
		return
	}

	enabled, _ := s.IsEnabled()
	if !enabled {
		return
	}

	// Generate event hash for deduplication
	eventData := fmt.Sprintf("%s:%s:%v", event.Type, event.Message, event.Metadata)
	eventHash := fmt.Sprintf("%x", md5.Sum([]byte(eventData)))

	// Check if event is duplicated
	isDuplicated, err := s.db.IsEventDuplicated(eventHash)
	if err == nil && isDuplicated {
		return // Skip duplicated event
	}

	// Cache the event hash
	_ = s.db.CacheEventHash(eventHash)

	// Get installation ID
	installationID, err := s.ensureInstallationID()
	if err != nil {
		return
	}

	// Get system info
	osName := runtime.GOOS
	arch := runtime.GOARCH
	version := config.Version()

	// Create Discord embed
	var color int
	var title string
	switch event.Type {
	case "error":
		color = 15158332 // Red
		title = "🚨 Error Report"
	case "usage":
		color = 3447003 // Blue
		title = "📊 Usage Event"
	case "session":
		if event.Message == "session_start" {
			color = 3066993 // Green
			title = "▶️ Session Started"
		} else {
			color = 9807270 // Grey
			title = "⏹️ Session Ended"
		}
	default:
		color = 9807270 // Grey
		title = "ℹ️ Event"
	}

	// Build description
	description := fmt.Sprintf("**Message:** %s\n", event.Message)
	if len(event.Metadata) > 0 {
		metadataJSON, _ := json.MarshalIndent(event.Metadata, "", "  ")
		description += fmt.Sprintf("**Metadata:**\n```json\n%s\n```", string(metadataJSON))
	}

	// Build fields
	fields := []map[string]interface{}{
		{"name": "Version", "value": version, "inline": true},
		{"name": "OS", "value": fmt.Sprintf("%s/%s", osName, arch), "inline": true},
		{"name": "Installation ID", "value": fmt.Sprintf("`%s`", installationID[:8]), "inline": true},
	}

	if event.Stack != "" {
		stackPreview := event.Stack
		if len(stackPreview) > 1000 {
			stackPreview = stackPreview[:1000] + "..."
		}
		fields = append(fields, map[string]interface{}{
			"name":  "Stack Trace",
			"value": fmt.Sprintf("```\n%s\n```", stackPreview),
		})
	}

	// Create Discord webhook payload
	payload := map[string]interface{}{
		"embeds": []map[string]interface{}{
			{
				"title":       title,
				"description": description,
				"color":       color,
				"fields":      fields,
				"timestamp":   event.Timestamp.Format(time.RFC3339),
			},
		},
	}

	payloadJSON, err := json.Marshal(payload)
	if err != nil {
		return
	}

	// Send to Discord webhook synchronously (no timeout needed, app is closing)
	_, err = s.httpPost(webhookURL, payloadJSON)
	if err != nil {
		// Silently fail - app is closing anyway
		fmt.Printf("Telemetry error: %v\n", err)
	}
}

func (s *TelemetryService) sendEvent(event Event) {
	// Don't send session events through queue, they're handled separately
	if event.Type == "session" {
		return
	}

	webhookURL := s.getWebhookURL()
	if webhookURL == "" {
		return
	}

	enabled, _ := s.IsEnabled()
	if !enabled {
		return
	}

	// Rate limiting: max 10 events per minute per type
	s.rateMutex.Lock()
	lastTime, exists := s.rateLimiter[event.Type]
	if exists && time.Since(lastTime) < 6*time.Second { // 10 per minute = 1 every 6 seconds
		s.rateMutex.Unlock()
		return // Skip this event
	}
	s.rateLimiter[event.Type] = time.Now()
	s.rateMutex.Unlock()

	// Generate event hash for deduplication
	eventData := fmt.Sprintf("%s:%s:%v", event.Type, event.Message, event.Metadata)
	eventHash := fmt.Sprintf("%x", md5.Sum([]byte(eventData)))

	// Check if event is duplicated
	isDuplicated, err := s.db.IsEventDuplicated(eventHash)
	if err == nil && isDuplicated {
		return // Skip duplicated event
	}

	// Cache the event hash
	_ = s.db.CacheEventHash(eventHash)

	// Get installation ID
	installationID, err := s.ensureInstallationID()
	if err != nil {
		return
	}

	// Get system info
	osName := runtime.GOOS
	arch := runtime.GOARCH
	version := config.Version()

	// Create Discord embed
	var color int
	var title string
	switch event.Type {
	case "error":
		color = 15158332 // Red
		title = "🚨 Error Report"
	case "usage":
		color = 3447003 // Blue
		title = "📊 Usage Event"
	default:
		color = 9807270 // Grey
		title = "ℹ️ Event"
	}

	// Build description
	description := fmt.Sprintf("**Message:** %s\n", event.Message)
	if len(event.Metadata) > 0 {
		metadataJSON, _ := json.MarshalIndent(event.Metadata, "", "  ")
		description += fmt.Sprintf("**Metadata:**\n```json\n%s\n```", string(metadataJSON))
	}

	// Build fields
	fields := []map[string]interface{}{
		{"name": "Version", "value": version, "inline": true},
		{"name": "OS", "value": fmt.Sprintf("%s/%s", osName, arch), "inline": true},
		{"name": "Installation ID", "value": fmt.Sprintf("`%s`", installationID[:8]), "inline": true},
	}

	if event.Stack != "" {
		stackPreview := event.Stack
		if len(stackPreview) > 1000 {
			stackPreview = stackPreview[:1000] + "..."
		}
		fields = append(fields, map[string]interface{}{
			"name":  "Stack Trace",
			"value": fmt.Sprintf("```\n%s\n```", stackPreview),
		})
	}

	// Create Discord webhook payload
	payload := map[string]interface{}{
		"embeds": []map[string]interface{}{
			{
				"title":       title,
				"description": description,
				"color":       color,
				"fields":      fields,
				"timestamp":   event.Timestamp.Format(time.RFC3339),
			},
		},
	}

	payloadJSON, err := json.Marshal(payload)
	if err != nil {
		return
	}

	// Send to Discord webhook
	_, err = s.httpPost(webhookURL, payloadJSON)
	if err != nil {
		// Silently fail - don't disrupt the app
		fmt.Printf("Telemetry error: %v\n", err)
	}
}

func (s *TelemetryService) httpPost(url string, data []byte) (*bytes.Buffer, error) {
	req, err := http.NewRequest("POST", url, bytes.NewBuffer(data))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 5 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var buf bytes.Buffer
	_, err = buf.ReadFrom(resp.Body)
	return &buf, err
}

func (s *TelemetryService) GetPlatformInfo() map[string]string {
	hostname, _ := os.Hostname()
	return map[string]string{
		"os":       runtime.GOOS,
		"arch":     runtime.GOARCH,
		"hostname": hostname,
	}
}
