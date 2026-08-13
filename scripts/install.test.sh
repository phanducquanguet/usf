#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Build a self-contained sandbox with a stub `curl` and a release tarball.
# MULTICA_TEST_ARCHIVE points at the tarball the stub serves; the stub can be
# told to reject `uniai-cli-*` asset URLs (MULTICA_TEST_FAIL_UNIAI_ASSET=1) to
# model a pre-rename release that only ships `multica-cli-*` archives.
_setup_sandbox() {
  local tmp="$1"
  local binary_name="$2"
  local stub_bin="$tmp/stub-bin"
  local install_bin="$tmp/install-bin"
  local payload_dir="$tmp/payload"
  mkdir -p "$stub_bin" "$install_bin" "$payload_dir"

  cat >"$payload_dir/$binary_name" <<STUB
#!/usr/bin/env bash
echo "$binary_name v0.3.2 (commit: test)"
STUB
  chmod +x "$payload_dir/$binary_name"
  tar -czf "$tmp/cli.tar.gz" -C "$payload_dir" "$binary_name"

  cat >"$stub_bin/curl" <<'STUB'
#!/usr/bin/env bash
if [[ "$*" == *"-sI"* ]]; then
  printf 'HTTP/2 302\r\nlocation: https://github.com/phanducquanguet/usf/releases/tag/v0.3.2\r\n'
  exit 0
fi

if [[ "${MULTICA_TEST_FAIL_UNIAI_ASSET:-}" == "1" && "$*" == *"uniai-cli-"* ]]; then
  exit 22
fi

out=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    -o)
      out="$2"
      shift 2
      ;;
    *)
      shift
      ;;
  esac
done

if [[ -z "$out" ]]; then
  echo "stub curl expected -o" >&2
  exit 2
fi
cp "$MULTICA_TEST_ARCHIVE" "$out"
STUB
  chmod +x "$stub_bin/curl"
}

_run_installer() {
  local tmp="$1"
  local bin_dir="${2:-$tmp/install-bin}"
  local out="$tmp/install.out"
  local err="$tmp/install.err"
  if ! PATH="$tmp/stub-bin:$bin_dir:/usr/bin:/bin" \
    MULTICA_BIN_DIR="$bin_dir" \
    MULTICA_TEST_ARCHIVE="$tmp/cli.tar.gz" \
    MULTICA_TEST_FAIL_UNIAI_ASSET="${MULTICA_TEST_FAIL_UNIAI_ASSET:-}" \
    bash "$ROOT_DIR/scripts/install.sh" >"$out" 2>"$err"; then
    echo "install.sh exited non-zero" >&2
    cat "$out" >&2 || true
    cat "$err" >&2 || true
    return 1
  fi

  if [[ ! -x "$bin_dir/uniai" ]]; then
    echo "expected CLI binary at $bin_dir/uniai" >&2
    cat "$out" >&2 || true
    cat "$err" >&2 || true
    return 1
  fi
}

test_installs_uniai_from_current_release() {
  local tmp
  tmp="$(mktemp -d)"
  trap 'rm -rf "$tmp"' RETURN

  _setup_sandbox "$tmp" "uniai"
  _run_installer "$tmp"
}

test_falls_back_to_pre_rename_release_asset() {
  local tmp
  tmp="$(mktemp -d)"
  trap 'rm -rf "$tmp"' RETURN

  # Pre-rename release: no uniai-cli-* asset, archive contains `multica`.
  _setup_sandbox "$tmp" "multica"
  MULTICA_TEST_FAIL_UNIAI_ASSET=1 _run_installer "$tmp"
}

