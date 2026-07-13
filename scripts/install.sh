#!/usr/bin/env bash
# UniAI installer — installs the CLI and optionally provisions a self-host server.
#
# Install / upgrade CLI only:
#   curl -fsSL https://raw.githubusercontent.com/phanducquanguet/usf/feature/customer-portal/scripts/install.sh | bash
#
# Install CLI + provision self-host server:
#   curl -fsSL https://raw.githubusercontent.com/phanducquanguet/usf/feature/customer-portal/scripts/install.sh | bash -s -- --with-server
#
# After installation, run `uniai setup` to configure your environment.
#
set -euo pipefail

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
REPO_URL="https://github.com/phanducquanguet/usf.git"
REPO_WEB_URL="https://github.com/phanducquanguet/usf"  # without .git, for GitHub web APIs
INSTALL_DIR="${MULTICA_INSTALL_DIR:-$HOME/.multica/server}"

# Colors (disabled when not a terminal)
if [ -t 1 ] || [ -t 2 ]; then
  BOLD='\033[1m'
  GREEN='\033[0;32m'
  YELLOW='\033[0;33m'
  RED='\033[0;31m'
  CYAN='\033[0;36m'
  RESET='\033[0m'
else
  BOLD='' GREEN='' YELLOW='' RED='' CYAN='' RESET=''
fi

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
info()  { printf "${BOLD}${CYAN}==> %s${RESET}\n" "$*"; }
ok()    { printf "${BOLD}${GREEN}✓ %s${RESET}\n" "$*"; }
warn()  { printf "${BOLD}${YELLOW}⚠ %s${RESET}\n" "$*" >&2; }
fail()  { printf "${BOLD}${RED}✗ %s${RESET}\n" "$*" >&2; exit 1; }

command_exists() { command -v "$1" >/dev/null 2>&1; }

env_file_value() {
  local file="$1"
  local key="$2"
  local default="$3"
  local line value
  line="$(grep -E "^${key}=" "$file" 2>/dev/null | tail -n 1 || true)"
  if [ -z "$line" ]; then
    printf "%s" "$default"
    return
  fi
  value="${line#*=}"
  value="${value%$'\r'}"
  value="${value%\"}"
  value="${value#\"}"
  value="${value%\'}"
  value="${value#\'}"
  if [ -z "$value" ]; then
    printf "%s" "$default"
  else
    printf "%s" "$value"
  fi
}

selfhost_backend_port() {
  local file="${1:-.env}"
  local value
  for key in BACKEND_PORT API_PORT SERVER_PORT PORT; do
    value="$(env_file_value "$file" "$key" "")"
    if [ -n "$value" ]; then
      printf "%s" "$value"
      return
    fi
  done
  printf "8080"
}

selfhost_frontend_port() {
  env_file_value "${1:-.env}" "FRONTEND_PORT" "3000"
}

detect_os() {
  case "$(uname -s)" in
    Darwin) OS="darwin" ;;
    Linux)  OS="linux" ;;
    MINGW*|MSYS*|CYGWIN*)
            fail "This script does not support Windows. Use the PowerShell installer instead:
  irm https://raw.githubusercontent.com/phanducquanguet/usf/feature/customer-portal/scripts/install.ps1 | iex" ;;
    *)      fail "Unsupported operating system: $(uname -s). UniAI supports macOS, Linux, and Windows." ;;
  esac

  ARCH="$(uname -m)"
  case "$ARCH" in
    x86_64)  ARCH="amd64" ;;
    aarch64) ARCH="arm64" ;;
    arm64)   ARCH="arm64" ;;
    *)       fail "Unsupported architecture: $ARCH" ;;
  esac
}

