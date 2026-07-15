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

func cleanupPortalProjects(t *testing.T) {
	t.Helper()
	t.Cleanup(func() {
		testPool.Exec(context.Background(),
			`DELETE FROM portal_project WHERE workspace_id = $1`, testWorkspaceID)
	})
}

func adminProjectRequest(t *testing.T, method, path, id string, body map[string]any) (*httptest.ResponseRecorder, *http.Request) {
	t.Helper()
	reader := bytes.NewReader(nil)
	if body != nil {
		buf, _ := json.Marshal(body)
		reader = bytes.NewReader(buf)
	}
	req := httptest.NewRequest(method, path, reader)
	req = chatPendingCtxAs(t, req, testUserID)
	if id != "" {
		rctx := chi.NewRouteContext()
		rctx.URLParams.Add("id", id)
		req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))
	}
	return httptest.NewRecorder(), req
}

func createTestPortalProject(t *testing.T, name string, published bool) PortalAdminProjectResponse {
	t.Helper()
	rec, req := adminProjectRequest(t, "POST", "/api/portal/projects", "", map[string]any{
		"name": name, "description": "Mô tả", "industry": "F&B",
		"features": []string{"Đặt bàn", "Thanh toán"}, "images": []string{"https://cdn.example.com/a.png"},
		"demo_url": "https://demo.example.com", "portfolio_url": "https://p.example.com",
		"source_url": "git@internal:repo.git", "published": published, "sort_order": 1,
		"i18n": map[string]any{"en": map[string]any{"name": name + " (en)"}},
	})
	testHandler.CreatePortalProject(rec, req)
	if rec.Code != 201 {
		t.Fatalf("create project: %d %s", rec.Code, rec.Body.String())
	}
	var resp PortalAdminProjectResponse
	json.Unmarshal(rec.Body.Bytes(), &resp)
	return resp
}

func TestPortalProject_CreateGeneratesSlug(t *testing.T) {
	if testHandler == nil {
		t.Skip("database not available")
	}
	cleanupPortalProjects(t)
	p := createTestPortalProject(t, "Quản lý nhà hàng", true)
	if p.Slug != "quan-ly-nha-hang" {
		t.Fatalf("expected diacritics-stripped slug, got %q", p.Slug)
	}
	if p.SourceURL != "git@internal:repo.git" {
		t.Fatalf("admin response must include source_url, got %+v", p)
	}
	// Same name again gets a numbered suffix, not a 500.
	p2 := createTestPortalProject(t, "Quản lý nhà hàng", false)
	if p2.Slug != "quan-ly-nha-hang-2" {
		t.Fatalf("expected suffixed slug, got %q", p2.Slug)
	}
}

func TestPortalProject_CreateRequiresName(t *testing.T) {
	if testHandler == nil {
		t.Skip("database not available")
	}
	cleanupPortalProjects(t)
	rec, req := adminProjectRequest(t, "POST", "/api/portal/projects", "", map[string]any{"name": "  "})
	testHandler.CreatePortalProject(rec, req)
	if rec.Code != 400 {
		t.Fatalf("expected 400, got %d", rec.Code)
	}
}

func TestPortalProject_UpdateAndList(t *testing.T) {
	if testHandler == nil {
		t.Skip("database not available")
	}
	cleanupPortalProjects(t)
	p := createTestPortalProject(t, "App bán lẻ", false)
	rec, req := adminProjectRequest(t, "PUT", "/api/portal/projects/"+p.ID, p.ID, map[string]any{
		"name": "App bán lẻ", "description": "Mới", "industry": "Retail",
		"features": []string{}, "images": []string{}, "demo_url": "", "portfolio_url": "",
		"source_url": "", "published": true, "sort_order": 5,
		"i18n": map[string]any{"en": map[string]any{"name": "Retail app", "description": "New"}},
	})
	testHandler.UpdatePortalProject(rec, req)
	if rec.Code != 200 {
		t.Fatalf("update: %d %s", rec.Code, rec.Body.String())
	}
	var updated PortalAdminProjectResponse
	json.Unmarshal(rec.Body.Bytes(), &updated)
	if !updated.Published || updated.SortOrder != 5 || updated.Description != "Mới" {
		t.Fatalf("unexpected update result: %+v", updated)
	}
	if !strings.Contains(string(updated.I18n), "Retail app") {
		t.Fatalf("i18n must round-trip through update: %s", updated.I18n)
	}
	// List includes unpublished + published.
	createTestPortalProject(t, "Ẩn", false)
	recL, reqL := adminProjectRequest(t, "GET", "/api/portal/projects", "", nil)
	testHandler.ListPortalAdminProjects(recL, reqL)
	var list struct {
		Projects []PortalAdminProjectResponse `json:"projects"`
	}
	json.Unmarshal(recL.Body.Bytes(), &list)
	if len(list.Projects) != 2 {
		t.Fatalf("expected 2 projects, got %d", len(list.Projects))
	}
}

func publicProjectRequest(t *testing.T, path, slug string) (*httptest.ResponseRecorder, *http.Request) {
	t.Helper()
	req := httptest.NewRequest("GET", path, nil)
	if slug != "" {
		rctx := chi.NewRouteContext()
		rctx.URLParams.Add("slug", slug)
		req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))
	}
	return httptest.NewRecorder(), req
}

