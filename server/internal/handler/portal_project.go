package handler

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"unicode"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgconn"
	db "github.com/multica-ai/multica/server/pkg/db/generated"
	"golang.org/x/text/runes"
	"golang.org/x/text/transform"
	"golang.org/x/text/unicode/norm"
)

// PortalAdminProjectResponse is the owner/admin-facing marketplace project,
// including internal fields (source_url) the public API must never expose.
type PortalAdminProjectResponse struct {
	ID           string   `json:"id"`
	Slug         string   `json:"slug"`
	Name         string   `json:"name"`
	Description  string   `json:"description"`
	Industry     string   `json:"industry"`
	Features     []string `json:"features"`
	Images       []string `json:"images"`
	DemoURL      string   `json:"demo_url"`
	PortfolioURL string   `json:"portfolio_url"`
	SourceURL    string   `json:"source_url"`
	Published    bool     `json:"published"`
	SortOrder    int32    `json:"sort_order"`
	CreatedAt    string   `json:"created_at"`
	UpdatedAt    string   `json:"updated_at"`
	// Locale overrides ({"en": {"name": ...}}); base columns are Vietnamese.
	// JSONB passthrough like hero_content — the server never inspects it.
	I18n json.RawMessage `json:"i18n"`
}

// PortalPublicProjectResponse is the guest-facing shape. No source_url ever.
type PortalPublicProjectResponse struct {
	Slug         string          `json:"slug"`
	Name         string          `json:"name"`
	Description  string          `json:"description"`
	Industry     string          `json:"industry"`
	Features     []string        `json:"features"`
	Images       []string        `json:"images"`
	DemoURL      string          `json:"demo_url"`
	PortfolioURL string          `json:"portfolio_url"`
	I18n         json.RawMessage `json:"i18n"`
}

type portalProjectRequest struct {
	Name         string          `json:"name"`
	Description  string          `json:"description"`
	Industry     string          `json:"industry"`
	Features     []string        `json:"features"`
	Images       []string        `json:"images"`
	DemoURL      string          `json:"demo_url"`
	PortfolioURL string          `json:"portfolio_url"`
	SourceURL    string          `json:"source_url"`
	Published    bool            `json:"published"`
	SortOrder    int32           `json:"sort_order"`
	I18n         json.RawMessage `json:"i18n"`
}

func portalProjectToAdminResponse(p db.PortalProject) PortalAdminProjectResponse {
	return PortalAdminProjectResponse{
		ID:           uuidToString(p.ID),
		Slug:         p.Slug,
		Name:         p.Name,
		Description:  p.Description,
		Industry:     p.Industry,
		Features:     emptyIfNil(p.Features),
		Images:       emptyIfNil(p.Images),
		DemoURL:      p.DemoUrl,
		PortfolioURL: p.PortfolioUrl,
		SourceURL:    p.SourceUrl,
		Published:    p.Published,
		SortOrder:    p.SortOrder,
		CreatedAt:    timestampToString(p.CreatedAt),
		UpdatedAt:    timestampToString(p.UpdatedAt),
		I18n:         i18nOrEmpty(p.I18n),
	}
}

func portalProjectToPublicResponse(p db.PortalProject) PortalPublicProjectResponse {
	return PortalPublicProjectResponse{
		Slug:         p.Slug,
		Name:         p.Name,
		Description:  p.Description,
		Industry:     p.Industry,
		Features:     emptyIfNil(p.Features),
		Images:       emptyIfNil(p.Images),
		DemoURL:      p.DemoUrl,
		PortfolioURL: p.PortfolioUrl,
		I18n:         i18nOrEmpty(p.I18n),
	}
}

// emptyIfNil keeps JSON arrays as [] instead of null.
func emptyIfNil(s []string) []string {
	if s == nil {
		return []string{}
	}
	return s
}

// i18nOrEmpty keeps the i18n JSONB as {} instead of null in responses.
func i18nOrEmpty(b []byte) json.RawMessage {
	if len(b) == 0 {
		return json.RawMessage(`{}`)
	}
	return json.RawMessage(b)
}

// portalProjectSlugify lowercases, strips Vietnamese diacritics (đ→d), and
// collapses everything else into single dashes.
func portalProjectSlugify(name string) string {
	t := transform.Chain(norm.NFD, runes.Remove(runes.In(unicode.Mn)), norm.NFC)
	folded, _, err := transform.String(t, strings.ToLower(strings.TrimSpace(name)))
	if err != nil {
		folded = strings.ToLower(strings.TrimSpace(name))
	}
	folded = strings.ReplaceAll(folded, "đ", "d")
	var b strings.Builder
	prevDash := true // suppress leading dash
	for _, r := range folded {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') {
			b.WriteRune(r)
			prevDash = false
		} else if !prevDash {
			b.WriteByte('-')
			prevDash = true
		}
	}
	return strings.TrimSuffix(b.String(), "-")
}