# ---------------------------------------------------------------------------
# CLI Installation
# ---------------------------------------------------------------------------
install_cli_binary() {
  info "Installing UniAI CLI from GitHub Releases..."

  # Get latest release tag
  local latest
  latest=$(curl -sI "$REPO_WEB_URL/releases/latest" 2>/dev/null | grep -i '^location:' | sed 's/.*tag\///' | tr -d '\r\n' || true)
  if [ -z "$latest" ]; then
    fail "Could not determine latest release. Check your network connection."
  fi

  local version="${latest#v}"
  local tmp_dir
  tmp_dir=$(mktemp -d)

  # Prefer the current `uniai-cli-*` asset; releases published before the
  # CLI rename only carry `multica-cli-*` (with a binary named `multica`).
  local url="$REPO_WEB_URL/releases/download/${latest}/uniai-cli-${version}-${OS}-${ARCH}.tar.gz"
  info "Downloading $url ..."
  if ! curl -fsSL "$url" -o "$tmp_dir/cli.tar.gz"; then
    url="$REPO_WEB_URL/releases/download/${latest}/multica-cli-${version}-${OS}-${ARCH}.tar.gz"
    info "Falling back to $url ..."
    if ! curl -fsSL "$url" -o "$tmp_dir/cli.tar.gz"; then
      rm -rf "$tmp_dir"
      fail "Failed to download CLI binary."
    fi
  fi

  # The binary inside the archive is `uniai` (current) or `multica`
  # (pre-rename releases); detect rather than assume.
  local archive_binary
  archive_binary=$(tar -tzf "$tmp_dir/cli.tar.gz" | grep -x -e uniai -e multica | head -n 1 || true)
  if [ -z "$archive_binary" ]; then
    rm -rf "$tmp_dir"
    fail "CLI binary not found in downloaded archive."
  fi
  tar -xzf "$tmp_dir/cli.tar.gz" -C "$tmp_dir" "$archive_binary"
  if [ "$archive_binary" != "uniai" ]; then
    mv "$tmp_dir/$archive_binary" "$tmp_dir/uniai"
  fi

  # Try /usr/local/bin first, fall back to ~/.local/bin. Tests and scripted
  # installs can override the first choice with MULTICA_BIN_DIR.
  local bin_dir="${MULTICA_BIN_DIR:-/usr/local/bin}"
  if [ -w "$bin_dir" ]; then
    mv "$tmp_dir/uniai" "$bin_dir/uniai"
  elif command_exists sudo; then
    sudo mv "$tmp_dir/uniai" "$bin_dir/uniai"
  else
    bin_dir="$HOME/.local/bin"
    mkdir -p "$bin_dir"
    mv "$tmp_dir/uniai" "$bin_dir/uniai"
    chmod +x "$bin_dir/uniai"
    # Add to PATH if not already there
    if ! echo "$PATH" | tr ':' '\n' | grep -q "^$bin_dir$"; then
      export PATH="$bin_dir:$PATH"
      add_to_path "$bin_dir"
    fi
  fi

  rm -rf "$tmp_dir"
  replace_legacy_multica_binary "$bin_dir"
  ok "UniAI CLI installed to $bin_dir/uniai"
}

# Pre-rename installs left a `multica` binary next to the new `uniai` one.
# Swap it for a symlink so the old command keeps working without shipping a
# second stale copy.
replace_legacy_multica_binary() {
  local bin_dir="$1"
  [ -f "$bin_dir/multica" ] || return 0
  if [ -w "$bin_dir" ]; then
    ln -sf "$bin_dir/uniai" "$bin_dir/multica"
  elif command_exists sudo; then
    sudo ln -sf "$bin_dir/uniai" "$bin_dir/multica"
  fi
}

# A pre-rename `multica` binary in a DIFFERENT PATH dir (one this installer
# could not touch) keeps running stale code forever — it self-updates only
# the file it lives in. Surface it instead of silently leaving it behind.
warn_stale_multica_on_path() {
  command_exists multica || return 0
  local resolved
  resolved=$(command -v multica)
  case "$(readlink "$resolved" 2>/dev/null)" in
    *uniai) return 0 ;;
  esac
  warn "A pre-rename 'multica' binary remains at $resolved and will no longer receive updates."
  warn "Remove it and use 'uniai' instead: rm \"$resolved\""
}

add_to_path() {
  local dir="$1"
  local line="export PATH=\"$dir:\$PATH\""
  for rc in "$HOME/.bashrc" "$HOME/.zshrc"; do
    if [ -f "$rc" ] && ! grep -qF "$dir" "$rc"; then
      printf '\n# Added by UniAI installer\n%s\n' "$line" >> "$rc"
    fi
  done
}

