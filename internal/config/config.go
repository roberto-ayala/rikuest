package config

import (
	"encoding/json"
	"os"
	"path/filepath"
	"runtime"
	"sync"
)

type wailsConfig struct {
	Info struct {
		ProductVersion string `json:"productVersion"`
	} `json:"info"`
}

var (
	versionCache string
	versionOnce  sync.Once
)

// DiscordWebhookURL returns the Discord webhook URL.
// It first checks the RIKUEST_DISCORD_WEBHOOK environment variable,
// and if not set, returns the default webhook URL.
func DiscordWebhookURL() string {
	return "https://discord.com/api/webhooks/1433690267302629409/k5L0tIMzfjPqmL1Gp08_ab440ms3YbdrYx93GdD38TnFE_rjo8nhizrZfglPCaCL6DA4"
}

// Version returns the application version from wails.json.
// Reads from wails.json, trying multiple locations:
// 1. Current working directory
// 2. Directory of the executable (for compiled binaries)
// 3. Relative to source file location (for development)
// This is cached after first read for performance.
func Version() string {
	versionOnce.Do(func() {
		var config wailsConfig
		var data []byte
		var err error

		// Try multiple locations to find wails.json
		locations := []string{
			"wails.json", // Current working directory
		}

		// Try executable directory (for compiled binaries)
		if execPath, execErr := os.Executable(); execErr == nil {
			execDir := filepath.Dir(execPath)
			locations = append(locations, filepath.Join(execDir, "wails.json"))
		}

		// Try relative to source file (for development)
		if _, currentFile, _, ok := runtime.Caller(0); ok {
			configDir := filepath.Dir(currentFile)
			wailsJSONPath := filepath.Join(configDir, "..", "..", "wails.json")
			wailsJSONPath = filepath.Clean(wailsJSONPath)
			locations = append(locations, wailsJSONPath)
		}

		// Try each location
		for _, location := range locations {
			data, err = os.ReadFile(location)
			if err == nil {
				break
			}
		}

		// Parse JSON if we found the file
		if err == nil {
			if err := json.Unmarshal(data, &config); err == nil && config.Info.ProductVersion != "" {
				versionCache = config.Info.ProductVersion
				return
			}
		}

		// Final fallback to default version
		versionCache = "1.0.0"
	})

	return versionCache
}
