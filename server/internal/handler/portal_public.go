package handler

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgtype"
	db "github.com/multica-ai/multica/server/pkg/db/generated"
)

const (
	portalGuestTokenPrefix     = "pgt_"
	portalSessionTTL           = 7 * 24 * time.Hour
	portalMaxMessageLen        = 4000
	portalFirstMessagePreamble = "[PORTAL]"
	portalConfirmMarker        = "[KHÁCH XÁC NHẬN]"
)

var errPortalDisabled = errors.New("portal disabled")

// buildPortalProjectContext renders a marketplace project as agent-facing
// context, rich enough (description + features) for the consultant to anchor
// its first questions to the project the guest is looking at.
func buildPortalProjectContext(p db.PortalProject) string {
	ctx := "Khách đang quan tâm dự án trong marketplace: " + p.Name
	if p.Industry != "" {
		ctx += " (lĩnh vực: " + p.Industry + ")"
	}
	if p.Description != "" {
		ctx += ". Mô tả: " + p.Description
	}
	if len(p.Features) > 0 {
		ctx += ". Tính năng chính: " + strings.Join(p.Features, "; ")
	}
	if p.DemoUrl != "" {
		ctx += ". Demo: " + p.DemoUrl
	}
	return ctx
}

// newPortalGuestToken mints the browser-held guest credential. Only the hash
// is persisted; the raw token is returned to the client exactly once.
func newPortalGuestToken() (string, string, error) {
	buf := make([]byte, 32)
	if _, err := rand.Read(buf); err != nil {
		return "", "", err
	}
	token := portalGuestTokenPrefix + hex.EncodeToString(buf)
	return token, hashPortalToken(token), nil
}

func hashPortalToken(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}

// loadPortalContext resolves the deployment's portal workspace, its config,
// and the consulting agent. Any missing/disabled link yields errPortalDisabled.
func (h *Handler) loadPortalContext(ctx context.Context) (db.Workspace, db.WorkspacePortalConfig, db.Agent, error) {
	slug := strings.TrimSpace(h.cfg.PortalWorkspaceSlug)
	if slug == "" {
		return db.Workspace{}, db.WorkspacePortalConfig{}, db.Agent{}, errPortalDisabled
	}
	ws, err := h.Queries.GetWorkspaceBySlug(ctx, slug)
	if err != nil {
		return db.Workspace{}, db.WorkspacePortalConfig{}, db.Agent{}, errPortalDisabled
	}
	cfg, err := h.Queries.GetPortalConfig(ctx, ws.ID)
	if err != nil || !cfg.Enabled || !cfg.AgentID.Valid || !cfg.ServiceUserID.Valid {
		return db.Workspace{}, db.WorkspacePortalConfig{}, db.Agent{}, errPortalDisabled
	}
	agent, err := h.Queries.GetAgent(ctx, cfg.AgentID)
	if err != nil || agent.ArchivedAt.Valid {
		return db.Workspace{}, db.WorkspacePortalConfig{}, db.Agent{}, errPortalDisabled
	}
	return ws, cfg, agent, nil
}

type portalPublicConfigResponse struct {
	Enabled     bool               `json:"enabled"`
	HeroContent json.RawMessage    `json:"hero_content,omitempty"`
	Agent       *portalPublicAgent `json:"agent,omitempty"`
}

type portalPublicAgent struct {
	Name string `json:"name"`
}

func (h *Handler) GetPortalPublicConfig(w http.ResponseWriter, r *http.Request) {
	_, cfg, agent, err := h.loadPortalContext(r.Context())
	if err != nil {
		writeJSON(w, http.StatusOK, portalPublicConfigResponse{Enabled: false})
		return
	}
	hero := json.RawMessage(`{}`)
	if len(cfg.HeroContent) > 0 {
		hero = json.RawMessage(cfg.HeroContent)
	}
	writeJSON(w, http.StatusOK, portalPublicConfigResponse{
		Enabled:     true,
		HeroContent: hero,
		Agent:       &portalPublicAgent{Name: agent.Name},
	})
}