get_latest_version() {
  # grep exits 1 when no match; use `|| true` to avoid triggering pipefail
  curl -sI "$REPO_WEB_URL/releases/latest" 2>/dev/null | grep -i '^location:' | sed 's/.*tag\///' | tr -d '\r\n' || true
}

get_selfhost_ref() {
  if [ -n "${MULTICA_SELFHOST_REF:-}" ]; then
    printf '%s' "$MULTICA_SELFHOST_REF"
    return
  fi

  local latest
  latest=$(get_latest_version)
  if [ -n "$latest" ]; then
    printf '%s' "$latest"
    return
  fi

  printf '%s' "main"
}

checkout_server_ref() {
  local ref="$1"

  if [ "$ref" = "main" ]; then
    git fetch origin main --depth 1 2>/dev/null || true
    git checkout --force main 2>/dev/null || true
    git reset --hard origin/main 2>/dev/null || true
    return
  fi

  git fetch origin --tags --force 2>/dev/null || true
  if git rev-parse --verify --quiet "refs/tags/$ref" >/dev/null; then
    git checkout --force "$ref" 2>/dev/null || git checkout --force "tags/$ref" 2>/dev/null || true
    return
  fi

  git fetch origin "$ref" --depth 1 2>/dev/null || true
  git checkout --force "$ref" 2>/dev/null || true
}

pull_official_selfhost_images() {
  if docker compose -f docker-compose.selfhost.yml pull; then
    return
  fi

  echo ""
  warn "Official images for the selected self-host channel are not published yet."
  echo "This can happen before the first GHCR release is available."
  echo "From $INSTALL_DIR, build from source instead:"
  echo "  docker compose -f docker-compose.selfhost.yml -f docker-compose.selfhost.build.yml up -d --build"
  exit 1
}

install_cli() {
  local existing_cli=""
  if command_exists uniai; then
    existing_cli="uniai"
  elif command_exists multica; then
    # Pre-rename install; upgrade it to `uniai`.
    existing_cli="multica"
  fi
  if [ -n "$existing_cli" ]; then
    local current_ver
    # `version` outputs e.g. "uniai 0.3.23 (commit: f46b929eb, built: 2026-06-16T10:11:56Z)" — extract just the version
    current_ver=$("$existing_cli" version 2>/dev/null | awk 'NR==1{print $2}' || echo "unknown")

    local latest_ver
    latest_ver=$(get_latest_version)

    # Normalize: strip leading 'v' for comparison
    local current_cmp="${current_ver#v}"
    local latest_cmp="${latest_ver#v}"

    # A pre-rename `multica`-only install is never "up to date" — it still
    # needs the uniai binary installed, even when the latest-version lookup
    # comes back empty (install_cli_binary then fails loudly instead).
    if [ "$existing_cli" = "uniai" ] && { [ -z "$latest_ver" ] || [ "$current_cmp" = "$latest_cmp" ]; }; then
      ok "UniAI CLI is up to date ($current_ver)"
      return 0
    fi

    info "UniAI CLI $current_ver installed, latest is $latest_ver — upgrading..."
    install_cli_binary

    local new_ver
    new_ver=$(uniai version 2>/dev/null | awk 'NR==1{print $2}' || echo "unknown")
    ok "UniAI CLI upgraded ($current_ver → $new_ver)"
    return 0
  fi

  install_cli_binary

  # Verify
  if ! command_exists uniai; then
    fail "CLI installed but 'uniai' not found on PATH. You may need to restart your shell."
  fi
}

# ---------------------------------------------------------------------------
# Docker check
# ---------------------------------------------------------------------------
check_docker() {
  if ! command_exists docker; then
    printf "\n"
    fail "Docker is not installed. UniAI self-hosting requires Docker and Docker Compose.

Install Docker:
  macOS:  https://docs.docker.com/desktop/install/mac-install/
  Linux:  https://docs.docker.com/engine/install/

After installing Docker, re-run this script with --with-server."
  fi

  if ! docker info >/dev/null 2>&1; then
    fail "Docker is installed but not running. Please start Docker and re-run this script."
  fi

  ok "Docker is available"
}

