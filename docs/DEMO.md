# Kịch bản quay demo Papertrail — khoảng 4 phút

Kịch bản này giúp quay nhanh hai luồng chính. Đây là hướng dẫn quay, **không phải video đã được ghi sẵn**.

## Trước khi quay

- Mở [website demo](https://papertrail-dev.duckdns.org/) hoặc chạy local bằng `docker compose up --build` rồi vào <http://localhost:3000>.
- Chờ thư viện tải xong; đóng tab và ứng dụng không liên quan.
- Chuẩn bị thư mục để lưu file tải xuống. Không để lộ `.env`, mật khẩu hoặc thông tin cá nhân.
- Có thể dùng OBS hoặc công cụ quay màn hình có sẵn trên máy. Quay ngang 1080p nếu thuận tiện.

## Lời dẫn và thao tác

| Thời gian | Thao tác trên màn hình | Gợi ý lời dẫn |
| --- | --- | --- |
| `0:00–0:20` | Mở trang thư viện, lướt qua các mẫu. | “Đây là Papertrail, thư viện mẫu tài liệu hỗ trợ DOCX và PowerPoint. Dữ liệu mẫu được tải từ backend.” |
| `0:20–0:45` | Tìm “nghỉ phép”, thử lọc loại hoặc danh mục. | “Tôi có thể tìm theo từ khóa và lọc mẫu theo danh mục, loại tài liệu.” |
| `0:45–1:50` | Mở “Đơn xin nghỉ phép”; xem preview, sửa tên/ngày/lý do, tạo và tải DOCX. | “Preview thay đổi theo các trường của mẫu. Khi tạo, backend sinh DOCX mới và giữ nguyên mẫu gốc.” |
| `1:50–3:05` | Trở lại thư viện, mở “Giới thiệu công ty”; xem vài slide, sửa trường công ty, tạo và tải PPTX. | “PowerPoint hiện hỗ trợ xem nội dung slide và điền các trường đã khai báo. Bản tải về có thể mở bằng PowerPoint hoặc ứng dụng tương thích.” |
| `3:05–3:35` | Mở “Tài liệu của tôi”, chọn file vừa tạo và tải lại. | “Thông tin các file đã tạo được lưu trong PostgreSQL; tôi có thể mở danh sách và tải file lại.” |
| `3:35–4:00` | Mở README, lướt sơ đồ kiến trúc hoặc trang quản lý mẫu. | “Ứng dụng dùng Next.js, NestJS và PostgreSQL. Có thể quản lý template từ giao diện.” |

## Nếu còn thời gian

Mở “Quản lý mẫu”, chọn một mẫu để sửa metadata hoặc xem nơi tải template mới. Không cần tải file thử nghiệm lên website demo đang dùng chung nếu không muốn để lại dữ liệu.

## Sau khi quay

1. Xem lại video, kiểm tra âm thanh và đảm bảo không lộ bí mật.
2. Đặt tên rõ ràng, ví dụ `Papertrail-demo.mp4`.
3. Gửi video cùng link repository và website demo theo cách nhà tuyển dụng yêu cầu.

Lưu ý: preview PowerPoint được dựng từ cấu trúc file, không phải ảnh chụp render nguyên bản. Papertrail chưa có trình chỉnh sửa slide tích hợp.
