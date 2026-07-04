package services

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"rikuest/internal/models"
)

func newRequestService(t *testing.T) *RequestService {
	t.Helper()
	return NewRequestService(newTestDB(t))
}

func TestExecuteHTTPRequestBasics(t *testing.T) {
	var got *http.Request
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		got = r.Clone(r.Context())
		w.Header().Set("X-Custom", "yes")
		w.WriteHeader(http.StatusTeapot)
		w.Write([]byte(`{"ok":true}`))
	}))
	defer server.Close()

	svc := newRequestService(t)
	resp, err := svc.executeHTTPRequest(&models.Request{
		Method:      "GET",
		URL:         server.URL + "/path",
		Headers:     map[string]string{"X-In": "abc"},
		QueryParams: []models.QueryParam{{Key: "q", Value: "1", Enabled: true}, {Key: "no", Value: "x", Enabled: false}},
		AuthType:    "bearer",
		BearerToken: "tok",
	})
	if err != nil {
		t.Fatalf("executeHTTPRequest: %v", err)
	}

	if resp.Status != http.StatusTeapot {
		t.Errorf("Status = %d; want 418", resp.Status)
	}
	if resp.Body != `{"ok":true}` {
		t.Errorf("Body = %q", resp.Body)
	}
	if resp.Headers["X-Custom"] != "yes" {
		t.Errorf("response header missing: %v", resp.Headers)
	}
	if got.Header.Get("X-In") != "abc" || got.Header.Get("Authorization") != "Bearer tok" {
		t.Errorf("request headers not sent: %v", got.Header)
	}
	if got.URL.Query().Get("q") != "1" {
		t.Errorf("enabled query param not sent: %s", got.URL.RawQuery)
	}
	if got.URL.Query().Has("no") {
		t.Errorf("disabled query param sent: %s", got.URL.RawQuery)
	}
	if resp.RawRequest == "" {
		t.Error("RawRequest is empty")
	}
}

func TestExecuteHTTPRequestFormBody(t *testing.T) {
	var contentType, body string
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		contentType = r.Header.Get("Content-Type")
		if err := r.ParseForm(); err == nil {
			body = r.PostForm.Encode()
		}
	}))
	defer server.Close()

	svc := newRequestService(t)
	_, err := svc.executeHTTPRequest(&models.Request{
		Method:   "POST",
		URL:      server.URL,
		BodyType: "form",
		FormData: []models.FormData{{Key: "a", Value: "1"}, {Key: "b", Value: "x y"}},
	})
	if err != nil {
		t.Fatalf("executeHTTPRequest: %v", err)
	}
	if contentType != "application/x-www-form-urlencoded" {
		t.Errorf("Content-Type = %q", contentType)
	}
	if body != "a=1&b=x+y" {
		t.Errorf("form body = %q", body)
	}
}

func TestExecuteHTTPRequestConnectionErrorBecomesResponse(t *testing.T) {
	svc := newRequestService(t)
	// Port 1 is virtually guaranteed to refuse connections
	resp, err := svc.executeHTTPRequest(&models.Request{Method: "GET", URL: "http://127.0.0.1:1/"})
	if err != nil {
		t.Fatalf("connection errors must be returned as a response, got err: %v", err)
	}
	if resp.Status != 0 {
		t.Errorf("Status = %d; want 0 for network error", resp.Status)
	}
	if resp.StatusText == "" || resp.Body == "" {
		t.Error("error response should carry status text and body")
	}
}

func TestExecuteHTTPRequestTruncatesLargeBodies(t *testing.T) {
	overLimit := maxResponseBodyBytes + 512
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		chunk := strings.Repeat("x", 64*1024)
		var sent int64
		for sent < overLimit {
			w.Write([]byte(chunk))
			sent += int64(len(chunk))
		}
	}))
	defer server.Close()

	svc := newRequestService(t)
	resp, err := svc.executeHTTPRequest(&models.Request{Method: "GET", URL: server.URL})
	if err != nil {
		t.Fatalf("executeHTTPRequest: %v", err)
	}
	if resp.Size != maxResponseBodyBytes {
		t.Errorf("Size = %d; want %d (truncated)", resp.Size, maxResponseBodyBytes)
	}
	if !strings.Contains(resp.Body, "Response truncated") {
		t.Error("truncation marker missing from body")
	}
}