# ---------------------------------------------------------------------------
# Server setup (self-host / --with-server)
# ---------------------------------------------------------------------------
setup_server() {
  info "Setting up UniAI server..."
  local server_ref
  server_ref=$(get_selfhost_ref)
  info "Using self-host assets from ${server_ref}..."

  if [ -d "$INSTALL_DIR/.git" ]; then
    info "Updating existing installation at $INSTALL_DIR..."
    cd "$INSTALL_DIR"
  else
    info "Cloning UniAI repository..."
    if ! command_exists git; then
      fail "Git is not installed. Please install git and re-run."
    fi
    # Remove leftover directory from a previously interrupted clone
    if [ -d "$INSTALL_DIR" ]; then
      warn "Removing incomplete installation at $INSTALL_DIR..."
      rm -rf "$INSTALL_DIR"
    fi
    mkdir -p "$(dirname "$INSTALL_DIR")"
    git clone --depth 1 "$REPO_URL" "$INSTALL_DIR"
    cd "$INSTALL_DIR"
  fi

  checkout_server_ref "$server_ref"

  ok "Repository ready at $INSTALL_DIR ($server_ref)"

  # Generate .env if needed
  if [ ! -f .env ]; then
    info "Creating .env with random secrets..."
    cp .env.example .env
    local jwt pgpass
    jwt=$(openssl rand -hex 32)
    pgpass=$(openssl rand -hex 24)
    if [ "$(uname -s)" = "Darwin" ]; then
      sed -i '' "s/^JWT_SECRET=.*/JWT_SECRET=$jwt/" .env
      sed -i '' "s/^POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=$pgpass/" .env
      sed -i '' -E "s#^(DATABASE_URL=postgres://[^:]+:)[^@]*(@.*)#\1$pgpass\2#" .env
    else
      sed -i "s/^JWT_SECRET=.*/JWT_SECRET=$jwt/" .env
      sed -i "s/^POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=$pgpass/" .env
      sed -i -E "s#^(DATABASE_URL=postgres://[^:]+:)[^@]*(@.*)#\1$pgpass\2#" .env
    fi
    ok "Generated .env with random JWT_SECRET and POSTGRES_PASSWORD"
  else
    ok "Using existing .env"
  fi

  # Start Docker Compose
  info "Pulling official UniAI images..."
  pull_official_selfhost_images
  info "Starting UniAI services (this may take a few minutes on first run)..."
  docker compose -f docker-compose.selfhost.yml up -d

  # Wait for health check
  info "Waiting for backend to be ready..."
  local backend_port
  backend_port="$(selfhost_backend_port .env)"
  local ready=false
  for i in $(seq 1 45); do
    if curl -sf "http://localhost:${backend_port}/health" >/dev/null 2>&1; then
      ready=true
      break
    fi
    sleep 2
  done

  if [ "$ready" = true ]; then
    ok "UniAI server is running"
  else
    warn "Server is still starting. You can check logs with:"
    echo "  cd $INSTALL_DIR && docker compose -f docker-compose.selfhost.yml logs"
    echo ""
  fi
}


# ---------------------------------------------------------------------------
# Main: Default mode (install / upgrade CLI only)
# ---------------------------------------------------------------------------
run_default() {
  printf "\n"
  printf "${BOLD}  UniAI — Installer${RESET}\n"
  printf "\n"

  detect_os
  install_cli
  warn_stale_multica_on_path

  printf "\n"
  printf "${BOLD}${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}\n"
  printf "${BOLD}${GREEN}  ✓ UniAI CLI is ready!${RESET}\n"
  printf "${BOLD}${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}\n"
  printf "\n"
  printf "  ${BOLD}Next: configure your environment${RESET}\n"
  printf "\n"
  printf "     ${CYAN}uniai setup${RESET}                # Connect to UniAI Cloud (multica.ai)\n"
  printf "     ${CYAN}uniai setup self-host${RESET}       # Connect to a self-hosted server\n"
  printf "\n"
  printf "  ${BOLD}Self-hosting?${RESET} Install the server first:\n"
  printf "     curl -fsSL https://raw.githubusercontent.com/phanducquanguet/usf/feature/customer-portal/scripts/install.sh | bash -s -- --with-server\n"
  printf "\n"
}

