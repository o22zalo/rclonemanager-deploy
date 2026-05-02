#!/usr/bin/env bash
# Path: .github/scripts/detect-os.sh
# Detects the true OS via uname (not RUNNER_OS).
# Writes RCLONE_MANAGER_CUR_OS, RCLONE_MANAGER_DOCKER_SOCK, COMPOSE_PROFILES, STACK_NAME,
# RCLONE_MANAGER_COMPOSE_PROJECT_NAME, RCLONE_MANAGER_WSL_WORKSPACE to .env + CI env.
set -euo pipefail

UNAME_S="$(uname -s)"
UNAME_R="$(uname -r)"

echo "=== [detect-os] uname -s: $UNAME_S | uname -r: $UNAME_R ==="

if echo "$UNAME_R" | grep -qi "microsoft\|wsl"; then
  RCLONE_MANAGER_CUR_OS="windows"
  RCLONE_MANAGER_DOCKER_SOCK="/var/run/docker.sock"
elif [ "$UNAME_S" = "Darwin" ]; then
  RCLONE_MANAGER_CUR_OS="macos"
  RCLONE_MANAGER_DOCKER_SOCK="/var/run/docker.sock"
elif echo "$UNAME_S" | grep -qi "MINGW\|MSYS\|CYGWIN"; then
  RCLONE_MANAGER_CUR_OS="windows"
  RCLONE_MANAGER_DOCKER_SOCK="/var/run/docker.sock"
else
  RCLONE_MANAGER_CUR_OS="linux"
  RCLONE_MANAGER_DOCKER_SOCK="/var/run/docker.sock"
fi

echo "  → RCLONE_MANAGER_CUR_OS=$RCLONE_MANAGER_CUR_OS"

# Workspace
RCLONE_MANAGER_CUR_WORK_DIR="${GITHUB_WORKSPACE:-${BUILD_SOURCESDIRECTORY:-$(pwd)}}"
RCLONE_MANAGER_CUR_WHOAMI="$(whoami)"
# STACK_NAME / RCLONE_MANAGER_COMPOSE_PROJECT_NAME derived from directory name
RCLONE_MANAGER_COMPOSE_PROJECT_NAME="$(basename "$RCLONE_MANAGER_CUR_WORK_DIR")"

# WSL path conversion
RCLONE_MANAGER_WSL_WORKSPACE=""
if [ "$RCLONE_MANAGER_CUR_OS" = "windows" ]; then
  if command -v wslpath &>/dev/null; then
    RCLONE_MANAGER_WSL_WORKSPACE="$(wslpath -u "$RCLONE_MANAGER_CUR_WORK_DIR" 2>/dev/null || echo "$RCLONE_MANAGER_CUR_WORK_DIR")"
  else
    WIN_PATH="${RCLONE_MANAGER_CUR_WORK_DIR//\\//}"
    DRIVE="${WIN_PATH:0:1}"; DRIVE_LOWER="${DRIVE,,}"; PATH_REST="${WIN_PATH:2}"
    RCLONE_MANAGER_WSL_WORKSPACE="/mnt/${DRIVE_LOWER}${PATH_REST}"
  fi
  echo "  → RCLONE_MANAGER_WSL_WORKSPACE=$RCLONE_MANAGER_WSL_WORKSPACE"
fi

# ── Append to .env ────────────────────────────────────────────────
{
  echo "RCLONE_MANAGER_CUR_OS=$RCLONE_MANAGER_CUR_OS"
  echo "RCLONE_MANAGER_DOCKER_SOCK=$RCLONE_MANAGER_DOCKER_SOCK"
  echo "RCLONE_MANAGER_COMPOSE_PROJECT_NAME=$RCLONE_MANAGER_COMPOSE_PROJECT_NAME"
  echo "RCLONE_MANAGER_CUR_WORK_DIR=$RCLONE_MANAGER_CUR_WORK_DIR"
  echo "RCLONE_MANAGER_CUR_WHOAMI=$RCLONE_MANAGER_CUR_WHOAMI"
  [ -n "$RCLONE_MANAGER_WSL_WORKSPACE" ] && echo "RCLONE_MANAGER_WSL_WORKSPACE=$RCLONE_MANAGER_WSL_WORKSPACE"
} >> .env

# ── Export to CI env ──────────────────────────────────────────────
set_ci_var() {
  local name="$1" value="$2"
  [ -n "${GITHUB_ENV:-}" ]  && echo "${name}=${value}" >> "$GITHUB_ENV"
  [ -n "${TF_BUILD:-}" ]    && echo "##vso[task.setvariable variable=${name}]${value}"
  export "${name}=${value}"
}

set_ci_var "RCLONE_MANAGER_CUR_OS"               "$RCLONE_MANAGER_CUR_OS"
set_ci_var "RCLONE_MANAGER_DOCKER_SOCK"          "$RCLONE_MANAGER_DOCKER_SOCK"
set_ci_var "RCLONE_MANAGER_COMPOSE_PROJECT_NAME" "$RCLONE_MANAGER_COMPOSE_PROJECT_NAME"
[ -n "$RCLONE_MANAGER_WSL_WORKSPACE" ] && set_ci_var "RCLONE_MANAGER_WSL_WORKSPACE" "$RCLONE_MANAGER_WSL_WORKSPACE"

echo "✅ [detect-os] RCLONE_MANAGER_CUR_OS=$RCLONE_MANAGER_CUR_OS"
