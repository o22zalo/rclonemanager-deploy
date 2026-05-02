# deploy.md

Tài liệu triển khai chuẩn theo **codebase hiện tại**.

## 1) Luồng triển khai chuẩn

1. Chuẩn bị `.env` (không dựa mù quáng vào `.env.example`).
2. Cấu hình Cloudflare Tunnel (`cloudflared/config.yml` + `credentials.json`).
3. Validate môi trường bằng script `docker-compose/scripts/validate-env.js`.
4. Deploy bằng `dc.sh` (qua npm scripts).
5. Kiểm tra health, logs, route công khai và route nội bộ.

## 2) Compose layers

### Core
- `docker-compose/compose.core.yml`
- Chứa `caddy` + `cloudflared`.
- Luôn được nạp.

### Ops
- `docker-compose/compose.ops.yml`
- `dozzle`, `filebrowser`, `webssh`, `webssh-windows`.
- Bật/tắt qua `RCLONE_MANAGER_ENABLE_DOZZLE`, `RCLONE_MANAGER_ENABLE_FILEBROWSER`, `RCLONE_MANAGER_ENABLE_WEBSSH`.

### Access
- `docker-compose/compose.access.yml`
- `tailscale-linux`, `tailscale-windows`, keep-ip prepare/backup loops.
- Bật/tắt qua `RCLONE_MANAGER_ENABLE_TAILSCALE`.

### Apps
- `compose.apps.yml`
- Service `app` mặc định build từ `services/app`.

## 3) Các env bắt buộc (hard-stop)

Các biến dưới đây nếu thiếu/sai sẽ **dừng deploy** ở bước validate:

- `RCLONE_MANAGER_PROJECT_NAME`
- `RCLONE_MANAGER_DOMAIN`
- `RCLONE_MANAGER_CADDY_EMAIL`
- `RCLONE_MANAGER_CADDY_AUTH_USER`
- `RCLONE_MANAGER_CADDY_AUTH_HASH` (bcrypt)
- `RCLONE_MANAGER_APP_PORT`

Thêm nữa, do mount bắt buộc trong `cloudflared`:

- `cloudflared/config.yml` phải tồn tại.
- `cloudflared/credentials.json` phải tồn tại.

Nếu `RCLONE_MANAGER_ENABLE_TAILSCALE=true`, bắt buộc thêm:

- `RCLONE_MANAGER_TAILSCALE_AUTHKEY`
- `RCLONE_MANAGER_TAILSCALE_TAILNET_DOMAIN`

Nếu `RCLONE_MANAGER_TAILSCALE_KEEP_IP_ENABLE=true`, bắt buộc thêm:

- `RCLONE_MANAGER_TAILSCALE_KEEP_IP_FIREBASE_URL` (https + kết thúc `.json`).

Nếu `RCLONE_MANAGER_TAILSCALE_KEEP_IP_REMOVE_HOSTNAME_ENABLE=true`, bắt buộc thêm:

- `RCLONE_MANAGER_TAILSCALE_CLIENTID`
- `RCLONE_MANAGER_TAILSCALE_AUTHKEY` theo format `tskey-client-...`

## 4) Các env optional nhưng nên cấu hình

- `RCLONE_MANAGER_APP_HOST_PORT`: mở truy cập localhost trực tiếp.
- `RCLONE_MANAGER_NODE_ENV`: mặc định `production`.
- `RCLONE_MANAGER_HEALTH_PATH`: mặc định `/health`.
- `RCLONE_MANAGER_DOCKER_SOCK`: đường dẫn docker socket nếu khác mặc định.
- `RCLONE_MANAGER_TAILSCALE_TAGS`: mặc định `tag:container`.
- `RCLONE_MANAGER_TAILSCALE_KEEP_IP_INTERVAL_SEC`: mặc định `30`.
- `RCLONE_MANAGER_CUR_WHOAMI`, `RCLONE_MANAGER_CUR_WORK_DIR`, `RCLONE_MANAGER_SHELL`: hỗ trợ webssh Linux thân thiện hơn.
- `RCLONE_MANAGER_DOZZLE_HOST_PORT` (default `18080`): cổng localhost cho Dozzle.
- `RCLONE_MANAGER_FILEBROWSER_HOST_PORT` (default `18081`): cổng localhost cho Filebrowser.
- `RCLONE_MANAGER_WEBSSH_HOST_PORT` (default `17681`): cổng localhost cho WebSSH.

