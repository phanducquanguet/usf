package handler

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/go-chi/chi/v5"
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

// enablePortalForTests turns the portal on for the fixture workspace and points
// the handler config at its slug. Returns the agent id and service user id.
func enablePortalForTests(t *testing.T) (agentID string, serviceUserID string) {
	t.Helper()
	cleanupPortalRows(t)
	agentID = insertPortalTestAgent(t)
	rec := putPortalConfig(t, map[string]any{
		"enabled": true, "agent_id": agentID,
		"hero_content": map[string]any{"headline": "Xây phần mềm theo ý bạn", "greeting": "Xin chào!"},
	})
	if rec.Code != 200 {
		t.Fatalf("enable portal: %d %s", rec.Code, rec.Body.String())
	}
	var resp PortalAdminConfigResponse
	json.Unmarshal(rec.Body.Bytes(), &resp)
	prev := testHandler.cfg.PortalWorkspaceSlug
	testHandler.cfg.PortalWorkspaceSlug = "handler-tests" // fixture workspace slug
	t.Cleanup(func() { testHandler.cfg.PortalWorkspaceSlug = prev })
	return agentID, resp.ServiceUserID
}

func portalTokenRequest(t *testing.T, method, path, token string, body map[string]any) (*httptest.ResponseRecorder, *http.Request) {
	t.Helper()
	reader := bytes.NewReader(nil)
	if body != nil {
		buf, _ := json.Marshal(body)
		reader = bytes.NewReader(buf)
	}
	req := httptest.NewRequest(method, path, reader)
	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("token", token)
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))
	return httptest.NewRecorder(), req
}

func TestPortalPublicConfig_DisabledWithoutSlug(t *testing.T) {
	if testHandler == nil {
		t.Skip("database not available")
	}
	prev := testHandler.cfg.PortalWorkspaceSlug
	testHandler.cfg.PortalWorkspaceSlug = ""
	t.Cleanup(func() { testHandler.cfg.PortalWorkspaceSlug = prev })
	rec := httptest.NewRecorder()
	testHandler.GetPortalPublicConfig(rec, httptest.NewRequest("GET", "/portal/config", nil))
	if rec.Code != 200 {
		t.Fatalf("expected 200, got %d", rec.Code)
	}
	var resp map[string]any
	json.Unmarshal(rec.Body.Bytes(), &resp)
	if resp["enabled"] != false {
		t.Fatalf("expected enabled=false, got %v", resp)
	}
}

func TestPortalPublicConfig_EnabledExposesHeroAndAgent(t *testing.T) {
	if testHandler == nil {
		t.Skip("database not available")
	}
	enablePortalForTests(t)
	rec := httptest.NewRecorder()
	testHandler.GetPortalPublicConfig(rec, httptest.NewRequest("GET", "/portal/config", nil))
	var resp struct {
		Enabled     bool           `json:"enabled"`
		HeroContent map[string]any `json:"hero_content"`
		Agent       struct {
			Name string `json:"name"`
		} `json:"agent"`
	}
	json.Unmarshal(rec.Body.Bytes(), &resp)
	if !resp.Enabled || resp.HeroContent["headline"] != "Xây phần mềm theo ý bạn" || resp.Agent.Name != "Portal Consultant" {
		t.Fatalf("unexpected response: %s", rec.Body.String())
	}
}