func decodePortalProjectRequest(w http.ResponseWriter, r *http.Request) (portalProjectRequest, bool) {
	var req portalProjectRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return req, false
	}
	req.Name = strings.TrimSpace(req.Name)
	if req.Name == "" {
		writeError(w, http.StatusBadRequest, "name is required")
		return req, false
	}
	if req.Features == nil {
		req.Features = []string{}
	}
	if req.Images == nil {
		req.Images = []string{}
	}
	if len(req.I18n) == 0 {
		req.I18n = json.RawMessage(`{}`)
	}
	return req, true
}

func (h *Handler) ListPortalAdminProjects(w http.ResponseWriter, r *http.Request) {
	workspaceUUID, ok := parseUUIDOrBadRequest(w, ctxWorkspaceID(r.Context()), "workspace id")
	if !ok {
		return
	}
	rows, err := h.Queries.ListPortalProjects(r.Context(), workspaceUUID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list projects")
		return
	}
	items := make([]PortalAdminProjectResponse, 0, len(rows))
	for _, p := range rows {
		items = append(items, portalProjectToAdminResponse(p))
	}
	writeJSON(w, http.StatusOK, map[string]any{"projects": items})
}

func (h *Handler) CreatePortalProject(w http.ResponseWriter, r *http.Request) {
	workspaceUUID, ok := parseUUIDOrBadRequest(w, ctxWorkspaceID(r.Context()), "workspace id")
	if !ok {
		return
	}
	req, ok := decodePortalProjectRequest(w, r)
	if !ok {
		return
	}
	base := portalProjectSlugify(req.Name)
	if base == "" {
		base = "du-an"
	}
	// Unique (workspace_id, slug): retry with numbered suffixes on collision.
	for attempt := 1; attempt <= 50; attempt++ {
		slug := base
		if attempt > 1 {
			slug = fmt.Sprintf("%s-%d", base, attempt)
		}
		row, err := h.Queries.CreatePortalProject(r.Context(), db.CreatePortalProjectParams{
			WorkspaceID:  workspaceUUID,
			Slug:         slug,
			Name:         req.Name,
			Description:  req.Description,
			Industry:     req.Industry,
			Features:     req.Features,
			Images:       req.Images,
			DemoUrl:      req.DemoURL,
			PortfolioUrl: req.PortfolioURL,
			SourceUrl:    req.SourceURL,
			Published:    req.Published,
			SortOrder:    req.SortOrder,
			I18n:         req.I18n,
		})
		if err == nil {
			writeJSON(w, http.StatusCreated, portalProjectToAdminResponse(row))
			return
		}
		var pgErr *pgconn.PgError
		if !errors.As(err, &pgErr) || pgErr.Code != "23505" {
			writeError(w, http.StatusInternalServerError, "failed to create project")
			return
		}
	}
	writeError(w, http.StatusConflict, "could not allocate a unique slug")
}

func (h *Handler) UpdatePortalProject(w http.ResponseWriter, r *http.Request) {
	workspaceUUID, ok := parseUUIDOrBadRequest(w, ctxWorkspaceID(r.Context()), "workspace id")
	if !ok {
		return
	}
	id, ok := parseUUIDOrBadRequest(w, chi.URLParam(r, "id"), "project id")
	if !ok {
		return
	}
	req, ok := decodePortalProjectRequest(w, r)
	if !ok {
		return
	}
	row, err := h.Queries.UpdatePortalProject(r.Context(), db.UpdatePortalProjectParams{
		ID:           id,
		WorkspaceID:  workspaceUUID,
		Name:         req.Name,
		Description:  req.Description,
		Industry:     req.Industry,
		Features:     req.Features,
		Images:       req.Images,
		DemoUrl:      req.DemoURL,
		PortfolioUrl: req.PortfolioURL,
		SourceUrl:    req.SourceURL,
		Published:    req.Published,
		SortOrder:    req.SortOrder,
		I18n:         req.I18n,
	})
	if err != nil {
		writeError(w, http.StatusNotFound, "project not found")
		return
	}
	writeJSON(w, http.StatusOK, portalProjectToAdminResponse(row))
}

func (h *Handler) DeletePortalProject(w http.ResponseWriter, r *http.Request) {
	workspaceUUID, ok := parseUUIDOrBadRequest(w, ctxWorkspaceID(r.Context()), "workspace id")
	if !ok {
		return
	}
	id, ok := parseUUIDOrBadRequest(w, chi.URLParam(r, "id"), "project id")
	if !ok {
		return
	}
	if err := h.Queries.DeletePortalProject(r.Context(), db.DeletePortalProjectParams{
		ID:          id,
		WorkspaceID: workspaceUUID,
	}); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to delete project")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