## 5) Cấu hình Cloudflare Tunnel (chi tiết kỹ thuật)

1. Tạo tunnel trên Cloudflare Zero Trust.
2. Tải `credentials.json` đặt tại `cloudflared/credentials.json`.
3. Cập nhật `cloudflared/config.yml`:
   - `tunnel`: tunnel id
   - `credentials-file`: `/etc/cloudflared/credentials.json`
   - `ingress`: route hostname -> `http://caddy:80`
4. Trên DNS Cloudflare, các record hostname phải trỏ đúng tunnel.

Mọi request public đi theo chuỗi:

`Internet -> Cloudflare Edge -> cloudflared -> caddy -> app/ops service`

## 6) Caddy labels và routing

Routing dựa labels trong compose:

- App: `${RCLONE_MANAGER_PROJECT_NAME}.${RCLONE_MANAGER_DOMAIN}` (+ alias `main.${RCLONE_MANAGER_DOMAIN}`, `${RCLONE_MANAGER_DOMAIN}`)
- Dozzle: `logs.${RCLONE_MANAGER_PROJECT_NAME}.${RCLONE_MANAGER_DOMAIN}`
- Filebrowser: `files.${RCLONE_MANAGER_PROJECT_NAME}.${RCLONE_MANAGER_DOMAIN}`
- WebSSH: `ttyd.${RCLONE_MANAGER_PROJECT_NAME}.${RCLONE_MANAGER_DOMAIN}`

Auth cơ bản dùng:

- User: `RCLONE_MANAGER_CADDY_AUTH_USER`
- Hash: `RCLONE_MANAGER_CADDY_AUTH_HASH`

## 7) Lệnh deploy đề xuất

```bash
npm run dockerapp-validate:env
npm run dockerapp-validate:compose
npm run dockerapp-exec:up
npm run dockerapp-exec:ps
npm run dockerapp-exec:logs
```

## Truy cập dịch vụ qua Tailscale hostname + port

Khi `RCLONE_MANAGER_ENABLE_TAILSCALE=true`, bạn có thể dùng hostname tailnet của node:

- `http://${RCLONE_MANAGER_PROJECT_NAME}.${RCLONE_MANAGER_TAILSCALE_TAILNET_DOMAIN}:${RCLONE_MANAGER_DOZZLE_HOST_PORT:-18080}` → Dozzle
- `http://${RCLONE_MANAGER_PROJECT_NAME}.${RCLONE_MANAGER_TAILSCALE_TAILNET_DOMAIN}:${RCLONE_MANAGER_FILEBROWSER_HOST_PORT:-18081}` → Filebrowser
- `http://${RCLONE_MANAGER_PROJECT_NAME}.${RCLONE_MANAGER_TAILSCALE_TAILNET_DOMAIN}:${RCLONE_MANAGER_WEBSSH_HOST_PORT:-17681}` → WebSSH

Ghi chú:
- Các cổng này bind `127.0.0.1` trên host; truy cập qua tailnet phụ thuộc cách bạn chạy Tailscale (container host-network Linux hay host-level trên Windows/WSL).
- Nếu không truy cập được qua tailnet, kiểm tra firewall host và trạng thái route/Tailscale.

## 8) Kiểm tra sau deploy

- `docker compose ps` tất cả service expected đều `running`/`healthy`.
- Truy cập `http(s)://<project>.<domain>` qua tunnel.
- Kiểm tra endpoint health: `/<RCLONE_MANAGER_HEALTH_PATH>`.
- Nếu bật Tailscale: truy cập `https://<RCLONE_MANAGER_PROJECT_NAME>.<RCLONE_MANAGER_TAILSCALE_TAILNET_DOMAIN>`.

## 9) Tài liệu từng dịch vụ

- `docs/services/caddy.md`
- `docs/services/cloudflared.md`
- `docs/services/app.md`
- `docs/services/dozzle.md`
- `docs/services/filebrowser.md`
- `docs/services/webssh.md`
- `docs/services/tailscale.md`