test_replaces_legacy_multica_binary_with_symlink() {
  local tmp
  tmp="$(mktemp -d)"
  trap 'rm -rf "$tmp"' RETURN

  _setup_sandbox "$tmp" "uniai"
  # Simulate a pre-rename install in the target bin dir.
  cat >"$tmp/install-bin/multica" <<'STUB'
#!/usr/bin/env bash
echo "multica v0.1.0 (commit: stale)"
STUB
  chmod +x "$tmp/install-bin/multica"

  _run_installer "$tmp"

  if [[ ! -L "$tmp/install-bin/multica" ]]; then
    echo "expected legacy multica to be replaced by a symlink to uniai" >&2
    return 1
  fi
}

test_creates_missing_bin_dir_without_sudo() {
  local tmp
  tmp="$(mktemp -d)"
  trap 'rm -rf "$tmp"' RETURN

  _setup_sandbox "$tmp" "uniai"
  # Any sudo invocation here is a regression: the dir is user-creatable.
  cat >"$tmp/stub-bin/sudo" <<'STUB'
#!/usr/bin/env bash
echo "unexpected sudo: $*" >&2
exit 1
STUB
  chmod +x "$tmp/stub-bin/sudo"

  _run_installer "$tmp" "$tmp/missing-bin"
}

test_creates_missing_root_owned_bin_dir_via_sudo() {
  local tmp
  tmp="$(mktemp -d)"
  trap 'chmod -R u+w "$tmp" 2>/dev/null || true; rm -rf "$tmp"' RETURN

  _setup_sandbox "$tmp" "uniai"
  # Model a fresh macOS box: the bin dir does not exist and its parent is
  # not user-writable (like /usr/local). The sudo stub grants "root" by
  # unlocking the parent before running the requested command.
  mkdir -p "$tmp/usr-local"
  chmod 555 "$tmp/usr-local"
  cat >"$tmp/stub-bin/sudo" <<STUB
#!/usr/bin/env bash
chmod 755 "$tmp/usr-local"
exec "\$@"
STUB
  chmod +x "$tmp/stub-bin/sudo"

  _run_installer "$tmp" "$tmp/usr-local/bin"
}

# Forbid sudo for scenarios that must stay entirely in user-writable dirs.
_stub_sudo_forbidden() {
  local tmp="$1"
  cat >"$tmp/stub-bin/sudo" <<'STUB'
#!/usr/bin/env bash
echo "unexpected sudo: $*" >&2
exit 1
STUB
  chmod +x "$tmp/stub-bin/sudo"
}

test_fresh_install_defaults_to_user_local_bin() {
  local tmp
  tmp="$(mktemp -d)"
  trap 'rm -rf "$tmp"' RETURN

  _setup_sandbox "$tmp" "uniai"
  _stub_sudo_forbidden "$tmp"
  mkdir -p "$tmp/home"

  # No MULTICA_BIN_DIR and no existing install: must land in ~/.local/bin
  # without ever touching sudo.
  if ! PATH="$tmp/stub-bin:/usr/bin:/bin" \
    HOME="$tmp/home" \
    MULTICA_TEST_ARCHIVE="$tmp/cli.tar.gz" \
    bash "$ROOT_DIR/scripts/install.sh" >"$tmp/install.out" 2>"$tmp/install.err"; then
    echo "install.sh exited non-zero" >&2
    cat "$tmp/install.out" "$tmp/install.err" >&2 || true
    return 1
  fi

  if [[ ! -x "$tmp/home/.local/bin/uniai" ]]; then
    echo "expected fresh install to default to \$HOME/.local/bin/uniai" >&2
    cat "$tmp/install.out" "$tmp/install.err" >&2 || true
    return 1
  fi
}

