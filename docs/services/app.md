# App service (`compose.apps.yml`)

## Vai trò
- Service ứng dụng chính, build rclone OAuth Manager từ `services/app`.
- Serve frontend SPA/PWA từ `public/`, API Express từ `src/`, và OAuth callback trên cùng port.
- Image có cài `rclone` để chạy lệnh rclone thật bên trong container.

## Cấu hình chính
- Service name: `app`.
- Image local tag: `${PROJECT_NAME}-app:local`.
- Build context: `./services/app`.
- Internal app port: `${APP_PORT}`.
- Host publish: `127.0.0.1:${APP_HOST_PORT}:${APP_PORT}`.
- Healthcheck: `wget http://localhost:${APP_PORT}${HEALTH_PATH}`.
- Runtime data:
  - `${DOCKER_VOLUMES_ROOT:-./.docker-volumes}/app/logs:/app/logs`
  - `${DOCKER_VOLUMES_ROOT:-./.docker-volumes}/app/data:/data`

## ENV bắt buộc
- `APP_PORT`: port app lắng nghe trong container.
- `PROJECT_NAME`, `DOMAIN`: tạo hostname public.

## ENV app optional
- `APP_HOST_PORT` (default `53682`): port localhost trên host machine.
- `NODE_ENV` (default `production`).
- `HEALTH_PATH` (default `/health`).
- `RCLONE_MANAGER_FRONTEND_URL`: base URL dùng sau OAuth callback. Để trống thì app redirect về cùng host nhận callback.
- `RCLONE_MANAGER_ALLOWED_ORIGINS`: danh sách origin CORS, phân tách bằng dấu phẩy. Để trống cho UI cùng origin.
- `RCLONE_MANAGER_BACKEND_API_KEY`: key optional cho client ngoài gọi API backend qua header `x-api-key`. Frontend bundled không hiển thị, lưu, hoặc gửi key này.
- `RCLONE_MANAGER_REQUIRE_GOOGLE_AUTH`: bật/tắt Firebase Google Auth cho các API backend được bảo vệ (`true` mặc định).
- `RCLONE_MANAGER_AUTH_SESSION_SECRET`, `RCLONE_MANAGER_AUTH_SESSION_TTL_MS`: ký và đặt hạn phiên Google auth nội bộ.
- `RCLONE_MANAGER_GOOGLE_AUTH_FIREBASE_*`: Firebase Web app config dùng cho Google Sign-In qua Firebase Auth.
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
- Host folder tương ứng là `${DOCKER_VOLUMES_ROOT:-./.docker-volumes}/app/data`.

## Routing
- Public host: `${PROJECT_NAME}.${DOMAIN}` (+ alias `main.${DOMAIN}` và `${DOMAIN}`).
- Internal HTTPS host: `${PROJECT_NAME_TAILSCALE}.${TAILSCALE_TAILNET_DOMAIN}` với `tls internal`.
- App chính dùng Google Auth nội bộ thay vì Caddy Basic Auth. Các protected API nhận một trong hai kênh: Google session từ UI hoặc `x-api-key` từ client ngoài.
