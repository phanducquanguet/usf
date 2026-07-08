package handler

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

// TestGetMe_CanCreateWorkspace pins the per-user creation permission on
// /api/me across the three config states: gate off, gate on without
// allowlist, gate on with the caller allowlisted.
func TestGetMe_CanCreateWorkspace(t *testing.T) {
	if testHandler == nil {
		t.Skip("database not available")
	}

	prev := testHandler.cfg
	t.Cleanup(func() { testHandler.cfg = prev })

	fetch := func(t *testing.T) bool {
		t.Helper()
		w := httptest.NewRecorder()
		req := newRequest("GET", "/api/me", nil)
		testHandler.GetMe(w, req)
		if w.Code != http.StatusOK {
			t.Fatalf("GetMe: %d %s", w.Code, w.Body.String())
		}
		var resp struct {
			CanCreateWorkspace bool `json:"can_create_workspace"`
		}
		if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
			t.Fatalf("decode: %v", err)
		}
		return resp.CanCreateWorkspace
	}

	testHandler.cfg = Config{AllowSignup: prev.AllowSignup}
	if !fetch(t) {
		t.Fatal("gate off: expected can_create_workspace=true")
	}

	testHandler.cfg = Config{AllowSignup: prev.AllowSignup, DisableWorkspaceCreation: true}
	if fetch(t) {
		t.Fatal("gate on, not allowlisted: expected can_create_workspace=false")
	}

	testHandler.cfg = Config{
		AllowSignup:                    prev.AllowSignup,
		DisableWorkspaceCreation:       true,
		WorkspaceCreationAllowedEmails: []string{handlerTestEmail},
	}
	if !fetch(t) {
		t.Fatal("gate on, allowlisted: expected can_create_workspace=true")
	}
}