test_upgrades_existing_install_in_place() {
  local tmp
  tmp="$(mktemp -d)"
  trap 'rm -rf "$tmp"' RETURN

  _setup_sandbox "$tmp" "uniai"
  _stub_sudo_forbidden "$tmp"
  mkdir -p "$tmp/home" "$tmp/existing-bin"

  # An outdated install already lives outside the default dir.
  cat >"$tmp/existing-bin/uniai" <<'STUB'
#!/usr/bin/env bash
echo "uniai 0.1.0 (commit: old)"
STUB
  chmod +x "$tmp/existing-bin/uniai"

  if ! PATH="$tmp/stub-bin:$tmp/existing-bin:/usr/bin:/bin" \
    HOME="$tmp/home" \
    MULTICA_TEST_ARCHIVE="$tmp/cli.tar.gz" \
    bash "$ROOT_DIR/scripts/install.sh" >"$tmp/install.out" 2>"$tmp/install.err"; then
    echo "install.sh exited non-zero" >&2
    cat "$tmp/install.out" "$tmp/install.err" >&2 || true
    return 1
  fi

  # The upgrade must replace the binary where it already lives, not fork a
  # second copy into the default dir.
  if ! "$tmp/existing-bin/uniai" version 2>/dev/null | grep -q "0.3.2"; then
    echo "expected existing install at $tmp/existing-bin to be upgraded in place" >&2
    cat "$tmp/install.out" "$tmp/install.err" >&2 || true
    return 1
  fi
  if [[ -e "$tmp/home/.local/bin/uniai" ]]; then
    echo "upgrade must not install a duplicate binary into \$HOME/.local/bin" >&2
    return 1
  fi
}

test_remote_ssh_install_prints_token_login_hint() {
  local tmp
  tmp="$(mktemp -d)"
  trap 'rm -rf "$tmp"' RETURN

  _setup_sandbox "$tmp" "uniai"

  (
    export SSH_CONNECTION="192.0.2.10 54321 198.51.100.20 22"
    _run_installer "$tmp"
  )

  if ! grep -q "Looks like a remote/SSH session" "$tmp/install.out"; then
    echo "expected remote/SSH token-login hint in installer output" >&2
    cat "$tmp/install.out" >&2 || true
    return 1
  fi
  if ! grep -q "https://uniai.unicomhub.com/settings?tab=tokens" "$tmp/install.out"; then
    echo "expected direct API Tokens settings URL in installer output" >&2
    cat "$tmp/install.out" >&2 || true
    return 1
  fi
  if ! grep -q "Settings > API Tokens" "$tmp/install.out"; then
    echo "expected API Tokens tab name in installer output" >&2
    cat "$tmp/install.out" >&2 || true
    return 1
  fi
  if ! grep -q "uniai login --token <YOUR_TOKEN>" "$tmp/install.out"; then
    echo "expected token login command in installer output" >&2
    cat "$tmp/install.out" >&2 || true
    return 1
  fi
  if grep -q "uniai config set server_url" "$tmp/install.out"; then
    echo "did not expect default cloud server config command in installer output" >&2
    cat "$tmp/install.out" >&2 || true
    return 1
  fi
  if grep -q "uniai config set app_url" "$tmp/install.out"; then
    echo "did not expect default cloud app config command in installer output" >&2
    cat "$tmp/install.out" >&2 || true
    return 1
  fi
}

test_local_install_does_not_print_token_login_hint() {
  local tmp
  tmp="$(mktemp -d)"
  trap 'rm -rf "$tmp"' RETURN

  _setup_sandbox "$tmp" "uniai"

  (
    unset SSH_CONNECTION SSH_CLIENT SSH_TTY
    _run_installer "$tmp"
  )

  if grep -q "Looks like a remote/SSH session" "$tmp/install.out"; then
    echo "did not expect remote/SSH token-login hint in local installer output" >&2
    cat "$tmp/install.out" >&2 || true
    return 1
  fi
  if grep -q "uniai login --token <YOUR_TOKEN>" "$tmp/install.out"; then
    echo "did not expect token login command in local installer output" >&2
    cat "$tmp/install.out" >&2 || true
    return 1
  fi
}

