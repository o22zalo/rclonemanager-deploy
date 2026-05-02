# AGENT_APP_SWAP.md

Single-file contract for replacing the `app` service with minimal prompt tokens.

## 1) How To Use

1. Run `npm run agent-app-swap:sync` before sending this file to an agent.
2. Send this file and one short task prompt (use template below).
3. Apply returned full files into your source tree (copy-paste replace).

## 2) Scope And Invariants

### Goal

Replace only the application layer while preserving Core/Ops/Access logic.

### Must keep

1. Service name stays `app`.
2. `app` stays on `app_net`.
3. Env-based Caddy labels stay env-based (no hard-coded domains/secrets).
4. `RCLONE_MANAGER_APP_PORT` remains the source of truth for container port.
5. Healthcheck remains present for app.
6. Persistent data uses `${RCLONE_MANAGER_DOCKER_VOLUMES_ROOT:-./.docker-volumes}/...`.
7. Core/Ops/Access behavior must not be changed unless explicitly requested.

## 3) Default Editable Files

- `compose.apps.yml`
- `services/app/**`
- `.env.example` (if new app env is required)
- `docker-compose/scripts/validate-env.js` (if new env validation is required)
- `docs/services/app.md`

## 4) Required Validation Commands

- `npm run dockerapp-validate:env`
- `npm run dockerapp-validate:compose`

If validation cannot run, agent must state why.

## 5) Output Contract (Token-Optimized)

Agent must return only:

1. `RESULT: OK` or `RESULT: BLOCKED`
2. `CHANGED_FILES: <comma-separated relative paths>`
3. Full content for changed files only, with this exact wrapper:

```text
===FILE:<relative/path>===
<full file content>
===END_FILE===
```

Rules:

- No diff format.
- No unchanged files.
- Keep explanation minimal (only for blockers/assumptions).
- If only one file changed, return only that one full file block.

## 6) Prompt Template

```text
Use AGENT_APP_SWAP.md as the only context source.

Task: Replace service `app` with the spec below, preserving all invariants in AGENT_APP_SWAP.md.

APP_SPEC:
- Runtime: <node|python|go|java|prebuilt-image|other>
- Delivery: <build|image>
- Image: <registry/image:tag> (if Delivery=image)
- Build context: <path> (if Delivery=build)
- Internal port: <number>
- Health path: <path>
- Required env vars: <KEY1,KEY2,...>
- Persistent container paths: <path1,path2,...>
- Startup command: <command>

Do:
1) Apply code changes in repo.
2) Run required validation commands.
3) Return output exactly using the Output Contract in AGENT_APP_SWAP.md.
```

## 7) Embedded Project Snapshot (Auto-Generated)

Tracked files:

- `.env.example`
- `compose.apps.yml`
- `docker-compose/compose.core.yml`
- `docker-compose/compose.ops.yml`
- `docker-compose/compose.access.yml`
- `docker-compose/scripts/dc.sh`
- `docker-compose/scripts/validate-env.js`

Plus:

- `DIRECTORY_STRUCTURE` snapshot (tree, depth-limited)

<!-- BEGIN:EMBEDDED_FILES -->
Generated at: 2026-04-13T04:04:19.497Z
Use this snapshot as direct editing context.

### `DIRECTORY_STRUCTURE`
```text
./
  - .azure/
    - azure-pipelines.yml
  - .github/
    - scripts/
      - collect-artifacts.sh
      - detect-os.sh
      - pull-env.sh
      - setup-linux.sh
    - workflows/
      - deploy.yml
  - .vscode/
    - hide-panel.js
    - tasks.json
  - cloudflared/
    - config.yml
    - config.yml.example
    - credentials.json
  - docker-compose/
    - scripts/
      - dc.sh
      - down.sh
      - logs.sh
      - up.sh
      - validate-compose.js
      - validate-env.js
      - validate-ts.js
    - compose.access.yml
    - compose.core.yml
    - compose.ops.yml
  - docs/
    - services/
      - app.md
      - caddy.md
      - cloudflared.md
      - dozzle.md
      - filebrowser.md
      - tailscale.md
      - webssh.md
    - deploy.md
    - deploy.new.md
  - scripts/
    - clone-stack.js
    - sync-agent-app-swap.js
  - services/
    - app/
      - Dockerfile
      - index.js
      - package.json
    - webssh/
      - Dockerfile
  - tailscale/
    - acl.sample.hujson
    - serve.json
    - tailscale-init.js
    - tailscale-keep-ip.js
  - .env
  - .env.example
  - .env.local
  - .gitignore
  - .opushforce.message
  - AGENT_APP_SWAP.md
  - CHANGE_LOGS_USER.md
  - CHANGE_LOGS.md
  - compose.apps.yml
  - package.json
  - project-api.http
  - README.md
```