func TestPortalPublicProjects_ListsPublishedWithoutSourceURL(t *testing.T) {
	if testHandler == nil {
		t.Skip("database not available")
	}
	enablePortalForTests(t)
	cleanupPortalProjects(t)
	createTestPortalProject(t, "Public app", true)
	createTestPortalProject(t, "Draft app", false)

	rec, req := publicProjectRequest(t, "/portal/projects", "")
	testHandler.ListPortalPublicProjects(rec, req)
	if rec.Code != 200 {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}
	if strings.Contains(rec.Body.String(), "source_url") {
		t.Fatal("public list must not contain source_url")
	}
	var resp struct {
		Projects []map[string]any `json:"projects"`
	}
	json.Unmarshal(rec.Body.Bytes(), &resp)
	if len(resp.Projects) != 1 || resp.Projects[0]["slug"] != "public-app" {
		t.Fatalf("expected only the published project: %s", rec.Body.String())
	}
}

func TestPortalPublicProjects_DetailAndUnpublished404(t *testing.T) {
	if testHandler == nil {
		t.Skip("database not available")
	}
	enablePortalForTests(t)
	cleanupPortalProjects(t)
	createTestPortalProject(t, "Chi tiết app", true)
	createTestPortalProject(t, "Nháp", false)

	rec, req := publicProjectRequest(t, "/portal/projects/chi-tiet-app", "chi-tiet-app")
	testHandler.GetPortalPublicProject(rec, req)
	if rec.Code != 200 || strings.Contains(rec.Body.String(), "source_url") {
		t.Fatalf("detail: %d %s", rec.Code, rec.Body.String())
	}
	// Locale overrides round-trip to the guest-facing payload.
	if !strings.Contains(rec.Body.String(), `Chi tiết app (en)`) {
		t.Fatalf("detail must include i18n overrides: %s", rec.Body.String())
	}

	rec2, req2 := publicProjectRequest(t, "/portal/projects/nhap", "nhap")
	testHandler.GetPortalPublicProject(rec2, req2)
	if rec2.Code != 404 {
		t.Fatalf("unpublished must 404, got %d", rec2.Code)
	}
}

func TestPortalPublicProjects_DisabledPortal404(t *testing.T) {
	if testHandler == nil {
		t.Skip("database not available")
	}
	prev := testHandler.cfg.PortalWorkspaceSlug
	testHandler.cfg.PortalWorkspaceSlug = ""
	t.Cleanup(func() { testHandler.cfg.PortalWorkspaceSlug = prev })
	rec, req := publicProjectRequest(t, "/portal/projects", "")
	testHandler.ListPortalPublicProjects(rec, req)
	if rec.Code != 404 {
		t.Fatalf("expected 404 when portal disabled, got %d", rec.Code)
	}
}

func TestPortalGuestSession_ProjectSlugStoresContext(t *testing.T) {
	if testHandler == nil {
		t.Skip("database not available")
	}
	enablePortalForTests(t)
	cleanupPortalProjects(t)
	createTestPortalProject(t, "App giao hàng", true)

	// Valid slug → context stored on the portal session row.
	buf, _ := json.Marshal(map[string]any{"project_slug": "app-giao-hang"})
	rec := httptest.NewRecorder()
	testHandler.CreatePortalGuestSession(rec, httptest.NewRequest("POST", "/portal/sessions", bytes.NewReader(buf)))
	if rec.Code != 201 {
		t.Fatalf("create session: %d %s", rec.Code, rec.Body.String())
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
	var storedCtx string
	err := testPool.QueryRow(context.Background(),
		`SELECT project_context FROM portal_session WHERE guest_token_hash = $1`,
		hashPortalToken(resp.Token)).Scan(&storedCtx)
	if err != nil || !strings.Contains(storedCtx, "App giao hàng") {
		t.Fatalf("project_context = %q err=%v", storedCtx, err)
	}

	// Invalid slug → session still created, empty context.
	buf2, _ := json.Marshal(map[string]any{"project_slug": "khong-ton-tai"})
	rec2 := httptest.NewRecorder()
	testHandler.CreatePortalGuestSession(rec2, httptest.NewRequest("POST", "/portal/sessions", bytes.NewReader(buf2)))
	if rec2.Code != 201 {
		t.Fatalf("invalid slug must not block session creation: %d", rec2.Code)
	}
	var resp2 struct {
		Token string `json:"token"`
	}
	json.Unmarshal(rec2.Body.Bytes(), &resp2)
	t.Cleanup(func() {
		testPool.Exec(context.Background(),
			`DELETE FROM chat_session WHERE id IN (SELECT chat_session_id FROM portal_session WHERE guest_token_hash = $1)`,
			hashPortalToken(resp2.Token))
	})
	var emptyCtx string
	testPool.QueryRow(context.Background(),
		`SELECT project_context FROM portal_session WHERE guest_token_hash = $1`,
		hashPortalToken(resp2.Token)).Scan(&emptyCtx)
	if emptyCtx != "" {
		t.Fatalf("expected empty context, got %q", emptyCtx)
	}
}

func TestPortalProject_Delete(t *testing.T) {
	if testHandler == nil {
		t.Skip("database not available")
	}
	cleanupPortalProjects(t)
	p := createTestPortalProject(t, "Xoá tôi", false)
	rec, req := adminProjectRequest(t, "DELETE", "/api/portal/projects/"+p.ID, p.ID, nil)
	testHandler.DeletePortalProject(rec, req)
	if rec.Code != 204 {
		t.Fatalf("delete: %d %s", rec.Code, rec.Body.String())
	}
	recL, reqL := adminProjectRequest(t, "GET", "/api/portal/projects", "", nil)
	testHandler.ListPortalAdminProjects(recL, reqL)
	var list struct {
		Projects []PortalAdminProjectResponse `json:"projects"`
	}
	json.Unmarshal(recL.Body.Bytes(), &list)
	if len(list.Projects) != 0 {
		t.Fatalf("expected empty list, got %d", len(list.Projects))
	}
}