# ---------------------------------------------------------------------------
# --with-server: the probed port and the printed port must both be the port
# Docker Compose reported (#6145)
#
# The installer used to derive the port from .env with its own copy of the alias
# chain. Compose gives the *calling environment* precedence over .env, so any
# ambient PORT / BACKEND_PORT / API_PORT / SERVER_PORT / FRONTEND_PORT moved the
# published port while the installer kept probing and printing the file value.
#
# Here the docker stub plays Compose: it answers `port` from the same resolution
# Compose performs, environment first, then .env. The installer must take that
# answer as given for both the health check and the summary — which is exactly
# what a .env-only derivation cannot do, because the two disagree in every case
# below. That real Compose resolves this way is proven separately, against real
# `docker compose config`, in scripts/selfhost-config.test.sh; that test needs a
# Docker CLI, which this job deliberately does not require.
# ---------------------------------------------------------------------------
_setup_server_sandbox() {
  local tmp="$1"
  local stub_bin="$tmp/stub-bin"
  local server_dir="$tmp/server"
  mkdir -p "$stub_bin" "$server_dir/.git"

  # Minimal self-host assets: only the port mapping matters here.
  cat >"$server_dir/.env.example" <<'ENVFILE'
PORT=8080
# BACKEND_PORT=8080
# API_PORT=8080
# SERVER_PORT=8080
FRONTEND_PORT=3000
JWT_SECRET=change-me-in-production
POSTGRES_PASSWORD=multica
DATABASE_URL=postgres://multica:multica@localhost:5432/multica?sslmode=disable
ENVFILE
  touch "$server_dir/docker-compose.selfhost.yml"

  # Compose stand-in. Resolves the published host port the way Compose does:
  # the process environment wins over .env, then the alias chain decides.
  cat >"$stub_bin/docker" <<'STUB'
#!/usr/bin/env bash
set -uo pipefail

_env_file_value() {
  local key="$1" line
  line="$(grep -E "^${key}=" .env 2>/dev/null | tail -n 1 || true)"
  [ -n "$line" ] || return 1
  printf '%s' "${line#*=}"
}

# Environment first (Compose interpolation), then the env file.
_resolve() {
  local key="$1" from_env
  eval "from_env=\${$key-__unset__}"
  if [ "$from_env" != "__unset__" ]; then
    printf '%s' "$from_env"
    return 0
  fi
  _env_file_value "$key"
}

_published_backend_port() {
  local value
  for key in BACKEND_PORT API_PORT SERVER_PORT PORT; do
    if value="$(_resolve "$key")" && [ -n "$value" ]; then
      printf '%s' "$value"
      return
    fi
  done
  printf '8080'
}

_published_frontend_port() {
  local value
  if value="$(_resolve FRONTEND_PORT)" && [ -n "$value" ]; then
    printf '%s' "$value"
    return
  fi
  printf '3000'
}

case "${1:-}" in
  info) exit 0 ;;
  compose)
    shift
    subcommand=""
    for arg in "$@"; do
      case "$arg" in
        pull | up | port | version | ps | logs | down) subcommand="$arg"; break ;;
      esac
    done
    case "$subcommand" in
      port)
        service=""
        for arg in "$@"; do
          case "$arg" in
            backend | frontend) service="$arg"; break ;;
          esac
        done
        case "$service" in
          backend) printf '127.0.0.1:%s\n' "$(_published_backend_port)" ;;
          frontend) printf '127.0.0.1:%s\n' "$(_published_frontend_port)" ;;
          *) exit 1 ;;
        esac
        ;;
      version) echo "2.30.0" ;;
    esac
    exit 0
    ;;
esac
exit 0
STUB
  chmod +x "$stub_bin/docker"

  # git: the installer takes the "existing installation" path, so only the
  # fetch/checkout calls run and they are all tolerant of failure.
  printf '#!/usr/bin/env bash\nexit 0\n' >"$stub_bin/git"
  chmod +x "$stub_bin/git"

  # An up-to-date uniai CLI is already present, so the installer takes the
  # "existing installation" path and never needs to download an archive.
  printf '#!/usr/bin/env bash\necho "uniai v0.3.2 (commit: test)"\n' >"$stub_bin/uniai"
  chmod +x "$stub_bin/uniai"

  # curl records every probed URL so the health-check port can be asserted.
  cat >"$stub_bin/curl" <<'STUB'
