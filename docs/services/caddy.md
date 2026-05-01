# Caddy service (`docker-compose/compose.core.yml`)

## Vai trò
- Reverse proxy động từ Docker labels.
- Gom route cho app + dịch vụ ops.

## Cấu hình chính
- Image: `lucaslorentz/caddy-docker-proxy:2.9.1-alpine`
- Port publish: `80:80`
- Volumes:
  - Docker socket read-only
  - `${DOCKER_VOLUMES_ROOT:-./.docker-volumes}/caddy/data:/data`
  - `${DOCKER_VOLUMES_ROOT:-./.docker-volumes}/caddy/config:/config`
- Label global:
  - `caddy.email=${CADDY_EMAIL}`
  - `caddy.auto_https=disable_redirects`

## ENV liên quan
- `CADDY_EMAIL` (**bắt buộc**): email đăng ký cert.
- `DOCKER_SOCK` (optional): override đường dẫn Docker socket.
- `DOCKER_VOLUMES_ROOT` (optional): root thư mục runtime data trên host.
- `PROJECT_NAME` (**bắt buộc**): dùng để định danh ingress network `${PROJECT_NAME}_net`.

## Lưu ý
- Public traffic hiện đi qua Cloudflare Tunnel nên upstream từ cloudflared vào Caddy bằng HTTP nội bộ.
- Basic auth cho các service ops được khai báo ở labels của từng service (`CADDY_AUTH_USER`, `CADDY_AUTH_HASH`).
- App chính không dùng Caddy Basic Auth vì đã có Google Auth nội bộ (`REQUIRE_GOOGLE_AUTH=true`). Tránh double-auth làm frontend load được nhưng `/health` hoặc API bị browser basic-auth prompt lặp.
- Label `caddy.basic_auth=` cố ý không truyền matcher để bảo vệ toàn bộ virtual host.
- `CADDY_AUTH_HASH` phải là bcrypt hash thật và đặt trong dấu nháy đơn trong `.env`, ví dụ `CADDY_AUTH_HASH='$2a$14$...'`. Không dùng dạng `$$2a$$...`; nếu cần literal `$`, bọc toàn bộ hash bằng nháy đơn.