# ---------------------------------------------------------------------------
# Main: With-server mode (provision self-host infrastructure + install CLI)
# ---------------------------------------------------------------------------
run_with_server() {
  printf "\n"
  printf "${BOLD}  UniAI — Self-Host Installer${RESET}\n"
  printf "  Provisioning server infrastructure + installing CLI\n"
  printf "\n"

  detect_os
  check_docker
  setup_server
  install_cli
  warn_stale_multica_on_path

  printf "\n"
  printf "${BOLD}${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}\n"
  printf "${BOLD}${GREEN}  ✓ UniAI server is running and CLI is ready!${RESET}\n"
  printf "${BOLD}${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}\n"
  printf "\n"
  local frontend_port backend_port
  frontend_port="$(selfhost_frontend_port "$INSTALL_DIR/.env")"
  backend_port="$(selfhost_backend_port "$INSTALL_DIR/.env")"
  printf "  ${BOLD}Frontend:${RESET}  http://localhost:%s\n" "$frontend_port"
  printf "  ${BOLD}Backend:${RESET}   http://localhost:%s\n" "$backend_port"
  printf "  ${BOLD}Server at:${RESET} %s\n" "$INSTALL_DIR"
  printf "\n"
  printf "  ${BOLD}Next: configure your CLI to connect${RESET}\n"
  printf "\n"
  printf "     ${CYAN}uniai setup self-host${RESET}   # Configure + authenticate + start daemon\n"
  printf "\n"
  printf "  ${BOLD}Login:${RESET} configure ${CYAN}RESEND_API_KEY${RESET} in .env for email codes,\n"
  printf "  or read the generated code from backend logs when Resend is unset.\n"
  printf "\n"
  printf "  ${BOLD}To stop all services:${RESET}\n"
  printf "     curl -fsSL https://raw.githubusercontent.com/phanducquanguet/usf/feature/customer-portal/scripts/install.sh | bash -s -- --stop\n"
  printf "\n"
}

# ---------------------------------------------------------------------------
# Stop: shut down a self-hosted installation
# ---------------------------------------------------------------------------
run_stop() {
  printf "\n"
  info "Stopping UniAI services..."

  if [ -d "$INSTALL_DIR" ]; then
    cd "$INSTALL_DIR"
    if [ -f docker-compose.selfhost.yml ]; then
      docker compose -f docker-compose.selfhost.yml down
      ok "Docker services stopped"
    else
      warn "No docker-compose.selfhost.yml found at $INSTALL_DIR"
    fi
  else
    warn "No UniAI installation found at $INSTALL_DIR"
  fi

  if command_exists uniai; then
    uniai daemon stop 2>/dev/null && ok "Daemon stopped" || true
  elif command_exists multica; then
    multica daemon stop 2>/dev/null && ok "Daemon stopped" || true
  fi

  printf "\n"
}

# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------
main() {
  local mode="default"

  while [ $# -gt 0 ]; do
    case "$1" in
      --with-server) mode="with-server" ;;
      --local)       mode="with-server" ;;  # backwards compat alias
      --stop)        mode="stop" ;;
      --help|-h)
        echo "Usage: install.sh [--with-server | --stop]"
        echo ""
        echo "  (default)       Install / upgrade the UniAI CLI"
        echo "  --with-server   Install CLI + provision a self-host server (Docker)"
        echo "  --stop          Stop a self-hosted installation"
        echo ""
        echo "Environment variables:"
        echo "  MULTICA_INSTALL_DIR   Self-host server install directory"
        echo "                        (default: \$HOME/.multica/server)"
        echo "  MULTICA_BIN_DIR       Target directory for the CLI binary when"
        echo "                        installing from GitHub Releases"
        echo "                        (default: /usr/local/bin, then \$HOME/.local/bin)"
        echo "  MULTICA_SELFHOST_REF  Git ref to check out for self-host assets"
        echo "                        (default: latest release tag, falling back to main)"
        echo ""
        echo "After installation, run 'uniai setup' to configure your environment."
        exit 0
        ;;
      *) warn "Unknown option: $1" ;;
    esac
    shift
  done

  case "$mode" in
    default)     run_default ;;
    with-server) run_with_server ;;
    stop)        run_stop ;;
  esac
}

main "$@"