func TestPortalGuestSession_CreateReturnsToken(t *testing.T) {
	if testHandler == nil {
		t.Skip("database not available")
	}
	_, serviceUserID := enablePortalForTests(t)
	rec := httptest.NewRecorder()
	testHandler.CreatePortalGuestSession(rec, httptest.NewRequest("POST", "/portal/sessions", nil))
	if rec.Code != 201 {
		t.Fatalf("expected 201, got %d: %s", rec.Code, rec.Body.String())
	}
	var resp struct {
		Token string `json:"token"`
	}
	json.Unmarshal(rec.Body.Bytes(), &resp)
	if len(resp.Token) < 10 || resp.Token[:4] != "pgt_" {
		t.Fatalf("bad token: %q", resp.Token)
	}
	// A chat_session owned by the service user must exist.
	var creatorID string
	err := testPool.QueryRow(context.Background(), `
		SELECT cs.creator_id::text FROM portal_session ps
		JOIN chat_session cs ON cs.id = ps.chat_session_id
		WHERE ps.guest_token_hash = $1`, hashPortalToken(resp.Token)).Scan(&creatorID)
	if err != nil || creatorID != serviceUserID {
		t.Fatalf("session creator: %q err=%v (want %q)", creatorID, err, serviceUserID)
	}
	t.Cleanup(func() {
		testPool.Exec(context.Background(),
			`DELETE FROM chat_session WHERE id IN (SELECT chat_session_id FROM portal_session WHERE workspace_id = $1)`,
			testWorkspaceID)
	})
}

func TestPortalGuestSession_CreateFailsWhenDisabled(t *testing.T) {
	if testHandler == nil {
		t.Skip("database not available")
	}
	prev := testHandler.cfg.PortalWorkspaceSlug
	testHandler.cfg.PortalWorkspaceSlug = ""
	t.Cleanup(func() { testHandler.cfg.PortalWorkspaceSlug = prev })
	rec := httptest.NewRecorder()
	testHandler.CreatePortalGuestSession(rec, httptest.NewRequest("POST", "/portal/sessions", nil))
	if rec.Code != 404 {
		t.Fatalf("expected 404, got %d", rec.Code)
	}
}

func createPortalGuestSessionForTest(t *testing.T) (token string) {
	t.Helper()
	rec := httptest.NewRecorder()
	testHandler.CreatePortalGuestSession(rec, httptest.NewRequest("POST", "/portal/sessions", nil))
	if rec.Code != 201 {
		t.Fatalf("create guest session: %d %s", rec.Code, rec.Body.String())
	}
	var resp struct {
		Token string `json:"token"`
	}
	json.Unmarshal(rec.Body.Bytes(), &resp)
	t.Cleanup(func() {
		testPool.Exec(context.Background(),
			`DELETE FROM chat_session WHERE id IN (SELECT chat_session_id FROM portal_session WHERE guest_token_hash = $1)`,
			hashPortalToken(resp.Token))
	})
	return resp.Token
}

func TestPortalSendMessage_InvalidToken(t *testing.T) {
	if testHandler == nil {
		t.Skip("database not available")
	}
	enablePortalForTests(t)
	rec, req := portalTokenRequest(t, "POST", "/portal/sessions/pgt_bogus/messages", "pgt_bogus", map[string]any{"content": "hi"})
	testHandler.SendPortalMessage(rec, req)
	if rec.Code != 401 {
		t.Fatalf("expected 401, got %d", rec.Code)
	}
}