func (h *Handler) ListPortalPublicProjects(w http.ResponseWriter, r *http.Request) {
	ws, _, _, err := h.loadPortalContext(r.Context())
	if err != nil {
		writeError(w, http.StatusNotFound, "portal_disabled")
		return
	}
	rows, err := h.Queries.ListPublishedPortalProjects(r.Context(), ws.ID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list projects")
		return
	}
	items := make([]PortalPublicProjectResponse, 0, len(rows))
	for _, p := range rows {
		items = append(items, portalProjectToPublicResponse(p))
	}
	writeJSON(w, http.StatusOK, map[string]any{"projects": items})
}

func (h *Handler) GetPortalPublicProject(w http.ResponseWriter, r *http.Request) {
	ws, _, _, err := h.loadPortalContext(r.Context())
	if err != nil {
		writeError(w, http.StatusNotFound, "portal_disabled")
		return
	}
	row, err := h.Queries.GetPublishedPortalProjectBySlug(r.Context(), db.GetPublishedPortalProjectBySlugParams{
		WorkspaceID: ws.ID,
		Slug:        chi.URLParam(r, "slug"),
	})
	if err != nil {
		writeError(w, http.StatusNotFound, "project_not_found")
		return
	}
	writeJSON(w, http.StatusOK, portalProjectToPublicResponse(row))
}

func (h *Handler) CreatePortalGuestSession(w http.ResponseWriter, r *http.Request) {
	ws, cfg, agent, err := h.loadPortalContext(r.Context())
	if err != nil {
		writeError(w, http.StatusNotFound, "portal_disabled")
		return
	}
	token, hash, err := newPortalGuestToken()
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to create session")
		return
	}
	// Optional body: {"project_slug": "..."} from a marketplace CTA. Any decode
	// failure or unknown slug is ignored — context is best-effort, never a blocker.
	projectContext := ""
	var req struct {
		ProjectSlug string `json:"project_slug"`
	}
	if derr := json.NewDecoder(r.Body).Decode(&req); derr == nil && req.ProjectSlug != "" {
		if p, perr := h.Queries.GetPublishedPortalProjectBySlug(r.Context(), db.GetPublishedPortalProjectBySlugParams{
			WorkspaceID: ws.ID,
			Slug:        req.ProjectSlug,
		}); perr == nil {
			projectContext = buildPortalProjectContext(p)
		}
	}
	session, err := h.Queries.CreateChatSession(r.Context(), db.CreateChatSessionParams{
		WorkspaceID: ws.ID,
		AgentID:     agent.ID,
		CreatorID:   cfg.ServiceUserID,
		Title:       "Portal — khách vãng lai",
	})
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to create session")
		return
	}
	if _, err := h.Queries.CreatePortalSession(r.Context(), db.CreatePortalSessionParams{
		WorkspaceID:    ws.ID,
		ChatSessionID:  session.ID,
		GuestTokenHash: hash,
		ProjectContext: projectContext,
	}); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to create session")
		return
	}
	writeJSON(w, http.StatusCreated, map[string]string{"token": token})
}

// loadPortalSession authenticates the {token} URL param. Writes 401 for an
// unknown token, 410 for a closed or inactivity-expired session.
func (h *Handler) loadPortalSession(w http.ResponseWriter, r *http.Request) (db.PortalSession, bool) {
	token := chi.URLParam(r, "token")
	if !strings.HasPrefix(token, portalGuestTokenPrefix) {
		writeError(w, http.StatusUnauthorized, "invalid session token")
		return db.PortalSession{}, false
	}
	ps, err := h.Queries.GetPortalSessionByTokenHash(r.Context(), hashPortalToken(token))
	if err != nil {
		writeError(w, http.StatusUnauthorized, "invalid session token")
		return db.PortalSession{}, false
	}
	if ps.Status == "closed" {
		writeError(w, http.StatusGone, "session_closed")
		return db.PortalSession{}, false
	}
	if time.Since(ps.LastActivityAt.Time) > portalSessionTTL {
		_ = h.Queries.ClosePortalSession(r.Context(), ps.ID)
		writeError(w, http.StatusGone, "session_expired")
		return db.PortalSession{}, false
	}
	return ps, true
}

