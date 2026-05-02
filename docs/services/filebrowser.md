# Filebrowser service (`docker-compose/compose.ops.yml`)

## Vai trò
- Duyệt file/log trên web.

## Kích hoạt
- `RCLONE_MANAGER_ENABLE_FILEBROWSER=true` -> profile `filebrowser`.

## Cấu hình
- Image: `filebrowser/filebrowser:v2.30.0`
- Command chạy `--noauth` (đã bảo vệ bên ngoài bằng Caddy basic auth).
- Mount:
  - `.:/srv/workspace`
  - `${RCLONE_MANAGER_DOCKER_VOLUMES_ROOT:-./.docker-volumes}:/srv/docker-volumes:ro`
  - `./logs:/srv/logs:ro`
  - `${RCLONE_MANAGER_DOCKER_VOLUMES_ROOT:-./.docker-volumes}/filebrowser/database:/database`

## ENV liên quan
- `RCLONE_MANAGER_ENABLE_FILEBROWSER`
- `RCLONE_MANAGER_DOCKER_VOLUMES_ROOT` (optional, default `./.docker-volumes`)
- `RCLONE_MANAGER_PROJECT_NAME`, `RCLONE_MANAGER_DOMAIN`, `RCLONE_MANAGER_CADDY_AUTH_USER`, `RCLONE_MANAGER_CADDY_AUTH_HASH`

## Cảnh báo
- Vì mount toàn bộ project + runtime data nên cần kiểm soát chặt user/password basic auth.

## Truy cập qua Tailscale
- URL: `http://${RCLONE_MANAGER_PROJECT_NAME}.${RCLONE_MANAGER_TAILSCALE_TAILNET_DOMAIN}:${RCLONE_MANAGER_FILEBROWSER_HOST_PORT:-18081}`
- Cổng host: `RCLONE_MANAGER_FILEBROWSER_HOST_PORT` (default `18081`).