### `.env.example`
```text
# ================================================================
#  .env.example — Docker Stack Template
#  Copy to .env, then fill in deployment-specific values.
#  Example: cp .env.example .env
# ================================================================

# ================================================================
#  CORE — Required for every deployment
# ================================================================

# Project name: used as docker project/network prefix + subdomain base + tailscale hostname
RCLONE_MANAGER_PROJECT_NAME=myapp

# Root domain — no http://, no trailing slash
RCLONE_MANAGER_DOMAIN=${RCLONE_MANAGER_PROJECT_NAME}.dpdns.org# ================================================================
#  CI / REMOTE ENV — Used by pipeline sync and stop-listener scripts
# ================================================================
RCLONE_MANAGER_DOTENVRTDB_ROOT_URL=https://your-project-default-rtdb.region.firebasedatabase.app/env.json?auth=replace-me
RCLONE_MANAGER_DOTENVRTDB_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
RCLONE_MANAGER_DOTENVRTDB_PATH_URL=demo

RCLONE_MANAGER_DOTENVRTDB_URL=${RCLONE_MANAGER_DOTENVRTDB_ROOT_URL}/${RCLONE_MANAGER_DOTENVRTDB_PATH_URL}.json?auth=${RCLONE_MANAGER_DOTENVRTDB_SECRET}
RCLONE_MANAGER_STOP_LISTENER_ENABLED=true
RCLONE_MANAGER_STOP_FIREBASE_URL=${RCLONE_MANAGER_DOTENVRTDB_ROOT_URL}/${RCLONE_MANAGER_DOTENVRTDB_PATH_URL}-stop-id.json?auth=${RCLONE_MANAGER_DOTENVRTDB_SECRET}
# Firebase Realtime Database URL used to store both:
# - state key  (tailscaled.state backup)
# - certs key  (/var/lib/tailscale/certs backup)
RCLONE_MANAGER_TAILSCALE_KEEP_IP_FIREBASE_URL=${RCLONE_MANAGER_DOTENVRTDB_ROOT_URL}/${RCLONE_MANAGER_DOTENVRTDB_PATH_URL}-tailscale-keep-ip.json?auth=${RCLONE_MANAGER_DOTENVRTDB_SECRET}

# ================================================================
#  CADDY AUTH — Basic Auth protects routes by default
# ================================================================
# Basic auth username
RCLONE_MANAGER_CADDY_AUTH_USER=admin
# Generate with:
#   docker run --rm caddy:alpine caddy hash-password --plaintext "YourPassword"
RCLONE_MANAGER_CADDY_AUTH_HASH='$2a$14$replace-this-with-a-real-bcrypt-hash-value000000000000'
# Email for Caddy SSL via Let's Encrypt
RCLONE_MANAGER_CADDY_EMAIL=${RCLONE_MANAGER_CADDY_AUTH_USER}@${RCLONE_MANAGER_DOMAIN}

# ================================================================
#  APPLICATION — Change these per deployment
# ================================================================

# Docker image to run as the main application
RCLONE_MANAGER_APP_IMAGE=node:20-alpine

# Port the app exposes inside the container
RCLONE_MANAGER_APP_PORT=3000

# Localhost port published on the host machine
RCLONE_MANAGER_APP_HOST_PORT=3000

# Optional health check path
RCLONE_MANAGER_HEALTH_PATH=/health

# Node.js / generic runtime env
RCLONE_MANAGER_NODE_ENV=production

# Root host folder for all container runtime data (bind mounts)
RCLONE_MANAGER_DOCKER_VOLUMES_ROOT=./.docker-volumes


# ================================================================
#  FEATURE FLAGS — Enable or disable optional services
# ================================================================
RCLONE_MANAGER_ENABLE_DOZZLE=true
RCLONE_MANAGER_ENABLE_FILEBROWSER=true
RCLONE_MANAGER_ENABLE_WEBSSH=true
RCLONE_MANAGER_ENABLE_TAILSCALE=false
# ================================================================
#  OPS PORTS — Dozzle/Filebrowser/WebSSH local + Tailnet access
# ================================================================
# Host ports for ops services (used by compose.ops.yml)
RCLONE_MANAGER_DOZZLE_HOST_PORT=18080
RCLONE_MANAGER_FILEBROWSER_HOST_PORT=18081
RCLONE_MANAGER_WEBSSH_HOST_PORT=17681
# Bind IP for ops service ports:
# - 127.0.0.1: localhost only (safe default)
# - 0.0.0.0: allow direct access via Tailscale/LAN host IP
RCLONE_MANAGER_OPS_HOST_BIND_IP=0.0.0.0

# ================================================================
#  CLOUDFLARE TUNNEL — Public ingress mapping
# ================================================================

# Tunnel name used by Cloudflare / sync tooling
RCLONE_MANAGER_CLOUDFLARED_TUNNEL_NAME=${RCLONE_MANAGER_PROJECT_NAME}-tunnel-name

# Public hostnames exposed through the tunnel
RCLONE_MANAGER_CLOUDFLARED_TUNNEL_HOSTNAME_1=${RCLONE_MANAGER_DOMAIN}
RCLONE_MANAGER_CLOUDFLARED_TUNNEL_HOSTNAME_2=main.${RCLONE_MANAGER_DOMAIN}
RCLONE_MANAGER_CLOUDFLARED_TUNNEL_HOSTNAME_3=ttyd.${RCLONE_MANAGER_DOMAIN}
RCLONE_MANAGER_CLOUDFLARED_TUNNEL_HOSTNAME_4=dozzle.${RCLONE_MANAGER_DOMAIN}
RCLONE_MANAGER_CLOUDFLARED_TUNNEL_HOSTNAME_5=files.${RCLONE_MANAGER_DOMAIN}

# Internal services behind each hostname
RCLONE_MANAGER_CLOUDFLARED_TUNNEL_SERVICE_1=http://caddy:80
RCLONE_MANAGER_CLOUDFLARED_TUNNEL_SERVICE_2=http://caddy:80
RCLONE_MANAGER_CLOUDFLARED_TUNNEL_SERVICE_3=http://caddy:80
RCLONE_MANAGER_CLOUDFLARED_TUNNEL_SERVICE_4=http://caddy:80
RCLONE_MANAGER_CLOUDFLARED_TUNNEL_SERVICE_5=http://caddy:80

# CI sync value for cloudflared/credentials.json
RCLONE_MANAGER_CLOUDFLARED_TUNNEL_CREDENTIALS_BASE64=file:base64:./cloudflared/credentials.json

# ================================================================
#  TAILSCALE — Only required if RCLONE_MANAGER_ENABLE_TAILSCALE=true
# ================================================================

# Optional: OAuth client ID for tailscale/tailscale-init.js
# Get from: https://login.tailscale.com/admin/settings/keys (Trust credentials)
# If using tailscale-init / keep-ip OAuth flow, set:
#   RCLONE_MANAGER_TAILSCALE_CLIENTID=<OAuth client ID>
#   RCLONE_MANAGER_TAILSCALE_AUTHKEY=<OAuth client secret, tskey-client-...>
RCLONE_MANAGER_TAILSCALE_CLIENTID=kFhHFn4CBE11CNTRL
# Get from: https://login.tailscale.com/admin/settings/keys
# Use Reusable + Ephemeral for CI runners.
# Auth key used by tailscale container to join tailnet and by scripts to request access token.
RCLONE_MANAGER_TAILSCALE_AUTHKEY=tskey-client-xxxxxxxxxxxxxx-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
# ACL tags for this node, example: tag:ci,tag:container
RCLONE_MANAGER_TAILSCALE_TAGS=tag:container
# Owners used when tailscale-init creates missing tagOwners
RCLONE_MANAGER_TAILSCALE_TAG_OWNERS=autogroup:admin
# Tailnet DNS suffix from Tailscale admin → DNS page
RCLONE_MANAGER_TAILSCALE_TAILNET_DOMAIN=your-tailnet.ts.net
# Used to auto-generate tailscale/serve.json (TS_SERVE_CONFIG) for Tailscale HTTPS.
# Optional: tailnet identifier used by tailscale-init API calls (default: -)
RCLONE_MANAGER_TAILSCALE_TS_TAILNET=-
# Optional: output path for generated serve config
RCLONE_MANAGER_TAILSCALE_SERVE_JSON_PATH=./tailscale/serve.json
# Optional: local upstream for Tailscale Serve proxy
RCLONE_MANAGER_TAILSCALE_SERVE_PROXY=http://127.0.0.1:80
# Keep same Tailscale identity/IP across restart by backing up tailscaled.state
# true  = enable backup/restore + remove existing hostname before start
# false = disable this behavior
RCLONE_MANAGER_TAILSCALE_KEEP_IP_ENABLE=false
# Optional: remove existing device(s) matching RCLONE_MANAGER_PROJECT_NAME before start
# If this var is missing/empty, runtime falls back to RCLONE_MANAGER_TAILSCALE_KEEP_IP_ENABLE.
# Set true to remove hostname even when KEEP_IP is false.
RCLONE_MANAGER_TAILSCALE_KEEP_IP_REMOVE_HOSTNAME_ENABLE=false
# Optional certs directory override (default: /var/lib/tailscale/certs)
RCLONE_MANAGER_TAILSCALE_KEEP_IP_CERTS_DIR=/var/lib/tailscale/certs
# Optional backup interval for keep-ip sidecar (seconds)
RCLONE_MANAGER_TAILSCALE_KEEP_IP_INTERVAL_SEC=30
# Optional: local ACL JSON/HuJSON file to merge missing tagOwners
RCLONE_MANAGER_TAILSCALE_ACL_JSON_PATH=./tailscale/acl.sample.hujson




# ================================================================
#  RUNTIME — Auto-set by CI scripts. Do NOT edit manually.
# ================================================================

# RCLONE_MANAGER_CUR_OS=linux
# RCLONE_MANAGER_DOCKER_SOCK=/var/run/docker.sock
# RCLONE_MANAGER_COMPOSE_PROJECT_NAME=docker-stack-template
# RCLONE_MANAGER_CUR_WHOAMI=runner
# RCLONE_MANAGER_CUR_WORK_DIR=/home/runner/work
# RCLONE_MANAGER_WSL_WORKSPACE=/mnt/c/path/to/workspace
```

