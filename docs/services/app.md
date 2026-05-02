# App service (`compose.apps.yml`)

## Vai trò
- Service ứng dụng chính, build rclone OAuth Manager từ `services/app`.
- Serve frontend SPA/PWA từ `public/`, API Express từ `src/`, và OAuth callback trên cùng port.
- Image có cài `rclone` để chạy lệnh rclone thật bên trong container.

## Cấu hình chính
- Service name: `app`.
- Image local tag: `${RCLONE_MANAGER_PROJECT_NAME}-app:local`.
- Build context: `./services/app`.
- Internal app port: `${RCLONE_MANAGER_APP_PORT}`.
- Host publish: `127.0.0.1:${RCLONE_MANAGER_APP_HOST_PORT}:${RCLONE_MANAGER_APP_PORT}`.
- Healthcheck: `wget http://localhost:${RCLONE_MANAGER_APP_PORT}${RCLONE_MANAGER_HEALTH_PATH}`.
- Runtime data:
  - `${RCLONE_MANAGER_DOCKER_VOLUMES_ROOT:-./.docker-volumes}/app/logs:/app/logs`
  - `${RCLONE_MANAGER_DOCKER_VOLUMES_ROOT:-./.docker-volumes}/app/data:/data`

## ENV bắt buộc
- `RCLONE_MANAGER_APP_PORT`: port app lắng nghe trong container.
- `RCLONE_MANAGER_PROJECT_NAME`, `RCLONE_MANAGER_DOMAIN`: tạo hostname public.

## ENV app optional
- `RCLONE_MANAGER_APP_HOST_PORT` (default `53682`): port localhost trên host machine.
- `RCLONE_MANAGER_NODE_ENV` (default `production`).
- `RCLONE_MANAGER_HEALTH_PATH` (default `/health`).
- `RCLONE_MANAGER_FRONTEND_URL`: base URL dùng sau OAuth callback. Để trống thì app redirect về cùng host nhận callback.
- `RCLONE_MANAGER_ALLOWED_ORIGINS`: danh sách origin CORS, phân tách bằng dấu phẩy. Để trống cho UI cùng origin.
- `RCLONE_MANAGER_BACKEND_API_KEY`: key optional cho client ngoài gọi API backend qua header `x-api-key`. Frontend bundled không hiển thị, lưu, hoặc gửi key này.
- `RCLONE_MANAGER_REQUIRE_GOOGLE_AUTH`: bật/tắt Firebase Google Auth cho các API backend được bảo vệ (`true` mặc định).
- `RCLONE_MANAGER_AUTH_SESSION_SECRET`, `RCLONE_MANAGER_AUTH_SESSION_TTL_MS`: ký và đặt hạn phiên Google auth nội bộ.
- `GOOGLE_AUTH_FIREBASE_*`: Firebase Web app config dùng cho Google Sign-In qua Firebase Auth.
- `RCLONE_MANAGER_ALLOWED_GMAILS`: danh sách Gmail được phép đăng nhập, phân tách bằng dấu phẩy.
- `RCLONE_MANAGER_FIREBASE_DATABASE_URL`: Firebase Realtime Database root URL.
- `RCLONE_MANAGER_FIREBASE_SERVICE_ACCOUNT_JSON`: service account JSON một dòng.
- `RCLONE_MANAGER_FIREBASE_SERVICE_ACCOUNT_PATH`: path file service account bên trong container.
- `RCLONE_MANAGER_FIREBASE_DATABASE_SECRET`: legacy database secret.
- `RCLONE_MANAGER_ENCRYPTION_KEY`: mã hóa `clientSecret` trước khi lưu Firebase.

## Firebase mode
- Nếu không cấu hình Firebase, app vẫn khởi động ở memory mode để kiểm thử, nhưng dữ liệu mất khi restart.
- Production nên dùng một trong hai mode:
  - `RCLONE_MANAGER_FIREBASE_DATABASE_URL` + `RCLONE_MANAGER_FIREBASE_SERVICE_ACCOUNT_JSON`
  - `RCLONE_MANAGER_FIREBASE_DATABASE_URL` + `RCLONE_MANAGER_FIREBASE_DATABASE_SECRET`
- Nếu dùng `RCLONE_MANAGER_FIREBASE_SERVICE_ACCOUNT_PATH`, cần thêm bind mount file service account vào đúng path container đó.

## Rclone local paths
- Lệnh cloud-to-cloud không cần volume thêm.
- Lệnh đọc/ghi file local phải dùng path trong container, ví dụ `/data/...`.
- Host folder tương ứng là `${RCLONE_MANAGER_DOCKER_VOLUMES_ROOT:-./.docker-volumes}/app/data`.

## Routing
- Public host: `${RCLONE_MANAGER_PROJECT_NAME}.${RCLONE_MANAGER_DOMAIN}` (+ alias `main.${RCLONE_MANAGER_DOMAIN}` và `${RCLONE_MANAGER_DOMAIN}`).
- Internal HTTPS host: `${RCLONE_MANAGER_PROJECT_NAME_TAILSCALE}.${RCLONE_MANAGER_TAILSCALE_TAILNET_DOMAIN}` với `tls internal`.
- App chính dùng Google Auth nội bộ thay vì Caddy Basic Auth. Các protected API nhận một trong hai kênh: Google session từ UI hoặc `x-api-key` từ client ngoài.
