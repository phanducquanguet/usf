package handler

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http/httptest"
	"testing"
)

// insertPortalTestAgent creates a runnable agent in the fixture workspace.
// Mirrors the raw-INSERT fixture style of agent_access_test.go.
func insertPortalTestAgent(t *testing.T) string {
	t.Helper()
	var id string
	err := testPool.QueryRow(context.Background(), `
		INSERT INTO agent (
			workspace_id, name, description, runtime_mode, runtime_config,
			runtime_id, visibility, max_concurrent_tasks, owner_id
		)
		VALUES ($1, 'Portal Consultant', '', 'cloud', '{}'::jsonb, $2, 'workspace', 1, $3)
		RETURNING id
	`, testWorkspaceID, handlerTestRuntimeID(t), testUserID).Scan(&id)
	if err != nil {
		t.Fatalf("insert portal test agent: %v", err)
	}
	t.Cleanup(func() {
		testPool.Exec(context.Background(), `DELETE FROM agent WHERE id = $1`, id)
	})
	return id
}

func cleanupPortalRows(t *testing.T) {
	t.Cleanup(func() {
		ctx := context.Background()
		testPool.Exec(ctx, `DELETE FROM portal_session WHERE workspace_id = $1`, testWorkspaceID)
		// Delete the provisioned service user (cascades its member row).
		testPool.Exec(ctx, `DELETE FROM "user" WHERE id IN
			(SELECT service_user_id FROM workspace_portal_config WHERE workspace_id = $1)`, testWorkspaceID)
		testPool.Exec(ctx, `DELETE FROM workspace_portal_config WHERE workspace_id = $1`, testWorkspaceID)
	})
}

func putPortalConfig(t *testing.T, body map[string]any) *httptest.ResponseRecorder {
	t.Helper()
	buf, _ := json.Marshal(body)
	req := httptest.NewRequest("PUT", "/api/portal/config", bytes.NewReader(buf))
	req = chatPendingCtxAs(t, req, testUserID) // fixture user is the workspace owner
	rec := httptest.NewRecorder()
	testHandler.UpdatePortalAdminConfig(rec, req)
	return rec
}

func TestPortalAdminConfig_DefaultDisabled(t *testing.T) {
	if testHandler == nil {
		t.Skip("database not available")
	}
	cleanupPortalRows(t)
	req := httptest.NewRequest("GET", "/api/portal/config", nil)
	req = chatPendingCtxAs(t, req, testUserID)
	rec := httptest.NewRecorder()
	testHandler.GetPortalAdminConfig(rec, req)
	if rec.Code != 200 {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}
	var resp PortalAdminConfigResponse
	json.Unmarshal(rec.Body.Bytes(), &resp)
	if resp.Enabled {
		t.Fatal("expected disabled by default")
	}
}

func TestPortalAdminConfig_EnableRequiresAgent(t *testing.T) {
	if testHandler == nil {
		t.Skip("database not available")
	}
	cleanupPortalRows(t)
	rec := putPortalConfig(t, map[string]any{"enabled": true})
	if rec.Code != 400 {
		t.Fatalf("expected 400, got %d: %s", rec.Code, rec.Body.String())
	}
}

func TestPortalAdminConfig_EnableProvisionsServiceUser(t *testing.T) {
	if testHandler == nil {
		t.Skip("database not available")
	}
	cleanupPortalRows(t)
	agentID := insertPortalTestAgent(t)
	rec := putPortalConfig(t, map[string]any{
		"enabled":      true,
		"agent_id":     agentID,
		"hero_content": map[string]any{"headline": "Xây phần mềm theo ý bạn"},
	})
	if rec.Code != 200 {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}
	var resp PortalAdminConfigResponse
	json.Unmarshal(rec.Body.Bytes(), &resp)
	if !resp.Enabled || resp.AgentID != agentID || resp.ServiceUserID == "" {
		t.Fatalf("unexpected response: %+v", resp)
	}
	// Service user must be a workspace member.
	var role string
	err := testPool.QueryRow(context.Background(),
		`SELECT role FROM member WHERE workspace_id = $1 AND user_id = $2`,
		testWorkspaceID, resp.ServiceUserID).Scan(&role)
	if err != nil || role != "member" {
		t.Fatalf("service user membership: role=%q err=%v", role, err)
	}
	// Enabling twice must not create a second service user.
	rec2 := putPortalConfig(t, map[string]any{"enabled": true, "agent_id": agentID, "hero_content": map[string]any{}})
	var resp2 PortalAdminConfigResponse
	json.Unmarshal(rec2.Body.Bytes(), &resp2)
	if resp2.ServiceUserID != resp.ServiceUserID {
		t.Fatalf("service user changed on re-enable: %s -> %s", resp.ServiceUserID, resp2.ServiceUserID)
	}
}