### `compose.apps.yml`
```yaml
# ================================================================
#  compose.apps.yml — Application Layer
#  Builds the bundled sample app from ./services/app
#
#  Subdomain: ${RCLONE_MANAGER_PROJECT_NAME}.${RCLONE_MANAGER_DOMAIN}
#
#  Minimal required env:
#    RCLONE_MANAGER_APP_PORT   — Port app listens on inside container
#    RCLONE_MANAGER_PROJECT_NAME, RCLONE_MANAGER_DOMAIN, RCLONE_MANAGER_CADDY_AUTH_USER, RCLONE_MANAGER_CADDY_AUTH_HASH
# ================================================================

services:
  app:
    image: "${RCLONE_MANAGER_PROJECT_NAME:-myapp}-app:local"
    build:
      context: ./services/app
      dockerfile: Dockerfile
    environment:
      RCLONE_MANAGER_NODE_ENV: "${RCLONE_MANAGER_NODE_ENV:-production}"
      RCLONE_MANAGER_PORT: "${RCLONE_MANAGER_APP_PORT:-3000}"
    ports:
      - "127.0.0.1:${RCLONE_MANAGER_APP_HOST_PORT:-3000}:${RCLONE_MANAGER_APP_PORT:-3000}"
    volumes:
      - ${RCLONE_MANAGER_DOCKER_VOLUMES_ROOT:-./.docker-volumes}/app/logs:/app/logs
    labels:
      # Public HTTP sites behind Cloudflare Tunnel.
      - "caddy=http://${RCLONE_MANAGER_PROJECT_NAME}.${RCLONE_MANAGER_DOMAIN}, http://main.${RCLONE_MANAGER_DOMAIN}, http://${RCLONE_MANAGER_DOMAIN}, http://${RCLONE_MANAGER_PROJECT_NAME}.${RCLONE_MANAGER_TAILSCALE_TAILNET_DOMAIN}"
      - "caddy.reverse_proxy={{upstreams ${RCLONE_MANAGER_APP_PORT:-3000}}}"
      - "caddy.basic_auth=/*"
      - "caddy.basic_auth.${RCLONE_MANAGER_CADDY_AUTH_USER:-admin}=${RCLONE_MANAGER_CADDY_AUTH_HASH}"
      # Internal HTTPS site for Tailscale / trusted LAN access.
      - "caddy_1=https://${RCLONE_MANAGER_PROJECT_NAME:-myapp}.${RCLONE_MANAGER_TAILSCALE_TAILNET_DOMAIN:-tailnet.local}"
      - "caddy_1.tls=internal"
      - "caddy_1.reverse_proxy={{upstreams ${RCLONE_MANAGER_APP_PORT:-3000}}}"
      - "caddy_1.basic_auth=/*"
      - "caddy_1.basic_auth.${RCLONE_MANAGER_CADDY_AUTH_USER:-admin}=${RCLONE_MANAGER_CADDY_AUTH_HASH}"
    networks: [app_net]
    restart: unless-stopped
    healthcheck:
      test:
        - "CMD"
        - "sh"
        - "-c"
        - "wget -qO- http://localhost:${RCLONE_MANAGER_APP_PORT:-3000}${RCLONE_MANAGER_HEALTH_PATH:-/health} || exit 1"
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 15s
```

### `docker-compose/compose.core.yml`
```yaml
# ================================================================
#  compose.core.yml — Core Infrastructure
#  Always included: reverse proxy (Caddy) + tunnel (Cloudflare)
#
#  Required env:
#    RCLONE_MANAGER_PROJECT_NAME, RCLONE_MANAGER_DOMAIN, RCLONE_MANAGER_CADDY_EMAIL, RCLONE_MANAGER_CADDY_AUTH_USER,
#    RCLONE_MANAGER_CADDY_AUTH_HASH, CF_TUNNEL_TOKEN (or credentials file)
# ================================================================

networks:
  # Defined once here for the whole merged stack; overlay files join it by name.
  app_net:
    name: ${RCLONE_MANAGER_PROJECT_NAME:-myapp}_net

services:
  # ── Caddy: auto reverse proxy via Docker labels ────────────────
  caddy:
    image: lucaslorentz/caddy-docker-proxy:2.9.1-alpine
    ports:
      - "80:80"
    volumes:
      - ${RCLONE_MANAGER_DOCKER_SOCK:-/var/run/docker.sock}:/var/run/docker.sock:ro
      - ${RCLONE_MANAGER_DOCKER_VOLUMES_ROOT:-./.docker-volumes}/caddy/data:/data
      - ${RCLONE_MANAGER_DOCKER_VOLUMES_ROOT:-./.docker-volumes}/caddy/config:/config
    environment:
      CADDY_INGRESS_NETWORKS: ${RCLONE_MANAGER_PROJECT_NAME:-myapp}_net
    labels:
      caddy.email: "${RCLONE_MANAGER_CADDY_EMAIL}"
      caddy.auto_https: "disable_redirects"
    networks: [app_net]
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:80"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 10s

  # ── Cloudflared: expose to Internet without opening ports ──────
  cloudflared:
    image: cloudflare/cloudflared:latest
    command: tunnel --config /etc/cloudflared/config.yml run
    volumes:
      - ./cloudflared/config.yml:/etc/cloudflared/config.yml:ro
      - ./cloudflared/credentials.json:/etc/cloudflared/credentials.json:ro
    networks: [app_net]
    restart: unless-stopped
    depends_on:
      caddy:
        condition: service_healthy
```