func TestPortalSendMessage_EnqueuesAndPrefixesFirstMessage(t *testing.T) {
	if testHandler == nil {
		t.Skip("database not available")
	}
	enablePortalForTests(t)
	token := createPortalGuestSessionForTest(t)
	rec, req := portalTokenRequest(t, "POST", "/portal/sessions/"+token+"/messages", token, map[string]any{"content": "Tôi muốn làm phần mềm quản lý kho"})
	testHandler.SendPortalMessage(rec, req)
	if rec.Code != 202 {
		t.Fatalf("expected 202, got %d: %s", rec.Code, rec.Body.String())
	}
	// Stored first message carries the [PORTAL] preamble; a task is linked.
	var content string
	var taskID *string
	err := testPool.QueryRow(context.Background(), `
		SELECT cm.content, cm.task_id::text FROM chat_message cm
		JOIN portal_session ps ON ps.chat_session_id = cm.chat_session_id
		WHERE ps.guest_token_hash = $1 AND cm.role = 'user'
		ORDER BY cm.created_at DESC LIMIT 1`, hashPortalToken(token)).Scan(&content, &taskID)
	if err != nil {
		t.Fatalf("load stored message: %v", err)
	}
	if !strings.HasPrefix(content, "[PORTAL]") {
		t.Fatalf("first message not prefixed: %q", content)
	}
	if taskID == nil || *taskID == "" {
		t.Fatal("message not linked to an enqueued task")
	}
	// List response strips the preamble for the guest.
	lrec, lreq := portalTokenRequest(t, "GET", "/portal/sessions/"+token+"/messages", token, nil)
	testHandler.ListPortalMessages(lrec, lreq)
	var list struct {
		Messages []struct {
			Content string `json:"content"`
		} `json:"messages"`
		Pending bool   `json:"pending"`
		Status  string `json:"status"`
	}
	json.Unmarshal(lrec.Body.Bytes(), &list)
	if len(list.Messages) != 1 || strings.Contains(list.Messages[0].Content, "[PORTAL]") {
		t.Fatalf("unexpected list: %s", lrec.Body.String())
	}
	if !list.Pending || list.Status != "active" {
		t.Fatalf("expected pending active session, got %s", lrec.Body.String())
	}
}

func TestPortalSendMessage_FirstMessageSlugBuildsRichContext(t *testing.T) {
	if testHandler == nil {
		t.Skip("database not available")
	}
	enablePortalForTests(t)
	cleanupPortalProjects(t)
	project := createTestPortalProject(t, "UNI-HRM", true)
	// Session created WITHOUT a slug (e.g. from the landing page); the slug
	// arriving with the first message must still produce full project context.
	token := createPortalGuestSessionForTest(t)
	rec, req := portalTokenRequest(t, "POST", "/portal/sessions/"+token+"/messages", token,
		map[string]any{"content": "Cho tôi biết thêm", "project_slug": project.Slug})
	testHandler.SendPortalMessage(rec, req)
	if rec.Code != 202 {
		t.Fatalf("expected 202, got %d: %s", rec.Code, rec.Body.String())
	}
	var content string
	err := testPool.QueryRow(context.Background(), `
		SELECT cm.content FROM chat_message cm
		JOIN portal_session ps ON ps.chat_session_id = cm.chat_session_id
		WHERE ps.guest_token_hash = $1 AND cm.role = 'user'`,
		hashPortalToken(token)).Scan(&content)
	if err != nil {
		t.Fatalf("load stored message: %v", err)
	}
	for _, want := range []string{"UNI-HRM", "Mô tả: Mô tả", "Tính năng chính: Đặt bàn; Thanh toán", "lĩnh vực: F&B"} {
		if !strings.Contains(content, want) {
			t.Fatalf("stored message missing %q: %q", want, content)
		}
	}
}

func TestPortalSendMessage_RejectsWhilePending(t *testing.T) {
	if testHandler == nil {
		t.Skip("database not available")
	}
	agentID, _ := enablePortalForTests(t)
	token := createPortalGuestSessionForTest(t)
	var chatSessionID string
	testPool.QueryRow(context.Background(),
		`SELECT chat_session_id::text FROM portal_session WHERE guest_token_hash = $1`,
		hashPortalToken(token)).Scan(&chatSessionID)
	insertPendingChatTask(t, agentID, chatSessionID, "queued")
	rec, req := portalTokenRequest(t, "POST", "/portal/sessions/"+token+"/messages", token, map[string]any{"content": "again"})
	testHandler.SendPortalMessage(rec, req)
	if rec.Code != 409 {
		t.Fatalf("expected 409, got %d: %s", rec.Code, rec.Body.String())
	}
}

