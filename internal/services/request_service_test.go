package services

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"rikuest/internal/models"
)

func newRequestService(t *testing.T) *RequestService {
	t.Helper()
	db := newTestDB(t)
	return NewRequestService(db, NewVariableResolver(db), NewResponseCaptureService(db))
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
	resp, err := svc.executeHTTPRequest(context.Background(), &models.Request{
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
	_, err := svc.executeHTTPRequest(context.Background(), &models.Request{
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
	resp, err := svc.executeHTTPRequest(context.Background(), &models.Request{Method: "GET", URL: "http://127.0.0.1:1/"})
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

func TestExecuteHTTPRequestHonorsContextCancellation(t *testing.T) {
	release := make(chan struct{})
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		<-release // hold the request open until the test finishes
	}))
	defer server.Close()
	defer close(release)

	ctx, cancel := context.WithCancel(context.Background())
	go cancel()

	svc := newRequestService(t)
	resp, err := svc.executeHTTPRequest(ctx, &models.Request{Method: "GET", URL: server.URL})
	if err != nil {
		t.Fatalf("cancellation must surface as an error response, got err: %v", err)
	}
	if resp.Status != 0 {
		t.Errorf("Status = %d; want 0 for cancelled request", resp.Status)
	}
}

func TestExecuteHTTPRequestApiKeyInHeader(t *testing.T) {
	var got *http.Request
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		got = r.Clone(r.Context())
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()

	svc := newRequestService(t)
	_, err := svc.executeHTTPRequest(context.Background(), &models.Request{
		Method:         "GET",
		URL:            server.URL,
		AuthType:       "apikey",
		ApiKeyName:     "X-API-Key",
		ApiKeyValue:    "secret123",
		ApiKeyLocation: "header",
	})
	if err != nil {
		t.Fatalf("executeHTTPRequest: %v", err)
	}
	if got.Header.Get("X-API-Key") != "secret123" {
		t.Errorf("api key header not sent: %v", got.Header)
	}
}

func TestExecuteHTTPRequestApiKeyInQuery(t *testing.T) {
	var got *http.Request
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		got = r.Clone(r.Context())
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()

	svc := newRequestService(t)
	_, err := svc.executeHTTPRequest(context.Background(), &models.Request{
		Method:         "GET",
		URL:            server.URL,
		AuthType:       "apikey",
		ApiKeyName:     "api_key",
		ApiKeyValue:    "secret123",
		ApiKeyLocation: "query",
	})
	if err != nil {
		t.Fatalf("executeHTTPRequest: %v", err)
	}
	if got.URL.Query().Get("api_key") != "secret123" {
		t.Errorf("api key query param not sent: %s", got.URL.RawQuery)
	}
	if got.Header.Get("api_key") != "" {
		t.Errorf("api key should not also be sent as a header: %v", got.Header)
	}
}

func TestExecuteHTTPRequestInsecureSkipVerify(t *testing.T) {
	server := httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()

	svc := newRequestService(t)

	// Without the flag, the self-signed certificate must be rejected.
	resp, err := svc.executeHTTPRequest(context.Background(), &models.Request{Method: "GET", URL: server.URL})
	if err != nil {
		t.Fatalf("TLS errors must be returned as a response, got err: %v", err)
	}
	if resp.Status != 0 {
		t.Errorf("Status = %d; want 0 for TLS verification failure", resp.Status)
	}
	if !strings.Contains(strings.ToLower(resp.StatusText), "tls") && !strings.Contains(strings.ToLower(resp.StatusText), "ssl") {
		t.Errorf("StatusText = %q; want an SSL/TLS-ish status", resp.StatusText)
	}

	// With the flag, the same self-signed certificate must be accepted.
	resp, err = svc.executeHTTPRequest(context.Background(), &models.Request{
		Method:             "GET",
		URL:                server.URL,
		InsecureSkipVerify: true,
	})
	if err != nil {
		t.Fatalf("executeHTTPRequest: %v", err)
	}
	if resp.Status != http.StatusOK {
		t.Errorf("Status = %d; want 200 with InsecureSkipVerify", resp.Status)
	}
}

func TestExecuteHTTPRequestFollowRedirects(t *testing.T) {
	var mux http.ServeMux
	mux.HandleFunc("/redirect", func(w http.ResponseWriter, r *http.Request) {
		http.Redirect(w, r, "/final", http.StatusFound)
	})
	mux.HandleFunc("/final", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})
	server := httptest.NewServer(&mux)
	defer server.Close()

	svc := newRequestService(t)

	// FollowRedirects = false: the 302 itself should be surfaced, not followed.
	resp, err := svc.executeHTTPRequest(context.Background(), &models.Request{
		Method:          "GET",
		URL:             server.URL + "/redirect",
		FollowRedirects: false,
	})
	if err != nil {
		t.Fatalf("executeHTTPRequest: %v", err)
	}
	if resp.Status != http.StatusFound {
		t.Errorf("Status = %d; want 302 when FollowRedirects is false", resp.Status)
	}

	// FollowRedirects = true: the client should transparently follow to the final 200.
	resp, err = svc.executeHTTPRequest(context.Background(), &models.Request{
		Method:          "GET",
		URL:             server.URL + "/redirect",
		FollowRedirects: true,
		MaxRedirects:    10,
	})
	if err != nil {
		t.Fatalf("executeHTTPRequest: %v", err)
	}
	if resp.Status != http.StatusOK {
		t.Errorf("Status = %d; want 200 when FollowRedirects is true", resp.Status)
	}
}

func TestExecuteHTTPRequestPerRequestTimeoutOverride(t *testing.T) {
	release := make(chan struct{})
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		<-release // never respond within the test's short timeout
	}))
	defer server.Close()
	defer close(release)

	svc := newRequestService(t)
	resp, err := svc.executeHTTPRequest(context.Background(), &models.Request{
		Method:         "GET",
		URL:            server.URL,
		TimeoutSeconds: 1,
	})
	if err != nil {
		t.Fatalf("timeouts must be returned as a response, got err: %v", err)
	}
	if resp.Status != 0 {
		t.Errorf("Status = %d; want 0 for a timed-out request", resp.Status)
	}
	if !strings.Contains(strings.ToLower(resp.StatusText), "timeout") {
		t.Errorf("StatusText = %q; want a timeout-ish status", resp.StatusText)
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
	resp, err := svc.executeHTTPRequest(context.Background(), &models.Request{Method: "GET", URL: server.URL})
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