### `docker-compose/compose.ops.yml`
```yaml
# ================================================================
#  compose.ops.yml — Operational Tools
#  Feature-flagged via ENABLE_* env vars → dc.sh sets --profile
#
#  Profiles:
#    dozzle         — real-time container log viewer
#    filebrowser    — web file manager (mounts workspace + .docker-volumes)
#    webssh-linux   — browser SSH terminal (Linux runner)
#    webssh-windows — socat bridge to host ttyd (Windows runner)
#
#  Subdomain convention (auto-generated, no manual config):
#    logs.${RCLONE_MANAGER_PROJECT_NAME}.${RCLONE_MANAGER_DOMAIN}
#    files.${RCLONE_MANAGER_PROJECT_NAME}.${RCLONE_MANAGER_DOMAIN}
#    ttyd.${RCLONE_MANAGER_PROJECT_NAME}.${RCLONE_MANAGER_DOMAIN}
#
#  Optional localhost ports for Tailscale/host access:
#    RCLONE_MANAGER_DOZZLE_HOST_PORT=18080
#    RCLONE_MANAGER_FILEBROWSER_HOST_PORT=18081
#    RCLONE_MANAGER_WEBSSH_HOST_PORT=17681
#  Optional bind IP for direct Tailnet access by host ports:
#    RCLONE_MANAGER_OPS_HOST_BIND_IP=0.0.0.0
# ================================================================

services:
  # ── Dozzle: real-time container logs ──────────────────────────
  dozzle:
    profiles: [dozzle]
    image: amir20/dozzle:latest
    volumes:
      - ${RCLONE_MANAGER_DOCKER_SOCK:-/var/run/docker.sock}:/var/run/docker.sock:ro
    environment:
      DOZZLE_NO_ANALYTICS: "true"
    ports:
      - "${RCLONE_MANAGER_OPS_HOST_BIND_IP:-127.0.0.1}:${RCLONE_MANAGER_DOZZLE_HOST_PORT:-18080}:8080"
    labels:
      - "caddy=http://logs.${RCLONE_MANAGER_PROJECT_NAME}.${RCLONE_MANAGER_DOMAIN}, http://logs.${RCLONE_MANAGER_DOMAIN}, http://dozzle.${RCLONE_MANAGER_DOMAIN}"
      - "caddy.reverse_proxy={{upstreams 8080}}"
      - "caddy.basic_auth=/*"
      - "caddy.basic_auth.${RCLONE_MANAGER_CADDY_AUTH_USER:-admin}=${RCLONE_MANAGER_CADDY_AUTH_HASH}"
    networks: [app_net]
    restart: unless-stopped

  # ── Filebrowser: browse and download log files ─────────────────
  filebrowser:
    profiles: [filebrowser]
    image: filebrowser/filebrowser:v2.30.0
    command: --noauth --port 80 --root /srv --database /database/filebrowser.db
    ports:
      - "${RCLONE_MANAGER_OPS_HOST_BIND_IP:-127.0.0.1}:${RCLONE_MANAGER_FILEBROWSER_HOST_PORT:-18081}:80"
    volumes:
      - .:/srv/workspace # browse all project files
      - ${RCLONE_MANAGER_DOCKER_VOLUMES_ROOT:-./.docker-volumes}:/srv/docker-volumes:ro # all runtime data of services
      - ./logs:/srv/logs:ro # optional direct logs shortcut
      - ${RCLONE_MANAGER_DOCKER_VOLUMES_ROOT:-./.docker-volumes}/filebrowser/database:/database
    labels:
      - "caddy=http://files.${RCLONE_MANAGER_PROJECT_NAME}.${RCLONE_MANAGER_DOMAIN}, http://files.${RCLONE_MANAGER_DOMAIN}"
      - "caddy.reverse_proxy={{upstreams 80}}"
      - "caddy.basic_auth=/*"
      - "caddy.basic_auth.${RCLONE_MANAGER_CADDY_AUTH_USER:-admin}=${RCLONE_MANAGER_CADDY_AUTH_HASH}"
    networks: [app_net]
    restart: unless-stopped

  # ── WebSSH (Linux): ttyd container → SSH into host runner ──────
  webssh:
    profiles: [webssh-linux]
    build: ./services/webssh
    command:
      - "ttyd"
      - "-W"
      - "ssh"
      - "-i"
      - "/root/.ssh/id_rsa"
      - "-o"
      - "StrictHostKeyChecking=no"
      - "-o"
      - "UserKnownHostsFile=/dev/null"
      - "-o"
      - "ConnectTimeout=10"
      - "-t"
      - "${RCLONE_MANAGER_CUR_WHOAMI:-runner}@host.docker.internal"
      - "cd ${RCLONE_MANAGER_CUR_WORK_DIR:-/home/runner} && exec ${RCLONE_MANAGER_SHELL:-/bin/bash}"
    extra_hosts:
      - "host.docker.internal:host-gateway"
    ports:
      - "${RCLONE_MANAGER_OPS_HOST_BIND_IP:-127.0.0.1}:${RCLONE_MANAGER_WEBSSH_HOST_PORT:-17681}:7681"
    volumes:
      - ./services/webssh/.ssh:/root/.ssh:ro
    labels:
      - "caddy=http://ttyd.${RCLONE_MANAGER_PROJECT_NAME}.${RCLONE_MANAGER_DOMAIN}, http://ttyd.${RCLONE_MANAGER_DOMAIN}"
      - "caddy.reverse_proxy={{upstreams 7681}}"
      - "caddy.basic_auth=/*"
      - "caddy.basic_auth.${RCLONE_MANAGER_CADDY_AUTH_USER:-admin}=${RCLONE_MANAGER_CADDY_AUTH_HASH}"
    networks: [app_net]
    restart: unless-stopped

  # ── WebSSH (Windows): socat bridge → host ttyd process ─────────
  webssh-windows:
    profiles: [webssh-windows]
    image: alpine/socat:latest
    command: >
      TCP-LISTEN:7681,fork,reuseaddr
      TCP:host.docker.internal:7681
    extra_hosts:
      - "host.docker.internal:host-gateway"
    ports:
      - "${RCLONE_MANAGER_OPS_HOST_BIND_IP:-127.0.0.1}:${RCLONE_MANAGER_WEBSSH_HOST_PORT:-17681}:7681"
    labels:
      - "caddy=http://ttyd.${RCLONE_MANAGER_PROJECT_NAME}.${RCLONE_MANAGER_DOMAIN}"
      - "caddy.reverse_proxy={{upstreams 7681}}"
      - "caddy.basic_auth=/*"
      - "caddy.basic_auth.${RCLONE_MANAGER_CADDY_AUTH_USER:-admin}=${RCLONE_MANAGER_CADDY_AUTH_HASH}"
    networks: [app_net]
    restart: unless-stopped
```

