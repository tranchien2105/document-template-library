# Bàn giao Papertrail

Tài liệu này giúp đối chiếu sản phẩm với yêu cầu bài tuyển dụng. Phần nào cần kiểm tra trên máy thật được ghi rõ bên dưới.

## Tình trạng các hạng mục

| Hạng mục | Tình trạng | Ghi chú |
| --- | --- | --- |
| Mã nguồn | Có | Hai thư viện DOCX/PPTX nằm trong cùng ứng dụng `frontend/` và `backend/`. |
| Cài đặt và chạy thử | Có | Dùng Docker Compose; hướng dẫn cho người mới ở [HUONG-DAN-CHAY-CHO-NGUOI-MOI.md](HUONG-DAN-CHAY-CHO-NGUOI-MOI.md). |
| README và kiến trúc | Có | Công nghệ, cách chạy, chức năng và giới hạn được tóm tắt trong [README.md](../README.md). |
| API và mô hình dữ liệu | Có | Xem [API.md](API.md). |
| Mẫu đi kèm | Có | Danh sách có 5 DOCX và 3 PPTX; công cụ kiểm tra của dự án xác nhận cấu trúc các gói Office. |
| Video quay màn hình | Đính kèm riêng | Video không nằm trong repository. Gửi file video cùng email nộp bài. |

## Chạy thử nhanh

Tại thư mục gốc source, chạy:

```bash
docker compose up --build
```

Mở <http://localhost:3000>. Kiểm tra backend tại <http://localhost:3001/health>. Lần đầu cần Internet để tải Docker image và build ứng dụng. Không cần cài Node.js hay PostgreSQL trên máy.

## Điều nên nói rõ khi bàn giao

- DOCX cho phép sửa các trường đã khai báo trong mẫu; không phải trình soạn thảo Word đầy đủ.
- PPTX có thể xem trước nội dung, điền các trường và tải bản sao để chỉnh sửa bằng ứng dụng Office. Ứng dụng chưa có trình chỉnh sửa slide tích hợp.
- Bản xem trước được dựng từ nội dung và bố cục trong gói Office, không phải ảnh chụp từ Word hay PowerPoint; cách hiển thị có thể khác giữa các ứng dụng.
- Ứng dụng dùng một Demo User và chưa có đăng nhập hay phân quyền. Không dùng cho dữ liệu riêng tư hoặc nhiều người dùng.
- Môi trường kiểm tra trước đây không có LibreOffice; chưa xác minh mở và render các file bằng Microsoft Office/LibreOffice tại đó.

## Trước khi gửi email

1. Mở website hoặc chạy ứng dụng bằng Docker, thử tạo một DOCX và một PPTX.
2. Nếu gửi video, xem lại để chắc rằng video mở được và không lộ file `.env`, mật khẩu hay thông tin cá nhân.
3. Gửi link GitHub, link website, README và file video quay màn hình.
