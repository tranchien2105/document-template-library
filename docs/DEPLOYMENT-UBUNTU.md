# Triển khai Papertrail trên Ubuntu 24.04

Hướng dẫn này dùng cấu hình production riêng, không thay đổi `docker-compose.yml` dành cho phát triển. Máy chủ cần Docker Engine, Docker Compose plugin, Git và quyền mở cổng TCP 80.

## 1. Lấy mã nguồn và tạo cấu hình bí mật

```bash
git clone https://github.com/tranchien2105/document-template-library.git
cd document-template-library
cp .env.production.example .env.production
chmod 600 .env.production
openssl rand -hex 32
nano .env.production
```

Dán chuỗi vừa tạo vào `DB_PASSWORD`. Điền `CORS_ORIGIN` là địa chỉ người dùng mở trên trình duyệt, gồm `http://` hoặc `https://`, không có dấu `/` cuối. Ví dụ `http://DIA_CHI_IP_VPS`. Không dùng mật khẩu mẫu, không đưa `.env.production` lên Git.

Nếu Docker chưa được cài, hãy làm theo hướng dẫn cài Docker Engine và Compose plugin chính thức cho Ubuntu của Docker. Trên firewall/cloud firewall, chỉ mở SSH và TCP 80 cho cấu hình hiện tại; không mở 3000, 3001 hoặc 5432.

## 2. Kiểm tra cấu hình và khởi chạy

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml config -q
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
docker compose --env-file .env.production -f docker-compose.prod.yml ps
```

Lần đầu, Docker tải image và biên dịch ứng dụng nên có thể mất vài phút. Caddy là dịch vụ duy nhất xuất cổng ra máy chủ (TCP 80). Frontend, backend và PostgreSQL chỉ liên lạc trong mạng Docker riêng.

## 3. Kiểm tra website và xem log

```bash
curl -i http://127.0.0.1/health
curl -i http://127.0.0.1/api/templates
docker compose --env-file .env.production -f docker-compose.prod.yml logs -f
```

Mở `http://DIA_CHI_IP_VPS` để dùng website. Khi đã cấu hình tên miền, cần chuyển Caddy sang tên miền và mở TCP 443 để bật HTTPS trước khi dùng lâu dài hoặc truyền dữ liệu nhạy cảm. Cấu hình hiện tại chỉ chủ ý phục vụ HTTP trên cổng 80.

## Cơ sở dữ liệu, mẫu khởi tạo và lưu trữ

- Backend tự chạy các TypeORM migration khi khởi động (`migrationsRun: true`); `synchronize` vẫn tắt. Migration tạo Demo User.
- `TemplateService` đồng bộ manifest khi khởi tạo. Manifest hiện có 5 mẫu DOCX và 3 mẫu PPTX; không cần chạy seed command riêng.
- Các volume `postgres_data`, `template_data` và `generated_data` giữ dữ liệu PostgreSQL, mẫu/tệp tải lên/thumbnail và tài liệu đã tạo sau khi container được tạo lại. Docker khởi tạo volume mẫu từ các tệp có trong image lần đầu mount; backend chạy bằng user `node`, image cấp quyền sở hữu storage cho user này, không cần quyền ghi cho mọi người.
- Không dùng `docker compose down -v` nếu cần giữ dữ liệu. Cấu hình này không tự tạo bản sao lưu; hãy sao lưu volume/database riêng.
- Backend giới hạn Office upload mặc định 10 MiB (có thể đặt 1–50 MiB); thumbnail có giới hạn 5 MiB. Caddy giới hạn request API ở 12 MiB để chừa phần multipart overhead. Giới hạn này áp dụng cho cả request API, không chỉ upload.
- Frontend được build với `NEXT_PUBLIC_API_BASE_URL` rỗng, vì vậy gọi API cùng origin qua Caddy; không nhúng địa chỉ IP hoặc `localhost` vào bundle production.

## Lưu ý bảo mật và vận hành

Ứng dụng hiện là bản demo một người dùng, không có đăng nhập/phân quyền. Không nên coi việc chỉ có một Demo User là cách ly dữ liệu. Trước khi mở công khai hoặc lưu dữ liệu thật, cần bổ sung xác thực, phân quyền, HTTPS, cập nhật hệ điều hành/image, giới hạn truy cập quản lý mẫu và quy trình backup/restore. CORS không thay thế xác thực.