### `docker-compose/compose.access.yml`
```yaml
# ================================================================
#  compose.access.yml — Network Access Layer
#  Tailscale VPN — private mesh for internal team access
#
#  Profiles:
#    tailscale-linux   — kernel TUN mode (full features, Linux host)
#    tailscale-windows — userspace mode (Windows/WSL2 host)
#
#  Required env (when RCLONE_MANAGER_ENABLE_TAILSCALE=true):
#    RCLONE_MANAGER_TAILSCALE_AUTHKEY, RCLONE_MANAGER_TAILSCALE_TAGS
#  Optional keep-ip env:
#    RCLONE_MANAGER_TAILSCALE_KEEP_IP_ENABLE, RCLONE_MANAGER_TAILSCALE_KEEP_IP_FIREBASE_URL (state+certs),
#    RCLONE_MANAGER_TAILSCALE_KEEP_IP_CERTS_DIR, RCLONE_MANAGER_TAILSCALE_KEEP_IP_REMOVE_HOSTNAME_ENABLE,
#    RCLONE_MANAGER_TAILSCALE_KEEP_IP_INTERVAL_SEC,
#    RCLONE_MANAGER_TAILSCALE_CLIENTID
# ================================================================

services:
  # ── Keep IP prepare (Linux profile): optional restore + optional remove hostname ──
  tailscale-keep-ip-prepare-linux:
    profiles: [tailscale-linux]
    image: node:20-alpine
    command: ["node", "/workspace/tailscale/tailscale-keep-ip.js", "prepare"]
    environment:
      RCLONE_MANAGER_TAILSCALE_KEEP_IP_ENABLE: "${RCLONE_MANAGER_TAILSCALE_KEEP_IP_ENABLE:-false}"
      RCLONE_MANAGER_TAILSCALE_KEEP_IP_REMOVE_HOSTNAME_ENABLE: "${RCLONE_MANAGER_TAILSCALE_KEEP_IP_REMOVE_HOSTNAME_ENABLE:-}"
      RCLONE_MANAGER_TAILSCALE_KEEP_IP_FIREBASE_URL: "${RCLONE_MANAGER_TAILSCALE_KEEP_IP_FIREBASE_URL:-}"
      RCLONE_MANAGER_TAILSCALE_KEEP_IP_STATE_FILE: /var/lib/tailscale/tailscaled.state
      RCLONE_MANAGER_TAILSCALE_KEEP_IP_CERTS_DIR: "${RCLONE_MANAGER_TAILSCALE_KEEP_IP_CERTS_DIR:-/var/lib/tailscale/certs}"
      RCLONE_MANAGER_PROJECT_NAME: "${RCLONE_MANAGER_PROJECT_NAME:-myapp}"
      RCLONE_MANAGER_TAILSCALE_TS_TAILNET: "${RCLONE_MANAGER_TAILSCALE_TS_TAILNET:--}"
      RCLONE_MANAGER_TAILSCALE_AUTHKEY: "${RCLONE_MANAGER_TAILSCALE_AUTHKEY:-}"
      RCLONE_MANAGER_TAILSCALE_CLIENTID: "${RCLONE_MANAGER_TAILSCALE_CLIENTID:-}"
    user: "0:0"
    volumes:
      - ${RCLONE_MANAGER_DOCKER_VOLUMES_ROOT:-./.docker-volumes}/tailscale/var-lib:/var/lib/tailscale
      - ./tailscale:/workspace/tailscale:ro
    networks: [app_net]
    restart: "no"

  # ── Keep IP prepare (Windows profile): optional restore + optional remove hostname ─
  tailscale-keep-ip-prepare-windows:
    profiles: [tailscale-windows]
    image: node:20-alpine
    command: ["node", "/workspace/tailscale/tailscale-keep-ip.js", "prepare"]
    environment:
      RCLONE_MANAGER_TAILSCALE_KEEP_IP_ENABLE: "${RCLONE_MANAGER_TAILSCALE_KEEP_IP_ENABLE:-false}"
      RCLONE_MANAGER_TAILSCALE_KEEP_IP_REMOVE_HOSTNAME_ENABLE: "${RCLONE_MANAGER_TAILSCALE_KEEP_IP_REMOVE_HOSTNAME_ENABLE:-}"
      RCLONE_MANAGER_TAILSCALE_KEEP_IP_FIREBASE_URL: "${RCLONE_MANAGER_TAILSCALE_KEEP_IP_FIREBASE_URL:-}"
      RCLONE_MANAGER_TAILSCALE_KEEP_IP_STATE_FILE: /var/lib/tailscale/tailscaled.state
      RCLONE_MANAGER_TAILSCALE_KEEP_IP_CERTS_DIR: "${RCLONE_MANAGER_TAILSCALE_KEEP_IP_CERTS_DIR:-/var/lib/tailscale/certs}"
      RCLONE_MANAGER_PROJECT_NAME: "${RCLONE_MANAGER_PROJECT_NAME:-myapp}"
      RCLONE_MANAGER_TAILSCALE_TS_TAILNET: "${RCLONE_MANAGER_TAILSCALE_TS_TAILNET:--}"
      RCLONE_MANAGER_TAILSCALE_AUTHKEY: "${RCLONE_MANAGER_TAILSCALE_AUTHKEY:-}"
      RCLONE_MANAGER_TAILSCALE_CLIENTID: "${RCLONE_MANAGER_TAILSCALE_CLIENTID:-}"
    user: "0:0"
    volumes:
      - ${RCLONE_MANAGER_DOCKER_VOLUMES_ROOT:-./.docker-volumes}/tailscale/var-lib:/var/lib/tailscale
      - ./tailscale:/workspace/tailscale:ro
    networks: [app_net]
    restart: "no"

  # ── Tailscale: Linux kernel mode (NET_ADMIN + TUN) ─────────────
  tailscale-linux:
    profiles: [tailscale-linux]
    image: tailscale/tailscale:stable
    hostname: ${RCLONE_MANAGER_PROJECT_NAME:-myapp}
    depends_on:
      tailscale-keep-ip-prepare-linux:
        condition: service_completed_successfully
    environment:
      TS_AUTHKEY: "${RCLONE_MANAGER_TAILSCALE_AUTHKEY:-}"
      TS_USERSPACE: "false"
      TS_SERVE_CONFIG: /config/serve/serve.json
      TS_EXTRA_ARGS: >-
        --advertise-tags=${RCLONE_MANAGER_TAILSCALE_TAGS:-tag:container}
        --accept-dns=true
        --accept-routes
      TS_STATE_DIR: /var/lib/tailscale
    volumes:
      - ${RCLONE_MANAGER_DOCKER_VOLUMES_ROOT:-./.docker-volumes}/tailscale/var-lib:/var/lib/tailscale
      - ./tailscale:/config/serve
      - /dev/net/tun:/dev/net/tun
    cap_add:
      - NET_ADMIN
      - SYS_MODULE
    network_mode: host
    restart: unless-stopped

  # ── Tailscale: Windows/WSL2 userspace mode ─────────────────────
  tailscale-windows:
    profiles: [tailscale-windows]
    image: tailscale/tailscale:stable
    hostname: ${RCLONE_MANAGER_PROJECT_NAME:-myapp}
    depends_on:
      tailscale-keep-ip-prepare-windows:
        condition: service_completed_successfully
    environment:
      RCLONE_MANAGER_TAILSCALE_AUTHKEY: "${RCLONE_MANAGER_TAILSCALE_AUTHKEY:-}"
      TS_USERSPACE: "true"
      TS_SERVE_CONFIG: /config/serve/serve.json
      TS_EXTRA_ARGS: >-
        --advertise-tags=${RCLONE_MANAGER_TAILSCALE_TAGS:-tag:container}
        --accept-dns=true
      TS_STATE_DIR: /var/lib/tailscale
    volumes:
      - ${RCLONE_MANAGER_DOCKER_VOLUMES_ROOT:-./.docker-volumes}/tailscale/var-lib:/var/lib/tailscale
      - ./tailscale:/config/serve
    networks: [app_net]
    restart: unless-stopped

  # ── Keep IP backup loop (Linux profile): upload state periodically ─────
  tailscale-keep-ip-backup-linux:
    profiles: [tailscale-linux]
    image: node:20-alpine
    depends_on:
      tailscale-linux:
        condition: service_started
    command: ["node", "/workspace/tailscale/tailscale-keep-ip.js", "backup-loop"]
    environment:
      RCLONE_MANAGER_TAILSCALE_KEEP_IP_ENABLE: "${RCLONE_MANAGER_TAILSCALE_KEEP_IP_ENABLE:-false}"
      RCLONE_MANAGER_TAILSCALE_KEEP_IP_FIREBASE_URL: "${RCLONE_MANAGER_TAILSCALE_KEEP_IP_FIREBASE_URL:-}"
      RCLONE_MANAGER_TAILSCALE_KEEP_IP_STATE_FILE: /var/lib/tailscale/tailscaled.state
      RCLONE_MANAGER_TAILSCALE_KEEP_IP_CERTS_DIR: "${RCLONE_MANAGER_TAILSCALE_KEEP_IP_CERTS_DIR:-/var/lib/tailscale/certs}"
      RCLONE_MANAGER_TAILSCALE_KEEP_IP_INTERVAL_SEC: "${RCLONE_MANAGER_TAILSCALE_KEEP_IP_INTERVAL_SEC:-30}"
      RCLONE_MANAGER_PROJECT_NAME: "${RCLONE_MANAGER_PROJECT_NAME:-myapp}"
      RCLONE_MANAGER_TAILSCALE_TS_TAILNET: "${RCLONE_MANAGER_TAILSCALE_TS_TAILNET:--}"
    user: "0:0"
    volumes:
      - ${RCLONE_MANAGER_DOCKER_VOLUMES_ROOT:-./.docker-volumes}/tailscale/var-lib:/var/lib/tailscale
      - ./tailscale:/workspace/tailscale:ro
    networks: [app_net]
    restart: unless-stopped

  # ── Keep IP backup loop (Windows profile): upload state periodically ───
  tailscale-keep-ip-backup-windows:
    profiles: [tailscale-windows]
    image: node:20-alpine
    depends_on:
      tailscale-windows:
        condition: service_started
    command: ["node", "/workspace/tailscale/tailscale-keep-ip.js", "backup-loop"]
    environment:
      RCLONE_MANAGER_TAILSCALE_KEEP_IP_ENABLE: "${RCLONE_MANAGER_TAILSCALE_KEEP_IP_ENABLE:-false}"
      RCLONE_MANAGER_TAILSCALE_KEEP_IP_FIREBASE_URL: "${RCLONE_MANAGER_TAILSCALE_KEEP_IP_FIREBASE_URL:-}"
      RCLONE_MANAGER_TAILSCALE_KEEP_IP_STATE_FILE: /var/lib/tailscale/tailscaled.state
      RCLONE_MANAGER_TAILSCALE_KEEP_IP_CERTS_DIR: "${RCLONE_MANAGER_TAILSCALE_KEEP_IP_CERTS_DIR:-/var/lib/tailscale/certs}"
      RCLONE_MANAGER_TAILSCALE_KEEP_IP_INTERVAL_SEC: "${RCLONE_MANAGER_TAILSCALE_KEEP_IP_INTERVAL_SEC:-30}"
      RCLONE_MANAGER_PROJECT_NAME: "${RCLONE_MANAGER_PROJECT_NAME:-myapp}"
      RCLONE_MANAGER_TAILSCALE_TS_TAILNET: "${RCLONE_MANAGER_TAILSCALE_TS_TAILNET:--}"
    user: "0:0"
    volumes:
      - ${RCLONE_MANAGER_DOCKER_VOLUMES_ROOT:-./.docker-volumes}/tailscale/var-lib:/var/lib/tailscale
      - ./tailscale:/workspace/tailscale:ro
    networks: [app_net]
    restart: unless-stopped
```

