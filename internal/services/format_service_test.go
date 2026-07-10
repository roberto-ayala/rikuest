package services

import (
	"strings"
	"testing"

	"rikuest/internal/models"
)

func baseRequest() *models.Request {
	return &models.Request{
		Name:   "list users",
		Method: "GET",
		URL:    "https://api.example.com/users",
	}
}

func TestBuildCurlRequest(t *testing.T) {
	fs := NewFormatService()

	t.Run("simple GET", func(t *testing.T) {
		got := fs.BuildCurlRequest(baseRequest())
		if got != `curl -X GET "https://api.example.com/users"` {
			t.Errorf("got %q", got)
		}
	})

	t.Run("headers and bearer auth", func(t *testing.T) {
		req := baseRequest()
		req.Headers = map[string]string{"Accept": "application/json"}
		req.AuthType = "bearer"
		req.BearerToken = "tok"
		got := fs.BuildCurlRequest(req)
		for _, want := range []string{`-H "Accept: application/json"`, `-H "Authorization: Bearer tok"`} {
			if !strings.Contains(got, want) {
				t.Errorf("missing %q in %q", want, got)
			}
		}
	})

	t.Run("enabled query params are encoded into the URL", func(t *testing.T) {
		req := baseRequest()
		req.QueryParams = []models.QueryParam{
			{Key: "q", Value: "a b", Enabled: true},
			{Key: "off", Value: "x", Enabled: false},
		}
		got := fs.BuildCurlRequest(req)
		if !strings.Contains(got, "q=a+b") {
			t.Errorf("query param not encoded: %q", got)
		}
		if strings.Contains(got, "off=") {
			t.Errorf("disabled param included: %q", got)
		}
	})

	t.Run("json body", func(t *testing.T) {
		req := baseRequest()
		req.Method = "POST"
		req.BodyType = "json"
		req.Body = `{"a":1}`
		got := fs.BuildCurlRequest(req)
		if !strings.Contains(got, `-d '{"a":1}'`) {
			t.Errorf("body missing: %q", got)
		}
	})

	t.Run("form body is urlencoded", func(t *testing.T) {
		req := baseRequest()
		req.Method = "POST"
		req.BodyType = "form"
		req.FormData = []models.FormData{{Key: "user", Value: "jo hn"}}
		got := fs.BuildCurlRequest(req)
		if !strings.Contains(got, `-d "user=jo+hn"`) {
			t.Errorf("form data missing: %q", got)
		}
	})

	t.Run("basic auth uses -u", func(t *testing.T) {
		req := baseRequest()
		req.AuthType = "basic"
		req.BasicAuth = models.BasicAuth{Username: "u", Password: "p"}
		got := fs.BuildCurlRequest(req)
		if !strings.Contains(got, `-u "u:p"`) {
			t.Errorf("basic auth missing: %q", got)
		}
	})
}

func TestGetFormat(t *testing.T) {
	fs := NewFormatService()
	req := baseRequest()

	for _, format := range []string{"raw", "curl", "fetch", "python"} {
		if _, err := fs.GetFormat(req, format); err != nil {
			t.Errorf("GetFormat(%q) error: %v", format, err)
		}
	}
	if _, err := fs.GetFormat(req, "carrier-pigeon"); err == nil {
		t.Error("GetFormat with unknown format should error")
	}
}

func TestGetAllFormatsIncludesEverything(t *testing.T) {
	fs := NewFormatService()
	formats := fs.GetAllFormats(baseRequest())
	if formats.Raw == "" || formats.Curl == "" || formats.Fetch == "" || formats.Python == "" {
		t.Errorf("GetAllFormats returned empty entries: %+v", formats)
	}
}
