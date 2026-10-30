# Triển khai Papertrail trên Ubuntu 24.04

Hướng dẫn này dùng cấu hình production riêng, không thay đổi `docker-compose.yml` dành cho phát triển. Máy chủ cần Docker Engine, Docker Compose plugin, Git và quyền mở cổng TCP 80/443. Cấu hình Compose cũng ánh xạ UDP 443 cho HTTP/3.

## 1. Lấy mã nguồn và tạo cấu hình bí mật

```bash
git clone https://github.com/tranchien2105/document-template-library.git
cd document-template-library
cp .env.production.example .env.production
chmod 600 .env.production
openssl rand -hex 32
nano .env.production
```

Dán chuỗi vừa tạo vào `DB_PASSWORD`. Với Caddyfile đi kèm, đặt `CORS_ORIGIN=https://papertrail-dev.duckdns.org`. Nếu dùng tên miền khác, cập nhật địa chỉ ở đầu `Caddyfile`, trỏ DNS tên miền đó về VPS và đặt `CORS_ORIGIN` đúng origin, không có dấu `/` cuối. Không dùng mật khẩu mẫu, không đưa `.env.production` lên Git.

Nếu Docker chưa được cài, tham khảo hướng dẫn cài Docker Engine và Compose plugin chính thức cho Ubuntu của Docker. Trên firewall/cloud firewall, mở SSH và TCP 80/443; có thể mở UDP 443 để hỗ trợ HTTP/3. Không mở 3000 hoặc 3001. PostgreSQL chỉ được ánh xạ vào loopback của máy chủ, không mở cổng 5432 ra mạng ngoài.

## 2. Kiểm tra cấu hình và khởi chạy

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml config -q
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
docker compose --env-file .env.production -f docker-compose.prod.yml ps
```

Lần đầu, Docker tải image và biên dịch ứng dụng nên có thể mất vài phút. Caddy là dịch vụ duy nhất nhận lưu lượng web từ bên ngoài trên TCP 80/443 và UDP 443. Frontend, backend và PostgreSQL liên lạc qua mạng Docker riêng; PostgreSQL chỉ có cổng loopback trên máy chủ.

## 3. Kiểm tra website và xem log

```bash
curl -i https://papertrail-dev.duckdns.org/health
curl -i https://papertrail-dev.duckdns.org/api/templates
docker compose --env-file .env.production -f docker-compose.prod.yml logs -f
```

Mở <https://papertrail-dev.duckdns.org> để dùng website. Caddyfile hiện dùng tên miền này và tự quản lý chứng chỉ HTTPS. Khi thay tên miền, cập nhật Caddyfile, DNS và `CORS_ORIGIN` trước khi khởi động lại dịch vụ.

## Cơ sở dữ liệu, mẫu khởi tạo và lưu trữ

- Backend tự chạy các TypeORM migration khi khởi động (`migrationsRun: true`); `synchronize` vẫn tắt. Migration tạo Demo User.
- `TemplateService` đồng bộ manifest khi khởi tạo. Manifest hiện có 5 mẫu DOCX và 3 mẫu PPTX; không cần chạy seed command riêng.
- Các volume `postgres_data`, `template_data` và `generated_data` giữ dữ liệu PostgreSQL, mẫu/tệp tải lên/thumbnail và tài liệu đã tạo sau khi container được tạo lại. Docker khởi tạo volume mẫu từ các tệp có trong image lần đầu mount; backend chạy bằng user `node`, image cấp quyền sở hữu storage cho user này, không cần quyền ghi cho mọi người.
- Không dùng `docker compose down -v` nếu cần giữ dữ liệu. Cấu hình này không tự tạo bản sao lưu; cần sao lưu volume/database theo quy trình riêng.
- Backend giới hạn Office upload mặc định 10 MiB (có thể đặt 1–50 MiB); thumbnail có giới hạn 5 MiB. Caddy giới hạn request API ở 12 MiB để chừa phần multipart overhead. Giới hạn này áp dụng cho cả request API, không chỉ upload.
- Frontend được build với `NEXT_PUBLIC_API_BASE_URL` rỗng, vì vậy gọi API cùng origin qua Caddy; không nhúng địa chỉ IP hoặc `localhost` vào bundle production.

## Lưu ý bảo mật và vận hành

Ứng dụng hiện là bản demo một người dùng, không có đăng nhập/phân quyền. Không nên coi việc chỉ có một Demo User là cách ly dữ liệu. Trước khi mở công khai hoặc lưu dữ liệu thật, cần bổ sung xác thực, phân quyền, HTTPS, cập nhật hệ điều hành/image, giới hạn truy cập quản lý mẫu và quy trình backup/restore. CORS không thay thế xác thực.
