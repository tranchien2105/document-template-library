# Danh sách và cách quản lý mẫu

`storage/templates/manifest.json` là danh sách khởi tạo và nguồn thông tin cho các mẫu đi kèm. Tên, danh mục, mô tả và nội dung xem trước viết bằng tiếng Việt; `slug` và tên file giữ ổn định để dùng trong code.

Mỗi mẫu có `id`, `slug`, tên, loại (`document` hoặc `presentation`), danh mục, mô tả, đường dẫn file tương đối, thumbnail nếu có và dữ liệu `preview`. Preview DOCX mô tả các phần, placeholder và trường trên biểu mẫu. Preview PPTX có số slide, tiêu đề và các trường gắn với từng slide. Mỗi trường ghi rõ khóa, nhãn, có bắt buộc hay không, kiểu nhập và độ dài tối đa.

Preview là bản dựng từ nội dung trong file Office, không phải ảnh chụp trang Word hoặc slide PowerPoint. Nếu mẫu chưa có thumbnail, giao diện sẽ hiển thị ảnh thay thế.

## Đồng bộ dữ liệu mẫu

Script sinh bộ mẫu đi kèm cập nhật các ID từ 1 đến 8 và giữ nguyên những mục khác trong manifest. ID và `slug` của bộ này ổn định giữa các lần sinh.

Khi backend khởi động, migration chạy trước; sau đó service kiểm tra thông tin và file trong manifest rồi đồng bộ các mẫu đó vào PostgreSQL. Đồng bộ có thể chạy lại mà không tạo bản ghi trùng. Metadata đã sửa trong trang Quản lý mẫu được giữ lại khi backend khởi động lại. Xóa một mục khỏi manifest không tự ẩn hoặc xóa bản ghi đã có trong PostgreSQL; dùng chức năng ẩn mẫu trong trang Quản lý mẫu để ngừng hiển thị mẫu.

## Tải mẫu mới qua giao diện

1. Mở trang **Quản lý mẫu** và chọn DOCX hoặc PPTX.
2. Chọn file Office hợp lệ, nhập tên, mô tả và danh mục rồi tải lên.
3. Sau khi mẫu xuất hiện trong danh sách, dùng **Sửa** để cập nhật thông tin hoặc thêm thumbnail.
4. Mẫu được lưu trong database và hiển thị qua API; không cần sửa giao diện hoặc manifest.

## Cập nhật bộ mẫu đi kèm source

1. Khai báo nội dung, placeholder và metadata trong `scripts/generate-templates/generate.mjs`.
2. Giữ nguyên ID/`slug` hiện có; dùng ID chưa có khi bổ sung mẫu.
3. Chạy `npm run templates:generate` để sinh file và cập nhật manifest. Dùng `npm run templates:generate -- --presentations-only` nếu chỉ sinh PPTX; `npm run templates:generate:documents` nếu chỉ sinh DOCX.
4. Kiểm tra file, preview và manifest trước khi phát hành.