type portalChatMessage struct {
	ID        string `json:"id"`
	Role      string `json:"role"`
	Content   string `json:"content"`
	CreatedAt string `json:"created_at"`
}

type portalMessagesResponse struct {
	Messages []portalChatMessage `json:"messages"`
	Pending  bool                `json:"pending"`
	Status   string              `json:"status"`
}

func portalMessageToResponse(m db.ChatMessage) portalChatMessage {
	content := m.Content
	if strings.HasPrefix(content, portalFirstMessagePreamble) {
		// The preamble is agent-facing context, not something the guest wrote.
		if idx := strings.Index(content, "\n\n"); idx >= 0 {
			content = content[idx+2:]
		}
	}
	return portalChatMessage{
		ID:        uuidToString(m.ID),
		Role:      m.Role,
		Content:   content,
		CreatedAt: timestampToString(m.CreatedAt),
	}
}

func (h *Handler) SendPortalMessage(w http.ResponseWriter, r *http.Request) {
	_, cfg, _, err := h.loadPortalContext(r.Context())
	if err != nil {
		writeError(w, http.StatusNotFound, "portal_disabled")
		return
	}
	ps, ok := h.loadPortalSession(w, r)
	if !ok {
		return
	}
	if ps.Status != "active" {
		writeError(w, http.StatusConflict, "session_confirmed")
		return
	}
	var req struct {
		Content string `json:"content"`
		// Slug of the marketplace project whose panel the guest is typing in;
		// only consulted for the first message of the session.
		ProjectSlug string `json:"project_slug"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	content := strings.TrimSpace(req.Content)
	if content == "" {
		writeError(w, http.StatusBadRequest, "content is required")
		return
	}
	if len(content) > portalMaxMessageLen {
		writeError(w, http.StatusBadRequest, "message too long")
		return
	}
	// One guest turn ⇒ one agent turn: refuse while a task is in flight.
	if _, err := h.Queries.GetPendingChatTask(r.Context(), ps.ChatSessionID); err == nil {
		writeError(w, http.StatusConflict, "agent_busy")
		return
	}
	count, err := h.Queries.CountChatMessages(r.Context(), ps.ChatSessionID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to load session")
		return
	}
	if count == 0 {
		// Mark the session as a portal intake for the agent (see the
		// multica-portal-intake builtin skill) without a wasted bootstrap run.
		preamble := portalFirstMessagePreamble + " Đây là phiên tư vấn với khách vãng lai trên portal công khai. Hãy làm theo skill multica-portal-intake."
		// The session may have been created from a different page (single guest
		// token reused across the site), so the slug sent with the first message
		// reflects where the guest is NOW and wins over the context stored at
		// session creation. Unknown/unpublished slugs fall back silently.
		projectContext := ps.ProjectContext
		if req.ProjectSlug != "" {
			if p, perr := h.Queries.GetPublishedPortalProjectBySlug(r.Context(), db.GetPublishedPortalProjectBySlugParams{
				WorkspaceID: ps.WorkspaceID,
				Slug:        req.ProjectSlug,
			}); perr == nil {
				projectContext = buildPortalProjectContext(p)
			}
		}
		if projectContext != "" {
			preamble += " " + projectContext + "."
		}
		content = preamble + "\n\n" + content
	}
	h.appendPortalMessageAndEnqueue(w, r, ps, cfg, content, http.StatusAccepted)
}

// appendPortalMessageAndEnqueue persists a guest-authored message and triggers
// the agent run, sharing the tail of SendPortalMessage and ConfirmPortalSession.
func (h *Handler) appendPortalMessageAndEnqueue(w http.ResponseWriter, r *http.Request, ps db.PortalSession, cfg db.WorkspacePortalConfig, content string, okStatus int) {
	msg, err := h.Queries.CreateChatMessage(r.Context(), db.CreateChatMessageParams{
		ChatSessionID: ps.ChatSessionID,
		Role:          "user",
		Content:       content,
	})
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to save message")
		return
	}
	session, err := h.Queries.GetChatSession(r.Context(), ps.ChatSessionID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to load session")
		return
	}
	task, err := h.TaskService.EnqueueChatTask(r.Context(), session, cfg.ServiceUserID, false)
	if err != nil {
		writeError(w, http.StatusServiceUnavailable, "agent_unavailable")
		return
	}
	// Mirror SendChatMessage's link call so the assistant reply lands on this
	// message's task.
	if err := h.Queries.LinkChatMessageToTask(r.Context(), db.LinkChatMessageToTaskParams{
		ID:     msg.ID,
		TaskID: task.ID,
	}); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to link task")
		return
	}
	_ = h.Queries.TouchPortalSession(r.Context(), ps.ID)
	writeJSON(w, okStatus, map[string]any{"message": portalMessageToResponse(msg)})
}

func (h *Handler) ListPortalMessages(w http.ResponseWriter, r *http.Request) {
	ps, ok := h.loadPortalSession(w, r)
	if !ok {
		return
	}
	var msgs []db.ChatMessage
	var err error
	if after := r.URL.Query().Get("after"); after != "" {
		ts, perr := time.Parse(time.RFC3339Nano, after)
		if perr != nil {
			writeError(w, http.StatusBadRequest, "invalid after cursor")
			return
		}
		msgs, err = h.Queries.ListChatMessagesAfter(r.Context(), db.ListChatMessagesAfterParams{
			ChatSessionID: ps.ChatSessionID,
			CreatedAt:     pgtype.Timestamptz{Time: ts, Valid: true},
		})
	} else {
		msgs, err = h.Queries.ListChatMessages(r.Context(), ps.ChatSessionID)
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to load messages")
		return
	}
	pending := false
	if _, perr := h.Queries.GetPendingChatTask(r.Context(), ps.ChatSessionID); perr == nil {
		pending = true
	}
	items := make([]portalChatMessage, 0, len(msgs))
	for _, m := range msgs {
		items = append(items, portalMessageToResponse(m))
	}
	writeJSON(w, http.StatusOK, portalMessagesResponse{Messages: items, Pending: pending, Status: ps.Status})
}

func (h *Handler) ConfirmPortalSession(w http.ResponseWriter, r *http.Request) {
	_, cfg, _, err := h.loadPortalContext(r.Context())
	if err != nil {
		writeError(w, http.StatusNotFound, "portal_disabled")
		return
	}
	ps, ok := h.loadPortalSession(w, r)
	if !ok {
		return
	}
	if ps.Status != "active" {
		writeError(w, http.StatusConflict, "already_confirmed")
		return
	}
	var req struct {
		Name  string `json:"name"`
		Email string `json:"email"`
		Phone string `json:"phone"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	name := strings.TrimSpace(req.Name)
	email := strings.TrimSpace(req.Email)
	phone := strings.TrimSpace(req.Phone)
	if name == "" || email == "" || !strings.Contains(email, "@") {
		writeError(w, http.StatusBadRequest, "name and a valid email are required")
		return
	}
	confirmed, err := h.Queries.ConfirmPortalSession(r.Context(), db.ConfirmPortalSessionParams{
		ID:           ps.ID,
		ContactName:  name,
		ContactEmail: email,
		ContactPhone: phone,
	})
	if err != nil {
		writeError(w, http.StatusConflict, "already_confirmed")
		return
	}
	content := portalConfirmMarker + "\n" +
		"Họ tên: " + name + "\n" +
		"Email: " + email + "\n" +
		"SĐT: " + phone + "\n\n" +
		"Khách đã xác nhận bản tóm tắt. Hãy tạo dự án ngay theo hướng dẫn trong skill multica-portal-intake, " +
		"kèm thông tin liên hệ này ở cuối mô tả dự án."
	h.appendPortalMessageAndEnqueue(w, r, confirmed, cfg, content, http.StatusOK)
}
