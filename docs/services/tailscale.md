# Tailscale services (`docker-compose/compose.access.yml`)

## Vai trò
- Truy cập riêng tư qua tailnet cho môi trường nội bộ.
- Kèm cơ chế keep-ip backup/restore state.
- Toàn bộ state/certs lưu trên host tại `${RCLONE_MANAGER_DOCKER_VOLUMES_ROOT:-./.docker-volumes}/tailscale/var-lib`.

## Kích hoạt
- `RCLONE_MANAGER_ENABLE_TAILSCALE=true`.
- Linux: `tailscale-linux` + keep-ip linux jobs + `tailscale-watchdog-linux`.
- Windows: `tailscale-windows` + keep-ip windows jobs + `tailscale-watchdog-windows`.

## ENV bắt buộc khi bật
- `RCLONE_MANAGER_TAILSCALE_AUTHKEY`
- `RCLONE_MANAGER_TAILSCALE_TAILNET_DOMAIN`

## ENV optional quan trọng
- `RCLONE_MANAGER_DOCKER_VOLUMES_ROOT` (default `./.docker-volumes`)
- `RCLONE_MANAGER_TAILSCALE_TAGS` (default `tag:container`)
- `RCLONE_MANAGER_TAILSCALE_ACCEPT_DNS` (`true|false`, default `false`)
- `RCLONE_MANAGER_TAILSCALE_KEEP_IP_ENABLE` (`true|false`)
- `RCLONE_MANAGER_TAILSCALE_KEEP_IP_FIREBASE_URL` (bắt buộc nếu keep-ip bật)
- `RCLONE_MANAGER_TAILSCALE_KEEP_IP_CERTS_DIR` (default `/var/lib/tailscale/certs`)
- `RCLONE_MANAGER_TAILSCALE_KEEP_IP_INTERVAL_SEC` (default 30)
- `RCLONE_MANAGER_TAILSCALE_KEEP_IP_REMOVE_HOSTNAME_ENABLE`
- `RCLONE_MANAGER_TAILSCALE_CLIENTID`
- `RCLONE_MANAGER_TAILSCALE_AUTHKEY` (dùng cho join tailnet + API token flow)
- `RCLONE_MANAGER_TAILSCALE_WATCHDOG_MODE` (`monitor|heal`, default compose `heal`)
- `RCLONE_MANAGER_TAILSCALE_WATCHDOG_INTERVAL_SEC` (default 30)
- `RCLONE_MANAGER_TAILSCALE_WATCHDOG_ALERT_EVERY` (default 5)
- `RCLONE_MANAGER_TAILSCALE_WATCHDOG_LOG_OK_EVERY` (default 10)
- `RCLONE_MANAGER_TAILSCALE_WATCHDOG_RECONNECT_MIN_SEC` (default 60)
- `RCLONE_MANAGER_TAILSCALE_WATCHDOG_HEAL_AFTER_STREAK` (default 2)
- `RCLONE_MANAGER_TAILSCALE_WATCHDOG_UP_ACCEPT_DNS` (`true|false`, default `false`)
- `RCLONE_MANAGER_TAILSCALE_SOCKET` (default `/tmp/tailscaled.sock`)

## Keep-IP logic
- `prepare`: khôi phục state/certs trước khi daemon chạy.
- `backup-loop`: định kỳ đẩy state/certs lên Firebase RTDB.
- Nếu bật `REMOVE_HOSTNAME`, script sẽ gọi API để dọn hostname cũ tránh conflict IP.

## Watchdog monitoring + auto-heal
- Script: `tailscale/tailscale-watchdog.js`
- Chay: `npm run tailscale-watchdog`
- Luu y: watchdog can truy cap duoc Tailscale local API socket (`RCLONE_MANAGER_TAILSCALE_SOCKET`, mac dinh `/tmp/tailscaled.sock`) trong runtime dang chay `tailscaled`.
- Watchdog sidecar build tu `tailscale/Dockerfile.watchdog` (co san `tailscale` CLI de auto-heal).
- Mac dinh compose: `RCLONE_MANAGER_TAILSCALE_WATCHDOG_MODE=heal` + `RCLONE_MANAGER_TAILSCALE_WATCHDOG_AUTO_RECONNECT=true`.
- Mac dinh reconnect dung `--accept-dns=false` de tranh loi ghi `/etc/resolv.conf` trong container.
- Log co ma su kien de grep nhanh root cause:
- `TSWD_SOCKET_UNREACHABLE`: khong noi duoc local API socket
- `TSWD_NOT_RUNNING`: `BackendState`/`Self.Online` dang loi, kem health + netcheck + DNS snapshot
- `TSWD_DNS_MAGIC_MISSING`: thieu `100.100.100.100` trong `resolv.conf`
- `TSWD_HEALTH_WARN`: canh bao tu `status.Health[]`
- `TSWD_SELF_IDENTITY`: node id/dns name/hostname hien tai de doi chieu dung record tren Tailscale admin
- `TSWD_RECONNECT_WAIT`: node dang loi nhung chua du streak de goi heal
- `TSWD_RECOVERED`: node quay lai trang thai online

## Kiểm tra
- Container tailscale chạy ổn định.
- Có thể resolve/truy cập `https://${RCLONE_MANAGER_PROJECT_NAME}.${RCLONE_MANAGER_TAILSCALE_TAILNET_DOMAIN}`.

## Hostname + port cho dịch vụ Ops
- Dozzle: `http://${RCLONE_MANAGER_PROJECT_NAME}.${RCLONE_MANAGER_TAILSCALE_TAILNET_DOMAIN}:${RCLONE_MANAGER_DOZZLE_HOST_PORT:-18080}`
- Filebrowser: `http://${RCLONE_MANAGER_PROJECT_NAME}.${RCLONE_MANAGER_TAILSCALE_TAILNET_DOMAIN}:${RCLONE_MANAGER_FILEBROWSER_HOST_PORT:-18081}`
- WebSSH: `http://${RCLONE_MANAGER_PROJECT_NAME}.${RCLONE_MANAGER_TAILSCALE_TAILNET_DOMAIN}:${RCLONE_MANAGER_WEBSSH_HOST_PORT:-17681}`
