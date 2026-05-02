# WebSSH services (`docker-compose/compose.ops.yml`)

## Vai trò
- Terminal qua web để truy cập shell host.

## Kích hoạt
- `RCLONE_MANAGER_ENABLE_WEBSSH=true`.
- Linux: profile `webssh-linux`.
- Windows/WSL: profile `webssh-windows`.

## Linux variant (`webssh`)
- Build từ `services/webssh`.
- Dùng `ttyd` gọi `ssh` vào `host.docker.internal`.
- ENV liên quan:
  - `RCLONE_MANAGER_CUR_WHOAMI` (default runner)
  - `RCLONE_MANAGER_CUR_WORK_DIR` (default /home/runner)
  - `RCLONE_MANAGER_SHELL` (default /bin/bash)

## Windows variant (`webssh-windows`)
- Image `alpine/socat` bridge cổng 7681 vào host.
- Cần host có ttyd chạy sẵn.

## Route
- `ttyd.${RCLONE_MANAGER_PROJECT_NAME}.${RCLONE_MANAGER_DOMAIN}`

## Truy cập qua Tailscale
- URL: `http://${RCLONE_MANAGER_PROJECT_NAME}.${RCLONE_MANAGER_TAILSCALE_TAILNET_DOMAIN}:${RCLONE_MANAGER_WEBSSH_HOST_PORT:-17681}`
- Cổng host: `RCLONE_MANAGER_WEBSSH_HOST_PORT` (default `17681`).
