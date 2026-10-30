# Bộ mẫu HR dùng thử

Bộ này gồm 2 mẫu DOCX, 2 mẫu PPTX và 4 ảnh thumbnail tương ứng. Đây là **file mẫu để thử chức năng tải mẫu mới lên Papertrail**; chúng không tự được thêm vào danh mục đang hoạt động.

## Danh sách file

| Loại | File mẫu | Thumbnail |
| --- | --- | --- |
| DOCX | `documents/hr-recruitment-plan.docx` — Kế hoạch tuyển dụng | `thumbnails/hr-recruitment-plan.png` |
| DOCX | `documents/hr-interview-scorecard.docx` — Phiếu đánh giá phỏng vấn | `thumbnails/hr-interview-scorecard.png` |
| PPTX | `presentations/hr-talent-acquisition-plan.pptx` — Chiến lược thu hút nhân tài | `thumbnails/hr-talent-acquisition-plan.png` |
| PPTX | `presentations/hr-employee-onboarding.pptx` — Chương trình hội nhập nhân sự mới | `thumbnails/hr-employee-onboarding.png` |

## Cách thêm vào thư viện

1. Mở Papertrail và vào **Quản lý mẫu**.
2. Chọn đúng loại Word hoặc PowerPoint.
3. Điền tên, mô tả, danh mục `Nhân sự` và chọn file tương ứng trong thư mục `documents/` hoặc `presentations/`.
4. Sau khi tải mẫu lên thành công, dùng mục **Sửa** của mẫu vừa thêm để tải thumbnail PNG tương ứng trong thư mục `thumbnails/`.

DOCX có placeholder tiếng Việt dạng `{{ten_truong}}`; PPTX cũng có placeholder để hệ thống phát hiện trường có thể điền. Tệp PowerPoint có 6 slide mỗi bộ. Nội dung và số liệu là ví dụ, cần thay bằng thông tin thật trước khi sử dụng công việc.

## Tạo lại bộ file

Từ thư mục gốc repository, chạy:

```bash
npm run templates:generate:hr-samples
```

Script chỉ ghi các file trong `storage/template-upload-samples/hr/`, không cập nhật manifest và không thay đổi 8 template hiện có.