### `docker-compose/scripts/dc.sh`
```bash
#!/usr/bin/env bash
# ================================================================
#  dc.sh — Docker Compose Orchestrator
#  Reads .env feature flags → auto-selects profiles → runs compose
#
#  Usage:
#    bash docker-compose/scripts/dc.sh up -d --build
#    bash docker-compose/scripts/dc.sh down
#    bash docker-compose/scripts/dc.sh logs -f
#    bash docker-compose/scripts/dc.sh ps
#    bash docker-compose/scripts/dc.sh config
#    bash docker-compose/scripts/dc.sh <any compose command>
# ================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

trim() {
  local s="$1"
  s="${s#"${s%%[![:space:]]*}"}"
  s="${s%"${s##*[![:space:]]}"}"
  printf '%s' "$s"
}

expand_env_refs() {
  local value="$1"
  local ref replacement
  while [[ "$value" =~ \$\{([A-Za-z_][A-Za-z0-9_]*)\} ]]; do
    ref="${BASH_REMATCH[1]}"
    replacement="${!ref-}"
    value="${value//\$\{$ref\}/$replacement}"
  done
  printf '%s' "$value"
}

load_env_file() {
  local env_file="${1:-.env}"
  local line key value

  [ -f "$env_file" ] || return 0

  while IFS= read -r line || [ -n "$line" ]; do
    line="${line%$'\r'}"
    [ -z "$(trim "$line")" ] && continue
    [[ "$line" =~ ^[[:space:]]*# ]] && continue
    [[ "$line" != *=* ]] && continue

    key="$(trim "${line%%=*}")"
    value="$(trim "${line#*=}")"

    if [ "${#value}" -ge 2 ]; then
      if [[ "$value" == \"*\" && "$value" == *\" ]]; then
        value="${value:1:${#value}-2}"
      elif [[ "$value" == \'*\' && "$value" == *\' ]]; then
        value="${value:1:${#value}-2}"
      fi
    fi

    # Backward-compatible with legacy .env entries that escaped "$" as "$$".
    value="${value//\$\$/\$}"
    value="$(expand_env_refs "$value")"
    export "$key=$value"
  done < "$env_file"
}

resolve_host_path() {
  local path="$1"
  if [[ "$path" = /* ]]; then
    printf '%s' "$path"
  elif [[ "$path" =~ ^[A-Za-z]:[\\/].* ]]; then
    printf '%s' "$path"
  else
    path="${path#./}"
    printf '%s' "$ROOT_DIR/$path"
  fi
}

prepare_docker_volume_dirs() {
  local volume_root
  volume_root="$(resolve_host_path "${RCLONE_MANAGER_DOCKER_VOLUMES_ROOT:-./.docker-volumes}")"

  mkdir -p \
    "$volume_root/app/logs" \
    "$volume_root/caddy/data" \
    "$volume_root/caddy/config" \
    "$volume_root/filebrowser/database" \
    "$volume_root/tailscale/var-lib"

  if [ "${RCLONE_MANAGER_DC_VERBOSE:-0}" = "1" ]; then
    echo "  DATA_ROOT : $volume_root"
  fi
}

# ── Load .env ─────────────────────────────────────────────────────
if [ -f "$ROOT_DIR/.env" ]; then
  load_env_file "$ROOT_DIR/.env"
else
  echo "⚠️  .env not found — using defaults. Run: cp .env.example .env" >&2
fi

# Normalize tags to comma-separated form without spaces.
if [ -n "${RCLONE_MANAGER_TAILSCALE_TAGS:-}" ]; then
  RCLONE_MANAGER_TAILSCALE_TAGS="$(printf '%s' "$RCLONE_MANAGER_TAILSCALE_TAGS" | tr -d '[:space:]')"
  export RCLONE_MANAGER_TAILSCALE_TAGS
fi

should_render_tailscale_serve() {
  case "${1:-}" in
    ""|up|start|restart|create|run|config|pull)
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

render_tailscale_serve_config() {
  local tailnet_domain app_port serve_dir serve_file serve_hostname
  tailnet_domain="$(trim "${RCLONE_MANAGER_TAILSCALE_TAILNET_DOMAIN:-}")"
  app_port="$(trim "${RCLONE_MANAGER_APP_PORT:-3000}")"
  serve_hostname="${RCLONE_MANAGER_PROJECT_NAME:-myapp}.${tailnet_domain}"

  if [ -z "$tailnet_domain" ] || [ "$tailnet_domain" = "-" ]; then
    echo "❌ RCLONE_MANAGER_ENABLE_TAILSCALE=true nhưng RCLONE_MANAGER_TAILSCALE_TAILNET_DOMAIN chưa có giá trị hợp lệ." >&2
    echo "   Chạy: npm run tailscale-init (hoặc điền RCLONE_MANAGER_TAILSCALE_TAILNET_DOMAIN trong .env)." >&2
    exit 1
  fi

  if ! [[ "$app_port" =~ ^[0-9]+$ ]] || [ "$app_port" -lt 1 ] || [ "$app_port" -gt 65535 ]; then
    echo "❌ RCLONE_MANAGER_APP_PORT không hợp lệ: $app_port" >&2
    exit 1
  fi

  serve_dir="$ROOT_DIR/tailscale"
  serve_file="$serve_dir/serve.json"
  mkdir -p "$serve_dir"
  cat > "$serve_file" <<EOF
{
  "TCP": {
    "443": {
      "HTTPS": true
    }
  },
  "Web": {
    "${serve_hostname}:443": {
      "Handlers": {
        "/": {
          "Proxy": "http://127.0.0.1:80"
        }
      }
    }
  }
}
EOF

  if [ "${RCLONE_MANAGER_DC_VERBOSE:-0}" = "1" ]; then
    echo "  TS_SERVE  : $serve_file (${serve_hostname} -> 127.0.0.1:80)"
  fi
}

# ── Detect OS (uname-based, not RUNNER_OS) ─────────────────────
UNAME_S="$(uname -s)"
UNAME_R="$(uname -r)"

if echo "$UNAME_R" | grep -qi "microsoft\|wsl"; then
  _OS="windows"
elif [ "$UNAME_S" = "Darwin" ]; then
  _OS="macos"
else
  _OS="${RCLONE_MANAGER_CUR_OS:-linux}"
fi

# ── Build --profile arguments from ENABLE_* flags ──────────────
PROFILE_ARGS=()

if [ "${RCLONE_MANAGER_ENABLE_DOZZLE:-true}" = "true" ]; then
  PROFILE_ARGS+=(--profile dozzle)
fi

if [ "${RCLONE_MANAGER_ENABLE_FILEBROWSER:-true}" = "true" ]; then
  PROFILE_ARGS+=(--profile filebrowser)
fi

if [ "${RCLONE_MANAGER_ENABLE_WEBSSH:-true}" = "true" ]; then
  if [ "$_OS" = "windows" ]; then
    PROFILE_ARGS+=(--profile webssh-windows)
  else
    PROFILE_ARGS+=(--profile webssh-linux)
  fi
fi

if [ "${RCLONE_MANAGER_ENABLE_TAILSCALE:-false}" = "true" ]; then
  if [ "$_OS" = "windows" ]; then
    PROFILE_ARGS+=(--profile tailscale-windows)
  else
    PROFILE_ARGS+=(--profile tailscale-linux)
  fi
fi

if [ "${RCLONE_MANAGER_ENABLE_TAILSCALE:-false}" = "true" ] && should_render_tailscale_serve "${1:-}"; then
  render_tailscale_serve_config
fi

prepare_docker_volume_dirs

# ── Compose file list ──────────────────────────────────────────
FILES=(
  -f "$ROOT_DIR/docker-compose/compose.core.yml"
  -f "$ROOT_DIR/docker-compose/compose.ops.yml"
  -f "$ROOT_DIR/docker-compose/compose.access.yml"
  -f "$ROOT_DIR/compose.apps.yml"
)

# ── Debug info (set RCLONE_MANAGER_DC_VERBOSE=1 to show) ─────────────────────
if [ "${RCLONE_MANAGER_DC_VERBOSE:-0}" = "1" ]; then
  echo "── dc.sh debug ──────────────────────────────────"
  echo "  OS        : $_OS"
  echo "  PROJECT   : ${RCLONE_MANAGER_PROJECT_NAME:-?}"
  echo "  RCLONE_MANAGER_DOMAIN    : ${RCLONE_MANAGER_DOMAIN:-?}"
  echo "  PROFILES  : ${PROFILE_ARGS[*]:-<none>}"
  echo "  FILES     : ${FILES[*]}"
  echo "─────────────────────────────────────────────────"
fi

# ── Execute ───────────────────────────────────────────────────
exec docker compose \
  "${FILES[@]}" \
  --project-directory "$ROOT_DIR" \
  --project-name "${RCLONE_MANAGER_PROJECT_NAME:-myapp}" \
  "${PROFILE_ARGS[@]}" \
  "$@"
```

