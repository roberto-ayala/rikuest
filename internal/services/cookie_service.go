package services

import (
	"log"
	"net/http"
	"net/http/cookiejar"
	neturl "net/url"
	"time"

	"rikuest/internal/database"
	"rikuest/internal/models"
)

// CookieService manages a per-project cookie jar backed by the
// project_cookies table. Cookies are scoped to the exact hostname of the
// request they were captured from/for (no subdomain wildcard matching in
// this first version).
type CookieService struct {
	db *database.DB
}

func NewCookieService(db *database.DB) *CookieService {
	return &CookieService{db: db}
}

func (s *CookieService) GetCookies(projectID int) ([]models.Cookie, error) {
	return s.db.GetCookiesForProject(projectID)
}

func (s *CookieService) DeleteCookie(id int) error {
	return s.db.DeleteCookie(id)
}

func (s *CookieService) ClearProjectCookies(projectID int) error {
	return s.db.DeleteCookiesForProject(projectID)
}

// BuildJarForRequest loads the cookies stored for projectID that match
// reqURL's host (exact match) and haven't expired, and returns a cookiejar
// pre-seeded with them for use as an http.Client's Jar.
func (s *CookieService) BuildJarForRequest(projectID int, reqURL *neturl.URL) (*cookiejar.Jar, error) {
	stored, err := s.db.GetCookiesForProject(projectID)
	if err != nil {
		return nil, err
	}

	jar, err := cookiejar.New(nil)
	if err != nil {
		return nil, err
	}

	host := reqURL.Hostname()
	now := time.Now()
	var cookies []*http.Cookie
	for _, c := range stored {
		if c.Domain != host {
			continue
		}
		if c.ExpiresAt != nil && !c.ExpiresAt.IsZero() && c.ExpiresAt.Before(now) {
			continue
		}
		cookie := &http.Cookie{
			Name:     c.Name,
			Value:    c.Value,
			Path:     c.Path,
			Domain:   c.Domain,
			Secure:   c.Secure,
			HttpOnly: c.HttpOnly,
		}
		if c.ExpiresAt != nil {
			cookie.Expires = *c.ExpiresAt
		}
		cookies = append(cookies, cookie)
	}

	if len(cookies) > 0 {
		jar.SetCookies(reqURL, cookies)
	}

	return jar, nil
}

// SyncFromResponse persists every Set-Cookie header on resp into
// project_cookies, scoped under reqURL's host. Individual upsert failures are
// logged and swallowed — cookie persistence must never fail a request.
func (s *CookieService) SyncFromResponse(projectID int, reqURL *neturl.URL, resp *http.Response) error {
	host := reqURL.Hostname()
	for _, rc := range resp.Cookies() {
		if rc.Name == "" {
			continue
		}

		path := rc.Path
		if path == "" {
			path = "/"
		}

		var expiresAt *time.Time
		if !rc.Expires.IsZero() {
			e := rc.Expires
			expiresAt = &e
		}

		cookie := &models.Cookie{
			ProjectID: projectID,
			Domain:    host,
			Path:      path,
			Name:      rc.Name,
			Value:     rc.Value,
			ExpiresAt: expiresAt,
			Secure:    rc.Secure,
			HttpOnly:  rc.HttpOnly,
			SameSite:  sameSiteToString(rc.SameSite),
		}

		if err := s.db.UpsertCookie(cookie); err != nil {
			log.Printf("Warning: failed to persist cookie %q for project %d: %v", rc.Name, projectID, err)
		}
	}

	return nil
}

func sameSiteToString(s http.SameSite) string {
	switch s {
	case http.SameSiteStrictMode:
		return "strict"
	case http.SameSiteLaxMode:
		return "lax"
	case http.SameSiteNoneMode:
		return "none"
	default:
		return ""
	}
}
