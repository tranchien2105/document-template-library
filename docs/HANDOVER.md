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
| Bộ mẫu để thử tải lên | Có | Hai DOCX, hai PPTX và bốn thumbnail trong [bộ mẫu HR](../storage/template-upload-samples/hr/README.md). |
| Video quay màn hình | Gửi kèm riêng | Video không nằm trong repository; gửi file video cùng email nộp bài. |
| Công cụ hỗ trợ | Có khai báo | OpenAI Codex được sử dụng để hỗ trợ phát triển, rà soát và kiểm thử một số phần của dự án. |

## Chạy thử nhanh

Tại thư mục gốc source, chạy:

```bash
docker compose up --build
```

Mở <http://localhost:3000>. Kiểm tra backend tại <http://localhost:3001/health>. Lần đầu cần Internet để tải Docker image và build ứng dụng. Không cần cài Node.js hay PostgreSQL trên máy.

## Chức năng đã hoàn thành và giới hạn

- DOCX cho phép sửa các trường đã khai báo trong mẫu; không phải trình soạn thảo Word đầy đủ.
- PPTX cho phép thay placeholder được khai báo khi tạo bản sao; file có thể mở và chỉnh sửa bằng ứng dụng Office. Ứng dụng chưa có trình chỉnh sửa slide tích hợp.
- Bản xem trước được dựng từ nội dung và bố cục trong gói Office, không phải ảnh chụp từ Word hay PowerPoint; cách hiển thị có thể khác giữa các ứng dụng.
- Ứng dụng dùng một Demo User và chưa có đăng nhập hay phân quyền. Không dùng cho dữ liệu riêng tư hoặc nhiều người dùng.
- Chưa kiểm thử mở và render các file bằng Microsoft Office hoặc LibreOffice.

## Kiểm tra trước khi bàn giao

1. Mở website hoặc chạy ứng dụng bằng Docker; thử tạo một DOCX và một PPTX.
2. Kiểm tra video mở được và không chứa file `.env`, mật khẩu hoặc thông tin cá nhân.
3. Gửi link GitHub, link website và file video cùng email nộp bài.
