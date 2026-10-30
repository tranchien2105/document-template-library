# Checklist bàn giao Papertrail

Tài liệu này đối chiếu các hạng mục bàn giao của bài tuyển dụng với repository hiện tại. Trạng thái chỉ phản ánh nội dung và kiểm tra đã thực hiện trong source; video demo cần được quay thủ công trên máy chạy ứng dụng.

## 1. Source code của hai sản phẩm — ĐÃ CÓ

- Product 1 (thư viện và luồng tạo tài liệu DOCX): `frontend/`, `backend/`.
- Product 2 (thư viện, preview, tạo bản sao PPTX): dùng chung frontend/backend và các template trong `storage/templates/presentations/`.
- Hai sản phẩm nằm trong cùng ứng dụng Papertrail, không phải hai repository độc lập.

## 2. Hướng dẫn cài đặt và chạy thử — ĐÃ CÓ

Cách khởi chạy nhanh được ghi trong [`README.md`](../README.md). Hướng dẫn chi tiết cho người chưa quen Git/Docker nằm trong [`HUONG-DAN-CHAY-CHO-NGUOI-MOI.md`](HUONG-DAN-CHAY-CHO-NGUOI-MOI.md). Người đánh giá chỉ cần cài Docker Desktop/Engine có Compose, rồi chạy ở thư mục gốc:

```bash
docker compose up --build
```

Lần đầu cần Internet để Docker tải image và dependency. Website ở `http://localhost:3000`, API ở `http://localhost:3001`. Không cần cài Node.js/npm/PostgreSQL trên máy host. Chế độ chạy dev trực tiếp vẫn được hướng dẫn trong README.

## 3. README kiến trúc và công nghệ — ĐÃ CÓ

[`README.md`](../README.md) mô tả Next.js, NestJS, PostgreSQL/TypeORM, lưu trữ file, cách tạo DOCX/PPTX, giới hạn sản phẩm và khai báo việc sử dụng AI hỗ trợ lập trình.

## 4. Tài liệu API / cấu trúc dữ liệu — ĐÃ CÓ

- API, ví dụ request, Template/Document/User và cấu trúc lưu trữ được mô tả trong [`README.md`](../README.md).
- Nguồn metadata mẫu, field, preview và cách đồng bộ được mô tả trong [`template-manifest.md`](template-manifest.md) và `storage/templates/manifest.json`.

## 5. Bộ dữ liệu và template — ĐÃ CÓ, ĐÃ KIỂM TRA CẤU TRÚC

- Manifest hiện có 8 mục: 5 DOCX và 3 PPTX.
- Đã chạy `python3 scripts/generate-templates/validate-office.py --manifest storage/templates/manifest.json`: cả 8 gói Office Open XML hợp lệ về cấu trúc theo validator của dự án.
- Không có thumbnail path nào trong manifest đang trỏ tới file thiếu.
- Giới hạn lần kiểm tra này: môi trường không có LibreOffice; chưa thể xác minh render độc lập hoặc mở file bằng Microsoft Word/PowerPoint.

## 6. Video demo — BẠN CẦN TỰ QUAY

Video không được tạo tự động. Dùng kịch bản [`DEMO.md`](DEMO.md), quay màn hình khoảng 3–5 phút sau khi khởi động database, backend và frontend. Nên thể hiện:

1. Thư viện tải dữ liệu, tìm kiếm và lọc mẫu.
2. Mở một DOCX, sửa trường, xem preview cập nhật, tạo và tải file.
3. Mở một PPTX, xem các slide preview, sửa trường, tạo bản sao và tải file.
4. Mở “Tài liệu của tôi” để xác nhận file đã tạo được lưu.
5. Nếu thời lượng cho phép, mở “Quản lý mẫu” và thêm một template thử nghiệm.

Trước khi quay, kiểm tra thông tin cá nhân/đường dẫn nhạy cảm không xuất hiện trên màn hình. Không đưa `.env` hoặc thông tin credentials vào video.

## 7. Trạng thái hoàn thành và giới hạn — ĐÃ CÓ

Các chức năng đã hoàn thành, giới hạn kỹ thuật và hướng phát triển tiếp theo nằm trong mục “Chức năng”, “Giới hạn hiện tại” và “Hướng phát triển tiếp theo” của [`README.md`](../README.md). Tóm tắt: DOCX chỉnh sửa theo các trường đã khai báo; PPTX được điền trường và sao chép để chỉnh sửa bằng ứng dụng Office bên ngoài; preview được dựng từ cấu trúc OOXML chứ không phải ảnh render nguyên bản; ứng dụng dùng một Demo User và chưa có xác thực.

## Trước khi gửi nhà tuyển dụng

- Chạy `docker compose up --build`, chờ cả ba dịch vụ khởi động rồi mở website.
- Chạy thử cả DOCX/PPTX end-to-end trong môi trường Docker.
- Nếu muốn chạy các lệnh build/typecheck/lint/test, làm theo README; chỉ nêu kết quả thực tế.
- Tự quay video theo `docs/DEMO.md`; xem lại video để bảo đảm thấy rõ các thao tác và file tải xuống.
- Đính kèm repository/source, README, tài liệu này, manifest và các file template mẫu.
