# Caddy service (`docker-compose/compose.core.yml`)

## Vai trò
- Reverse proxy động từ Docker labels.
- Gom route cho app + dịch vụ ops.

## Cấu hình chính
- Image: `lucaslorentz/caddy-docker-proxy:2.9.1-alpine`
- Port publish: `80:80`
- Volumes:
  - Docker socket read-only
  - `${RCLONE_MANAGER_DOCKER_VOLUMES_ROOT:-./.docker-volumes}/caddy/data:/data`
  - `${RCLONE_MANAGER_DOCKER_VOLUMES_ROOT:-./.docker-volumes}/caddy/config:/config`
- Label global:
  - `caddy.email=${RCLONE_MANAGER_CADDY_EMAIL}`
  - `caddy.auto_https=disable_redirects`

## ENV liên quan
- `RCLONE_MANAGER_CADDY_EMAIL` (**bắt buộc**): email đăng ký cert.
- `RCLONE_MANAGER_DOCKER_SOCK` (optional): override đường dẫn Docker socket.
- `RCLONE_MANAGER_DOCKER_VOLUMES_ROOT` (optional): root thư mục runtime data trên host.
- `RCLONE_MANAGER_PROJECT_NAME` (**bắt buộc**): dùng để định danh ingress network `${RCLONE_MANAGER_PROJECT_NAME}_net`.

## Lưu ý
- Public traffic hiện đi qua Cloudflare Tunnel nên upstream từ cloudflared vào Caddy bằng HTTP nội bộ.
- Basic auth cho các service ops được khai báo ở labels của từng service (`RCLONE_MANAGER_CADDY_AUTH_USER`, `RCLONE_MANAGER_CADDY_AUTH_HASH`).
- App chính không dùng Caddy Basic Auth vì đã có Google Auth nội bộ (`RCLONE_MANAGER_REQUIRE_GOOGLE_AUTH=true`). Tránh double-auth làm frontend load được nhưng `/health` hoặc API bị browser basic-auth prompt lặp.
- Label `caddy.basic_auth=` cố ý không truyền matcher để bảo vệ toàn bộ virtual host.
- `RCLONE_MANAGER_CADDY_AUTH_HASH` phải là bcrypt hash thật và đặt trong dấu nháy đơn trong `.env`, ví dụ `RCLONE_MANAGER_CADDY_AUTH_HASH='$2a$14$...'`. Không dùng dạng `$$2a$$...`; nếu cần literal `$`, bọc toàn bộ hash bằng nháy đơn.
