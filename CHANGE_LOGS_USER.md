# CHANGE LOGS (User-facing)

---

## [2.0.0] — 2026-04-09 — Modular Stack Template

### What's New

**Deploy any Docker image in minutes**
Change two lines in `.env` (`RCLONE_MANAGER_APP_IMAGE` and `RCLONE_MANAGER_APP_PORT`) and your app is live — no YAML editing required.

**Feature flags — enable what you need**
Turn ops tools on or off with simple env vars:

```env
RCLONE_MANAGER_ENABLE_DOZZLE=true
RCLONE_MANAGER_ENABLE_FILEBROWSER=true
RCLONE_MANAGER_ENABLE_WEBSSH=false
RCLONE_MANAGER_ENABLE_TAILSCALE=false
```

**Subdomains auto-generated**
Set `RCLONE_MANAGER_PROJECT_NAME=gitea` and `RCLONE_MANAGER_DOMAIN=example.com` once. All service URLs follow automatically:

- `gitea.example.com` → your app
- `logs.gitea.example.com` → log viewer
- `files.gitea.example.com` → file manager
- `ttyd.gitea.example.com` → web terminal

**One-command validation before deploy**

```bash
npm run dockerapp-validate:all
```

Checks env vars, Tailscale key format, and compose YAML — all at once.

**One-command deploy**

```bash
npm run dockerapp-exec:up
```

### What Changed (migration from v1)

If upgrading from the previous `docker-compose.yml` setup:

1. Replace `SUBDOMAIN_APP/DOZZLE/FILEBROWSER/WEBSSH` with just `RCLONE_MANAGER_PROJECT_NAME`
2. Replace `TAILSCALE_CLIENT_SECRET` with `RCLONE_MANAGER_TAILSCALE_AUTHKEY`
3. Replace `docker compose up` with `bash docker-compose/scripts/dc.sh up` or `npm run dockerapp-exec:up`
4. Update `cloudflared/config.yml` manually from `cloudflared/config.yml.example` if you use Cloudflare Tunnel

See `docs/DEPLOY.md` for the full migration guide.

---
