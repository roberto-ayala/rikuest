package services

import (
	"testing"

	"rikuest/internal/models"
)

func TestCookieServiceCRUD(t *testing.T) {
	db := newTestDB(t)
	project := createProject(t, db, "cookie-crud-project")
	svc := NewCookieService(db)

	cookie := &models.Cookie{
		ProjectID: project.ID,
		Domain:    "example.com",
		Path:      "/",
		Name:      "session",
		Value:     "abc123",
	}
	if err := db.UpsertCookie(cookie); err != nil {
		t.Fatalf("UpsertCookie: %v", err)
	}
	if cookie.ID == 0 {
		t.Fatal("UpsertCookie did not populate ID")
	}

	cookies, err := svc.GetCookies(project.ID)
	if err != nil {
		t.Fatalf("GetCookies: %v", err)
	}
	if len(cookies) != 1 || cookies[0].Value != "abc123" {
		t.Fatalf("GetCookies = %+v; want one cookie with value abc123", cookies)
	}

	// Upserting the same (project_id, domain, path, name) tuple updates in place.
	cookie.Value = "updated456"
	if err := db.UpsertCookie(cookie); err != nil {
		t.Fatalf("UpsertCookie (update): %v", err)
	}
	cookies, err = svc.GetCookies(project.ID)
	if err != nil {
		t.Fatalf("GetCookies after update: %v", err)
	}
	if len(cookies) != 1 || cookies[0].Value != "updated456" {
		t.Fatalf("GetCookies after update = %+v; want single updated cookie", cookies)
	}

	if err := svc.DeleteCookie(cookies[0].ID); err != nil {
		t.Fatalf("DeleteCookie: %v", err)
	}
	cookies, err = svc.GetCookies(project.ID)
	if err != nil {
		t.Fatalf("GetCookies after delete: %v", err)
	}
	if len(cookies) != 0 {
		t.Fatalf("GetCookies after delete = %+v; want empty", cookies)
	}

	// ClearProjectCookies removes everything for the project in one call.
	for _, name := range []string{"a", "b"} {
		c := &models.Cookie{ProjectID: project.ID, Domain: "example.com", Path: "/", Name: name, Value: "v"}
		if err := db.UpsertCookie(c); err != nil {
			t.Fatalf("UpsertCookie(%s): %v", name, err)
		}
	}
	if err := svc.ClearProjectCookies(project.ID); err != nil {
		t.Fatalf("ClearProjectCookies: %v", err)
	}
	cookies, err = svc.GetCookies(project.ID)
	if err != nil {
		t.Fatalf("GetCookies after clear: %v", err)
	}
	if len(cookies) != 0 {
		t.Fatalf("GetCookies after clear = %+v; want empty", cookies)
	}
}
