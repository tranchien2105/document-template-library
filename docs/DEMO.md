# Kịch bản demo Papertrail (3–5 phút)

## Chuẩn bị

1. Tạo `.env`, `backend/.env` và `frontend/.env.local` theo các file `.env.example` trong repository.
2. Khởi động PostgreSQL bằng `docker compose up -d postgres`.
3. Chạy `npm run dev:backend` và `npm run dev:frontend` ở hai terminal. Khi backend khởi động, migration được chạy và manifest được đồng bộ vào PostgreSQL.
4. Mở <http://localhost:3000>.

## Luồng demo

1. Mở trang thư viện, xác nhận danh sách mẫu được tải từ API.
2. Tìm “nghỉ phép” để minh họa tìm kiếm bằng tiếng Việt; thử lọc theo loại hoặc danh mục.
3. Mở mẫu “Đơn xin nghỉ phép”. Preview lấy nội dung, bảng và placeholder trực tiếp từ DOCX; cách phân trang có thể khác tùy ứng dụng Office.
4. Sửa một trường có dữ liệu mẫu, giữ nguyên các trường còn lại, rồi nhấn nút tạo và tải DOCX.
5. Mở một mẫu PowerPoint. Dùng nút điều hướng hoặc hình thu nhỏ để xem các shape, nội dung và trường dữ liệu đọc từ slide PPTX gốc; preview tái dựng trong trình duyệt, không phải ảnh chụp render.
6. Sửa tên công ty hoặc một trường khác, quan sát preview cập nhật, rồi tạo và tải PPTX đã được điền dữ liệu.
7. Gọi `GET /api/documents/{id}` với ID nhận được từ response tạo file để xem metadata công khai; xác nhận response không có `filePath` hoặc `formData`.
8. Mở mục “Tài liệu của tôi” để xem lại tệp đã tạo và tải xuống từ danh sách PostgreSQL.
9. Trong mục “Quản lý mẫu”, tải một file DOCX thử nghiệm có placeholder `{{ho_ten}}`, sau đó mở mẫu mới và tạo tài liệu.
10. Khởi động lại backend rồi tìm mẫu vừa tải lên để kiểm tra metadata vẫn được giữ trong cơ sở dữ liệu.
11. So sánh file mẫu trong `storage/templates` với bản tải xuống để xác nhận mẫu gốc không bị sửa.

## Response tạo file mẫu

```json
{
  "id": "UUID-do-backend-tra-ve",
  "fileName": "leave-request-xxxxxxxx.docx",
  "downloadUrl": "/api/files/UUID-do-backend-tra-ve"
}
```

Tài liệu DOCX và các trường đã khai báo trong PPTX có thể chỉnh sửa qua biểu mẫu. Các trường PPTX được thay thế trong slide gốc; Papertrail chưa có trình chỉnh sửa bố cục slide tích hợp. Có thể tiếp tục chỉnh sửa file tải về bằng PowerPoint hoặc ứng dụng tương thích.