#!/usr/bin/env bash
set -uo pipefail
for arg in "$@"; do
  case "$arg" in
    http*) printf '%s\n' "$arg" >>"$MULTICA_TEST_CURL_LOG" ;;
  esac
done
exit 0
STUB
  chmod +x "$stub_bin/curl"

  printf '#!/usr/bin/env bash\nhead -c 32 /dev/zero | od -An -tx1 | tr -d " \\n"\n' >"$stub_bin/openssl"
  chmod +x "$stub_bin/openssl"
}

# Runs `install.sh --with-server` with the sandbox stubs. Remaining arguments are
# ambient environment assignments, so each case controls the environment
# explicitly instead of inheriting a CI runner's PORT.
_run_with_server() {
  local tmp="$1"
  shift

  : >"$tmp/curl.log"
  if ! env -i \
    PATH="$tmp/stub-bin:/usr/bin:/bin" \
    HOME="$tmp" \
    MULTICA_INSTALL_DIR="$tmp/server" \
    MULTICA_SELFHOST_REF="main" \
    MULTICA_TEST_CURL_LOG="$tmp/curl.log" \
    "$@" \
    bash "$ROOT_DIR/scripts/install.sh" --with-server \
    >"$tmp/install.out" 2>"$tmp/install.err"; then
    echo "install.sh --with-server exited non-zero" >&2
    cat "$tmp/install.out" >&2 || true
    cat "$tmp/install.err" >&2 || true
    return 1
  fi
}

# Asserts the probed port and the printed ports all match the stub's answer.
_require_server_ports() {
  local tmp="$1" label="$2" expected_backend="$3" expected_frontend="$4"
  local probed printed_backend printed_frontend

  probed="$(sed -n '1s#.*localhost:\([0-9]*\)/health#\1#p' "$tmp/curl.log")"
  printed_backend="$(sed -n 's#.*Backend:[^0-9]*http://localhost:\([0-9]*\).*#\1#p' "$tmp/install.out" | head -n 1)"
  printed_frontend="$(sed -n 's#.*Frontend:[^0-9]*http://localhost:\([0-9]*\).*#\1#p' "$tmp/install.out" | head -n 1)"

  if [ "$probed" != "$expected_backend" ] ||
    [ "$printed_backend" != "$expected_backend" ] ||
    [ "$printed_frontend" != "$expected_frontend" ]; then
    echo "[$label] installer ports disagree with the port Compose published" >&2
    echo "  compose published:  backend=$expected_backend frontend=$expected_frontend" >&2
    echo "  health check probed: ${probed:-<none>}" >&2
    echo "  printed:            backend=${printed_backend:-<none>} frontend=${printed_frontend:-<none>}" >&2
    cat "$tmp/install.out" >&2 || true
    return 1
  fi
}

