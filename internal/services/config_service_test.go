package services

import (
	"testing"
	"time"
)

func TestGetRequestTimeoutDefault(t *testing.T) {
	db := newTestDB(t)
	svc := NewConfigService(db)

	timeout, err := svc.GetRequestTimeout()
	if err != nil {
		t.Fatalf("GetRequestTimeout: %v", err)
	}
	if timeout != 300*time.Second {
		t.Errorf("default timeout = %v; want 300s", timeout)
	}
}

func TestSetRequestTimeoutClamping(t *testing.T) {
	db := newTestDB(t)
	svc := NewConfigService(db)

	tests := []struct {
		name string
		set  int
		want time.Duration
	}{
		{"below minimum clamps to 1s", -5, 1 * time.Second},
		{"zero clamps to 1s", 0, 1 * time.Second},
		{"normal value kept", 60, 60 * time.Second},
		{"above maximum clamps to 3h", 999999, 10800 * time.Second},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if err := svc.SetRequestTimeout(tt.set); err != nil {
				t.Fatalf("SetRequestTimeout(%d): %v", tt.set, err)
			}
			got, err := svc.GetRequestTimeout()
			if err != nil {
				t.Fatalf("GetRequestTimeout: %v", err)
			}
			if got != tt.want {
				t.Errorf("timeout after Set(%d) = %v; want %v", tt.set, got, tt.want)
			}
		})
	}
}

func TestGetRequestTimeoutInvalidValueFallsBack(t *testing.T) {
	db := newTestDB(t)
	if err := db.SetSetting("request_timeout_seconds", "not-a-number"); err != nil {
		t.Fatalf("SetSetting: %v", err)
	}

	timeout, err := NewConfigService(db).GetRequestTimeout()
	if err == nil {
		t.Error("expected error for non-numeric setting")
	}
	if timeout != 300*time.Second {
		t.Errorf("fallback timeout = %v; want 300s", timeout)
	}
}
