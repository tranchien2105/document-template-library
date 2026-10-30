# Danh sách và cách quản lý mẫu

`storage/templates/manifest.json` là danh sách khởi tạo và nguồn thông tin cho các mẫu đi kèm. Tên, danh mục, mô tả và nội dung xem trước viết bằng tiếng Việt; `slug` và tên file giữ ổn định để dùng trong code.

Mỗi mẫu có `id`, `slug`, tên, loại (`document` hoặc `presentation`), danh mục, mô tả, đường dẫn file tương đối, thumbnail nếu có và dữ liệu `preview`. Preview DOCX mô tả các phần, placeholder và trường trên biểu mẫu. Preview PPTX có số slide, tiêu đề và các trường gắn với từng slide. Mỗi trường ghi rõ khóa, nhãn, có bắt buộc hay không, kiểu nhập và độ dài tối đa.

Preview là bản dựng từ nội dung trong file Office, không phải ảnh chụp trang Word hoặc slide PowerPoint. Nếu mẫu chưa có thumbnail, giao diện sẽ hiển thị ảnh thay thế.

## Đồng bộ dữ liệu mẫu

Script sinh mẫu cập nhật các ID từ 1 đến 8 và giữ nguyên các mẫu khác trong manifest. ID và `slug` không đổi giữa các lần sinh.

Khi backend khởi động, migration chạy trước, sau đó service kiểm tra thông tin và file của từng mẫu rồi đồng bộ vào PostgreSQL. Nếu một mẫu bị bỏ khỏi manifest, mẫu đó được ngừng hiển thị thay vì xóa file nguồn. Quá trình có thể chạy lại mà không tạo bản ghi trùng. PostgreSQL phục vụ truy vấn khi ứng dụng chạy; manifest mô tả bộ mẫu khởi tạo.

## Thêm mẫu mới

1. Thêm nội dung và khai báo mẫu trong `scripts/generate-templates/generate.mjs`.
2. Chọn ID chưa dùng và `slug` riêng; giữ nguyên các khóa placeholder giữa file Office và manifest.
3. Chạy `npm run templates:generate` để sinh file và cập nhật manifest.
4. Kiểm tra lại file, preview và manifest trước khi phát hành.

Chỉ sinh lại PPTX bằng `npm run templates:generate -- --presentations-only`.
