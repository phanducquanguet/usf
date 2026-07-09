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