func TestPortalListMessages_PartialStreamsAssistantText(t *testing.T) {
	if testHandler == nil {
		t.Skip("database not available")
	}
	agentID, _ := enablePortalForTests(t)
	token := createPortalGuestSessionForTest(t)
	var chatSessionID string
	testPool.QueryRow(context.Background(),
		`SELECT chat_session_id::text FROM portal_session WHERE guest_token_hash = $1`,
		hashPortalToken(token)).Scan(&chatSessionID)

	// No in-flight task → no partial.
	rec0, req0 := portalTokenRequest(t, "GET", "/portal/sessions/"+token+"/messages", token, nil)
	testHandler.ListPortalMessages(rec0, req0)
	if strings.Contains(rec0.Body.String(), "partial") {
		t.Fatalf("expected no partial without a pending task: %s", rec0.Body.String())
	}

	taskID := insertPendingChatTask(t, agentID, chatSessionID, "running")
	// Streamed fragments: only type='text' may reach the guest.
	for i, m := range []struct{ typ, content string }{
		{"thinking", "internal reasoning"},
		{"text", "Chào bạn, "},
		{"tool_use", "tool input"},
		{"text", "tôi đang phân tích yêu cầu."},
	} {
		if _, err := testPool.Exec(context.Background(), `
			INSERT INTO task_message (task_id, seq, type, content)
			VALUES ($1, $2, $3, $4)`, taskID, i+1, m.typ, m.content); err != nil {
			t.Fatalf("insert task_message: %v", err)
		}
	}

	rec, req := portalTokenRequest(t, "GET", "/portal/sessions/"+token+"/messages", token, nil)
	testHandler.ListPortalMessages(rec, req)
	if rec.Code != 200 {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}
	var resp struct {
		Pending bool   `json:"pending"`
		Partial string `json:"partial"`
	}
	json.Unmarshal(rec.Body.Bytes(), &resp)
	if !resp.Pending {
		t.Fatalf("expected pending=true: %s", rec.Body.String())
	}
	if resp.Partial != "Chào bạn, tôi đang phân tích yêu cầu." {
		t.Fatalf("unexpected partial: %q", resp.Partial)
	}
	for _, leak := range []string{"internal reasoning", "tool input"} {
		if strings.Contains(rec.Body.String(), leak) {
			t.Fatalf("non-text fragment leaked to guest: %s", rec.Body.String())
		}
	}
}

func TestPortalConfirm_PersistsContactAndAppendsMarkerMessage(t *testing.T) {
	if testHandler == nil {
		t.Skip("database not available")
	}
	enablePortalForTests(t)
	token := createPortalGuestSessionForTest(t)
	rec, req := portalTokenRequest(t, "POST", "/portal/sessions/"+token+"/confirm", token,
		map[string]any{"name": "Nguyễn Văn A", "email": "a@example.com", "phone": "0900000000"})
	testHandler.ConfirmPortalSession(rec, req)
	if rec.Code != 200 {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}
	var status, name, email string
	testPool.QueryRow(context.Background(),
		`SELECT status, contact_name, contact_email FROM portal_session WHERE guest_token_hash = $1`,
		hashPortalToken(token)).Scan(&status, &name, &email)
	if status != "confirmed" || name != "Nguyễn Văn A" || email != "a@example.com" {
		t.Fatalf("contact not persisted: %s %s %s", status, name, email)
	}
	var content string
	testPool.QueryRow(context.Background(), `
		SELECT cm.content FROM chat_message cm
		JOIN portal_session ps ON ps.chat_session_id = cm.chat_session_id
		WHERE ps.guest_token_hash = $1 ORDER BY cm.created_at DESC LIMIT 1`,
		hashPortalToken(token)).Scan(&content)
	if !strings.HasPrefix(content, "[KHÁCH XÁC NHẬN]") {
		t.Fatalf("confirmation message missing marker: %q", content)
	}
	// Second confirm → 409.
	rec2, req2 := portalTokenRequest(t, "POST", "/portal/sessions/"+token+"/confirm", token,
		map[string]any{"name": "B", "email": "b@example.com"})
	testHandler.ConfirmPortalSession(rec2, req2)
	if rec2.Code != 409 {
		t.Fatalf("expected 409 on double confirm, got %d", rec2.Code)
	}
}
