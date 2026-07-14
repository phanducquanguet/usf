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

test_installs_uniai_from_current_release
test_falls_back_to_pre_rename_release_asset
test_replaces_legacy_multica_binary_with_symlink
test_creates_missing_bin_dir_without_sudo
test_creates_missing_root_owned_bin_dir_via_sudo
echo "install.sh tests passed"