### `docker-compose/scripts/validate-env.js`
```js
#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const envPath = path.resolve(process.cwd(), ".env");
if (!fs.existsSync(envPath)) {
  console.error("❌ .env file not found. Hãy tạo từ .env.example trước khi deploy.");
  process.exit(1);
}

function parseEnvFile(filePath) {
  const out = {};
  const raw = fs.readFileSync(filePath, "utf8");
  for (const line of raw.split("\n")) {
    const s = line.trim();
    if (!s || s.startsWith("#") || !s.includes("=")) continue;
    const idx = s.indexOf("=");
    const key = s.slice(0, idx).trim();
    let value = s.slice(idx + 1).trim();
    value = value.replace(/^['"]|['"]$/g, "");
    out[key] = value;
  }
  return out;
}

const env = parseEnvFile(envPath);
const errors = [];
const warnings = [];
const ok = [];

function isBool(v) {
  return v === "true" || v === "false";
}

function checkPort(key, required = true) {
  const v = env[key];
  if (!v) {
    if (required) errors.push(`${key} is required`);
    else warnings.push(`${key} not set (optional)`);
    return;
  }
  const n = Number(v);
  if (!Number.isInteger(n) || n < 1 || n > 65535) {
    errors.push(`${key} must be an integer in range 1..65535`);
    return;
  }
  ok.push(`${key}=${n}`);
}

function checkRequired(key, desc, validate) {
  const v = (env[key] || "").trim();
  if (!v) {
    errors.push(`${key} is required (${desc})`);
    return;
  }
  if (validate) {
    const msg = validate(v);
    if (msg) {
      errors.push(`${key}: ${msg}`);
      return;
    }
  }
  ok.push(`${key}=OK`);
}

function checkOptional(key, desc, validate) {
  const v = (env[key] || "").trim();
  if (!v) {
    warnings.push(`${key} optional: ${desc}`);
    return;
  }
  if (validate) {
    const msg = validate(v);
    if (msg) {
      errors.push(`${key}: ${msg}`);
      return;
    }
  }
  ok.push(`${key}=OK (optional)`);
}

function isValidDomain(v) {
  if (v.startsWith("http://") || v.startsWith("https://")) return "must not include http/https";
  if (v.endsWith("/")) return "must not end with /";
  if (!v.includes(".")) return "must be a valid domain, e.g. example.com";
  return null;
}

function isValidHttpsJsonUrl(v) {
  try {
    const u = new URL(v);
    return u.protocol === "https:" && u.pathname.endsWith(".json");
  } catch {
    return false;
  }
}

function buildAppHost(project, domain) {
  const p = (project || "").trim().toLowerCase();
  const d = (domain || "").trim().toLowerCase();
  if (p && d && (d === p || d.startsWith(`${p}.`))) {
    return domain;
  }
  return `${project}.${domain}`;
}

// 1) Required core env from compose files
checkRequired("RCLONE_MANAGER_PROJECT_NAME", "docker project/network + subdomain prefix", (v) =>
  /^[a-z0-9][a-z0-9-]*$/.test(v) ? null : "only lowercase letters, numbers, hyphen"
);
checkRequired("RCLONE_MANAGER_DOMAIN", "root domain", isValidDomain);
checkRequired("RCLONE_MANAGER_CADDY_EMAIL", "caddy email label", (v) => (v.includes("@") ? null : "invalid email"));
checkRequired("RCLONE_MANAGER_CADDY_AUTH_USER", "basic auth username");
checkRequired("RCLONE_MANAGER_CADDY_AUTH_HASH", "basic auth bcrypt hash", (v) => {
  const raw = v.replace(/\$\$/g, "$");
  return raw.startsWith("$2a$") || raw.startsWith("$2b$") ? null : "must be bcrypt hash ($2a$/$2b$...)";
});
checkPort("RCLONE_MANAGER_APP_PORT", true);

// 2) Optional env from compose files
checkPort("RCLONE_MANAGER_APP_HOST_PORT", false);
checkPort("RCLONE_MANAGER_DOZZLE_HOST_PORT", false);
checkPort("RCLONE_MANAGER_FILEBROWSER_HOST_PORT", false);
checkPort("RCLONE_MANAGER_WEBSSH_HOST_PORT", false);
checkOptional("RCLONE_MANAGER_NODE_ENV", "app runtime env");
checkOptional("RCLONE_MANAGER_HEALTH_PATH", "health endpoint path", (v) => (v.startsWith("/") ? null : "must start with '/'"));
checkOptional("RCLONE_MANAGER_DOCKER_SOCK", "docker socket path override");

// 3) Flags
for (const key of ["RCLONE_MANAGER_ENABLE_DOZZLE", "RCLONE_MANAGER_ENABLE_FILEBROWSER", "RCLONE_MANAGER_ENABLE_WEBSSH", "RCLONE_MANAGER_ENABLE_TAILSCALE"]) {
  const v = env[key];
  if (!v) {
    warnings.push(`${key} not set -> using default from scripts/compose`);
    continue;
  }
  if (!isBool(v)) errors.push(`${key} must be true|false`);
  else ok.push(`${key}=${v}`);
}

// 4) Files required by cloudflared mounts
const cfConfig = path.resolve(process.cwd(), "cloudflared/config.yml");
const cfCreds = path.resolve(process.cwd(), "cloudflared/credentials.json");
if (!fs.existsSync(cfConfig)) errors.push("cloudflared/config.yml missing (cloudflared mount required)");
else ok.push("cloudflared/config.yml present");
if (!fs.existsSync(cfCreds)) errors.push("cloudflared/credentials.json missing (cloudflared mount required)");
else ok.push("cloudflared/credentials.json present");

// 5) Optional webssh runtime tuning vars
if ((env.RCLONE_MANAGER_ENABLE_WEBSSH || "true") === "true") {
  if (!env.RCLONE_MANAGER_CUR_WHOAMI) warnings.push("RCLONE_MANAGER_CUR_WHOAMI optional (webssh linux default runner)");
  if (!env.RCLONE_MANAGER_CUR_WORK_DIR) warnings.push("RCLONE_MANAGER_CUR_WORK_DIR optional (webssh linux default /home/runner)");
  if (!env.RCLONE_MANAGER_SHELL) warnings.push("RCLONE_MANAGER_SHELL optional (webssh linux default /bin/bash)");
}

// 6) Tailscale + keep-ip rules based on compose.access.yml
if (env.RCLONE_MANAGER_ENABLE_TAILSCALE === "true") {
  checkRequired("RCLONE_MANAGER_TAILSCALE_AUTHKEY", "required by tailscale service", (v) =>
    v.startsWith("tskey-") ? null : "must start with tskey-"
  );
  checkRequired("RCLONE_MANAGER_TAILSCALE_TAILNET_DOMAIN", "required by dc.sh to render tailscale/serve.json", (v) =>
    v && v !== "-" ? null : "must not be empty or '-'"
  );
  checkOptional("RCLONE_MANAGER_TAILSCALE_TAGS", "advertise tags", (v) =>
    /^tag:[A-Za-z0-9][A-Za-z0-9_-]*(,tag:[A-Za-z0-9][A-Za-z0-9_-]*)*$/.test(v)
      ? null
      : "format must be tag:a,tag:b"
  );

  const keepIp = (env.RCLONE_MANAGER_TAILSCALE_KEEP_IP_ENABLE || "false").trim();
  if (!isBool(keepIp)) errors.push("RCLONE_MANAGER_TAILSCALE_KEEP_IP_ENABLE must be true|false");

  const keepRemove = (env.RCLONE_MANAGER_TAILSCALE_KEEP_IP_REMOVE_HOSTNAME_ENABLE || "").trim();
  if (keepRemove && !isBool(keepRemove)) {
    errors.push("RCLONE_MANAGER_TAILSCALE_KEEP_IP_REMOVE_HOSTNAME_ENABLE must be true|false when provided");
  }

  if (keepIp === "true") {
    checkRequired("RCLONE_MANAGER_TAILSCALE_KEEP_IP_FIREBASE_URL", "required when keep-ip enabled", (v) =>
      isValidHttpsJsonUrl(v) ? null : "must be https URL ending with .json"
    );
    checkOptional("RCLONE_MANAGER_TAILSCALE_KEEP_IP_CERTS_DIR", "certs dir path");
    checkOptional("RCLONE_MANAGER_TAILSCALE_KEEP_IP_INTERVAL_SEC", "backup interval seconds", (v) => {
      const n = Number(v);
      return Number.isInteger(n) && n >= 5 ? null : "must be integer >= 5";
    });
  } else {
    warnings.push("RCLONE_MANAGER_TAILSCALE_KEEP_IP_ENABLE=false -> keep-ip backup/restore disabled");
  }

  const removeHostnameEnabled = keepRemove ? keepRemove === "true" : keepIp === "true";
  if (removeHostnameEnabled) {
    if (!env.RCLONE_MANAGER_TAILSCALE_CLIENTID) {
      errors.push("remove-hostname enabled requires RCLONE_MANAGER_TAILSCALE_CLIENTID");
    }
    const authKey = (env.RCLONE_MANAGER_TAILSCALE_AUTHKEY || "").trim();
    if (!authKey) {
      errors.push("remove-hostname enabled requires RCLONE_MANAGER_TAILSCALE_AUTHKEY");
    } else if (!authKey.startsWith("tskey-client-")) {
      errors.push("remove-hostname requires RCLONE_MANAGER_TAILSCALE_AUTHKEY in tskey-client-* format");
    }
  }
}

const project = env.RCLONE_MANAGER_PROJECT_NAME || "<project>";
const domain = env.RCLONE_MANAGER_DOMAIN || "<domain>";
const host = env.RCLONE_MANAGER_PROJECT_NAME || "myapp";
const tailnet = env.RCLONE_MANAGER_TAILSCALE_TAILNET_DOMAIN || "tailnet.local";
const appHost = buildAppHost(project, domain);
ok.push(`subdomain preview: app=${appHost}`);
if ((env.RCLONE_MANAGER_ENABLE_DOZZLE || "true") === "true") ok.push(`subdomain preview: logs=logs.${appHost}`);
if ((env.RCLONE_MANAGER_ENABLE_FILEBROWSER || "true") === "true") ok.push(`subdomain preview: files=files.${appHost}`);
if ((env.RCLONE_MANAGER_ENABLE_WEBSSH || "true") === "true") ok.push(`subdomain preview: ttyd=ttyd.${appHost}`);
if (env.RCLONE_MANAGER_ENABLE_TAILSCALE === "true") {
  const dozzlePort = env.RCLONE_MANAGER_DOZZLE_HOST_PORT || "18080";
  const filesPort = env.RCLONE_MANAGER_FILEBROWSER_HOST_PORT || "18081";
  const sshPort = env.RCLONE_MANAGER_WEBSSH_HOST_PORT || "17681";
  ok.push(`tailnet host: https://${host}.${tailnet}`);
  if ((env.RCLONE_MANAGER_ENABLE_DOZZLE || "true") === "true") ok.push(`tailnet dozzle: http://${host}.${tailnet}:${dozzlePort}`);
  if ((env.RCLONE_MANAGER_ENABLE_FILEBROWSER || "true") === "true") ok.push(`tailnet filebrowser: http://${host}.${tailnet}:${filesPort}`);
  if ((env.RCLONE_MANAGER_ENABLE_WEBSSH || "true") === "true") ok.push(`tailnet webssh: http://${host}.${tailnet}:${sshPort}`);
}

console.log("\n📋 ENV VALIDATION REPORT");
console.log("─".repeat(60));

if (ok.length) {
  console.log(`\n✅ Valid (${ok.length})`);
  for (const s of ok) console.log(`  - ${s}`);
}
if (warnings.length) {
  console.log(`\n⚠️ Warnings (${warnings.length})`);
  for (const s of warnings) console.log(`  - ${s}`);
}
if (errors.length) {
  console.log(`\n❌ Errors (${errors.length})`);
  for (const s of errors) console.log(`  - ${s}`);
  console.log("\nDừng triển khai. Hãy sửa lỗi bắt buộc trước khi chạy up.\n");
  process.exit(1);
}

console.log("\n✅ Env hợp lệ. Có thể triển khai.\n");
```
<!-- END:EMBEDDED_FILES -->
