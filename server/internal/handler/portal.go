package handler

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/jackc/pgx/v5/pgtype"
	db "github.com/multica-ai/multica/server/pkg/db/generated"
)

// PortalAdminConfigResponse is the owner-facing portal configuration.
type PortalAdminConfigResponse struct {
	Enabled       bool            `json:"enabled"`
	AgentID       string          `json:"agent_id,omitempty"`
	ServiceUserID string          `json:"service_user_id,omitempty"`
	HeroContent   json.RawMessage `json:"hero_content"`
}

type UpdatePortalConfigRequest struct {
	Enabled     bool            `json:"enabled"`
	AgentID     string          `json:"agent_id"`
	HeroContent json.RawMessage `json:"hero_content"`
}

func portalAdminConfigToResponse(row db.WorkspacePortalConfig) PortalAdminConfigResponse {
	resp := PortalAdminConfigResponse{Enabled: row.Enabled, HeroContent: json.RawMessage(`{}`)}
	if len(row.HeroContent) > 0 {
		resp.HeroContent = json.RawMessage(row.HeroContent)
	}
	if row.AgentID.Valid {
		resp.AgentID = uuidToString(row.AgentID)
	}
	if row.ServiceUserID.Valid {
		resp.ServiceUserID = uuidToString(row.ServiceUserID)
	}
	return resp
}

func (h *Handler) GetPortalAdminConfig(w http.ResponseWriter, r *http.Request) {
	workspaceID := ctxWorkspaceID(r.Context())
	workspaceUUID, ok := parseUUIDOrBadRequest(w, workspaceID, "workspace id")
	if !ok {
		return
	}
	row, err := h.Queries.GetPortalConfig(r.Context(), workspaceUUID)
	if err != nil {
		// No row yet: portal has never been configured.
		writeJSON(w, http.StatusOK, PortalAdminConfigResponse{HeroContent: json.RawMessage(`{}`)})
		return
	}
	writeJSON(w, http.StatusOK, portalAdminConfigToResponse(row))
}

func (h *Handler) UpdatePortalAdminConfig(w http.ResponseWriter, r *http.Request) {
	workspaceID := ctxWorkspaceID(r.Context())
	workspaceUUID, ok := parseUUIDOrBadRequest(w, workspaceID, "workspace id")
	if !ok {
		return
	}
	var req UpdatePortalConfigRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.Enabled && req.AgentID == "" {
		writeError(w, http.StatusBadRequest, "agent_id is required when enabling the portal")
		return
	}
	var agentUUID pgtype.UUID // zero value = NULL
	if req.AgentID != "" {
		agentUUID, ok = parseUUIDOrBadRequest(w, req.AgentID, "agent_id")
		if !ok {
			return
		}
		agent, err := h.Queries.GetAgentInWorkspace(r.Context(), db.GetAgentInWorkspaceParams{
			ID:          agentUUID,
			WorkspaceID: workspaceUUID,
		})
		if err != nil {
			writeError(w, http.StatusNotFound, "agent not found")
			return
		}
		if agent.ArchivedAt.Valid {
			writeError(w, http.StatusBadRequest, "agent is archived")
			return
		}
	}
	hero := []byte(`{}`)
	if len(req.HeroContent) > 0 {
		if !json.Valid(req.HeroContent) {
			writeError(w, http.StatusBadRequest, "hero_content must be a JSON object")
			return
		}
		hero = req.HeroContent
	}
	row, err := h.Queries.UpsertPortalConfig(r.Context(), db.UpsertPortalConfigParams{
		WorkspaceID: workspaceUUID,
		Enabled:     req.Enabled,
		AgentID:     agentUUID,
		HeroContent: hero,
	})
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to save portal config")
		return
	}
	if row.Enabled && !row.ServiceUserID.Valid {
		row, err = h.provisionPortalServiceUser(r, workspaceUUID, workspaceID)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "failed to provision portal service user")
			return
		}
	}
	writeJSON(w, http.StatusOK, portalAdminConfigToResponse(row))
}

// provisionPortalServiceUser creates the workspace-scoped system user that owns
// guest chat sessions, adds it as a plain member, and records it on the config.
func (h *Handler) provisionPortalServiceUser(r *http.Request, workspaceUUID pgtype.UUID, workspaceID string) (db.WorkspacePortalConfig, error) {
	user, err := h.Queries.CreateUser(r.Context(), db.CreateUserParams{
		Name:  "Portal",
		Email: fmt.Sprintf("portal+%s@portal.invalid", workspaceID),
	})
	if err != nil {
		return db.WorkspacePortalConfig{}, fmt.Errorf("create portal user: %w", err)
	}
	if _, err := h.Queries.CreateMember(r.Context(), db.CreateMemberParams{
		WorkspaceID: workspaceUUID,
		UserID:      user.ID,
		Role:        "member",
	}); err != nil {
		return db.WorkspacePortalConfig{}, fmt.Errorf("create portal member: %w", err)
	}
	return h.Queries.SetPortalServiceUser(r.Context(), db.SetPortalServiceUserParams{
		WorkspaceID:   workspaceUUID,
		ServiceUserID: user.ID,
	})
}