test_with_server_uses_compose_published_ports() {
  local tmp
  tmp="$(mktemp -d)"
  trap 'rm -rf "$tmp"' RETURN

  # label | .env mutation (sed) | ambient env | expected backend | expected frontend
  local cases='defaults|||8080|3000
env-file PORT|s/^PORT=8080/PORT=9100/||9100|3000
env-file BACKEND_PORT|s/^# BACKEND_PORT=8080/BACKEND_PORT=9200/||9200|3000
env-file API_PORT|s/^# API_PORT=8080/API_PORT=9300/||9300|3000
env-file SERVER_PORT|s/^# SERVER_PORT=8080/SERVER_PORT=9400/||9400|3000
env-file FRONTEND_PORT|s/^FRONTEND_PORT=3000/FRONTEND_PORT=3100/||8080|3100
ambient PORT beats .env|s/^PORT=8080/PORT=9100/|PORT=9500|9500|3000
ambient BACKEND_PORT beats .env|s/^PORT=8080/PORT=9100/|BACKEND_PORT=9600|9600|3000
ambient API_PORT beats .env|s/^PORT=8080/PORT=9100/|API_PORT=9700|9700|3000
ambient SERVER_PORT beats .env|s/^PORT=8080/PORT=9100/|SERVER_PORT=9800|9800|3000
ambient FRONTEND_PORT beats .env|s/^FRONTEND_PORT=3000/FRONTEND_PORT=3100/|FRONTEND_PORT=3200|8080|3200
empty ambient BACKEND_PORT falls through|s/^PORT=8080/PORT=9100/|BACKEND_PORT=|9100|3000
empty env-file BACKEND_PORT falls through|s/^PORT=8080/PORT=9100/;s/^# BACKEND_PORT=8080/BACKEND_PORT=/||9100|3000'

  local label mutation ambient expect_backend expect_frontend
  while IFS='|' read -r label mutation ambient expect_backend expect_frontend; do
    [ -n "$label" ] || continue

    rm -rf "$tmp/server" "$tmp/stub-bin"
    _setup_server_sandbox "$tmp"
    cp "$tmp/server/.env.example" "$tmp/server/.env"
    if [ -n "$mutation" ]; then
      sed "$mutation" "$tmp/server/.env" >"$tmp/server/.env.new"
      mv "$tmp/server/.env.new" "$tmp/server/.env"
    fi

    if [ -n "$ambient" ]; then
      _run_with_server "$tmp" "$ambient" || return 1
    else
      _run_with_server "$tmp" || return 1
    fi
    _require_server_ports "$tmp" "$label" "$expect_backend" "$expect_frontend" || return 1
  done <<<"$cases"
}

test_with_server_fails_when_compose_port_is_unavailable() {
  local tmp
  tmp="$(mktemp -d)"
  trap 'rm -rf "$tmp"' RETURN

  _setup_server_sandbox "$tmp"
  cp "$tmp/server/.env.example" "$tmp/server/.env"

  # Compose cannot report a port, e.g. the container never came up.
  cat >"$tmp/stub-bin/docker" <<'STUB'
#!/usr/bin/env bash
set -uo pipefail
case "${1:-}" in
  info) exit 0 ;;
  compose)
    for arg in "$@"; do
      case "$arg" in
        port) exit 1 ;;
        version) echo "2.30.0"; exit 0 ;;
      esac
    done
    exit 0
    ;;
esac
exit 0
STUB
  chmod +x "$tmp/stub-bin/docker"

  if _run_with_server "$tmp" >/dev/null 2>&1; then
    echo "installer must not report success when Compose cannot report the port" >&2
    cat "$tmp/install.out" >&2 || true
    return 1
  fi
  if ! grep -q "could not read the backend host port" "$tmp/install.err"; then
    echo "expected an explicit failure about the backend host port" >&2
    cat "$tmp/install.err" >&2 || true
    return 1
  fi
  if grep -q "server is running and CLI is ready" "$tmp/install.out"; then
    echo "installer claimed success despite an unresolved port" >&2
    cat "$tmp/install.out" >&2 || true
    return 1
  fi
}

test_installs_uniai_from_current_release
test_falls_back_to_pre_rename_release_asset
test_replaces_legacy_multica_binary_with_symlink
test_creates_missing_bin_dir_without_sudo
test_creates_missing_root_owned_bin_dir_via_sudo
test_fresh_install_defaults_to_user_local_bin
test_upgrades_existing_install_in_place
test_remote_ssh_install_prints_token_login_hint
test_local_install_does_not_print_token_login_hint
test_with_server_uses_compose_published_ports
test_with_server_fails_when_compose_port_is_unavailable
echo "install.sh tests passed"
