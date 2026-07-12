package handler

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
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
