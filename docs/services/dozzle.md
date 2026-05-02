# Dozzle service (`docker-compose/compose.ops.yml`)

## Vai trò
- Quan sát log realtime cho containers.

## Kích hoạt
- Bật khi `RCLONE_MANAGER_ENABLE_DOZZLE=true`.
- `dc.sh` sẽ thêm `--profile dozzle`.

## Cấu hình
- Image: `amir20/dozzle:latest`
- Mount docker socket read-only.
- Hostname route: `logs.${RCLONE_MANAGER_PROJECT_NAME}.${RCLONE_MANAGER_DOMAIN}`.

## ENV liên quan
- `RCLONE_MANAGER_ENABLE_DOZZLE`: bật/tắt.
- `RCLONE_MANAGER_DOCKER_SOCK`: đường dẫn socket.
- `RCLONE_MANAGER_PROJECT_NAME`, `RCLONE_MANAGER_DOMAIN`, `RCLONE_MANAGER_CADDY_AUTH_USER`, `RCLONE_MANAGER_CADDY_AUTH_HASH`.

## Truy cập qua Tailscale
- URL: `http://${RCLONE_MANAGER_PROJECT_NAME}.${RCLONE_MANAGER_TAILSCALE_TAILNET_DOMAIN}:${RCLONE_MANAGER_DOZZLE_HOST_PORT:-18080}`
- Cổng host: `RCLONE_MANAGER_DOZZLE_HOST_PORT` (default `18080`).
