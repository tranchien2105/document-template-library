# Papertrail — Thư viện mẫu tài liệu

Papertrail là ứng dụng giúp người dùng **tìm mẫu, xem trước, điền nội dung và tải xuống tài liệu DOCX/PPTX**. Dự án được xây dựng cho bài đánh giá tuyển dụng.

## Dùng thử ngay

🌐 **Website demo:** [https://papertrail-dev.duckdns.org/](https://papertrail-dev.duckdns.org/)

### Chạy trên máy bằng Docker

Chỉ cần Git và Docker có Docker Compose. Không cần cài Node.js, Python hay PostgreSQL trên máy.

```bash
git clone https://github.com/tranchien2105/document-template-library.git
cd document-template-library
docker compose up --build
```

Mở <http://localhost:3000>. Lần chạy đầu, Docker cần Internet để tải image và build ứng dụng; có thể mất vài phút. Nếu cổng 3000, 3001 hoặc 5432 đang được ứng dụng khác dùng, hãy dừng ứng dụng đó trước.

Nhấn `Ctrl+C` để dừng. `docker compose down` xóa container nhưng giữ dữ liệu. **Không chạy `docker compose down -v`** nếu cần giữ database và các file đã tạo.

## Có gì trong Papertrail?

| Sản phẩm | Chức năng |
| --- | --- |
| Thư viện DOCX | Tìm kiếm, lọc, xem trước, sửa trường mẫu, tạo và tải DOCX |
| Thư viện PPTX | Tìm kiếm, lọc, xem các slide, điền trường, tạo bản sao và tải PPTX |
| Quản lý mẫu | Tải DOCX/PPTX lên, sửa thông tin, cập nhật thumbnail hoặc ẩn mẫu |
| Tài liệu của tôi | Xem và tải các file đã tạo |

Kho mẫu khởi tạo gồm **5 DOCX và 3 PPTX**. Thư viện đọc danh sách từ backend và PostgreSQL, không khai báo cứng từng thẻ mẫu trong giao diện.

### DOCX

| Mẫu | Danh mục |
| --- | --- |
| Báo cáo kết quả kinh doanh | Kinh doanh |
| Hồ sơ ứng tuyển | Nghề nghiệp |
| Đơn xin nghỉ phép | Nhân sự |
| Biên bản cuộc họp | Vận hành |
| Đề xuất dự án | Dự án |

### PPTX

| Bộ slide | Số slide |
| --- | ---: |
| Giới thiệu công ty | 6 |
| Đánh giá kết quả kinh doanh theo quý | 6 |
| Kế hoạch triển khai dự án | 7 |

### Hình ảnh mẫu

<p align="center">
  <img src="storage/templates/thumbnails/1-b917545f-c4d8-4cb9-94f6-f4da5d8017d0.png" alt="Minh họa bìa báo cáo kinh doanh" width="48%" />
  <img src="storage/templates/thumbnails/6-916e1be1-1dee-4bdb-984b-f8b8a02e7d65.png" alt="Minh họa bìa giới thiệu công ty" width="48%" />
</p>

## Luồng tạo file

```mermaid
flowchart LR
    A[Tìm mẫu] --> B[Xem trước]
    B --> C[Sửa trường]
    C --> D[Backend tạo file mới]
    D --> E[Lưu metadata vào PostgreSQL]
    E --> F[Tải DOCX/PPTX]
    G[Mẫu nguồn] -. được giữ nguyên .-> D
```

Trong môi trường production, Caddy nhận yêu cầu HTTP và chuyển tiếp tới Next.js hoặc NestJS. PostgreSQL, frontend và backend không mở cổng trực tiếp ra Internet.

```mermaid
flowchart LR
    User[Trình duyệt] --> Caddy[Caddy :80]
    Caddy -->|Trang web| Next[Next.js :3000]
    Caddy -->|/api/* và /health| Nest[NestJS :3001]
    Nest --> DB[(PostgreSQL :5432)]
    Nest --> Storage[(Volume mẫu và file tạo ra)]
```

## Công nghệ và dữ liệu

- **Frontend:** Next.js, React, TypeScript.
- **Backend:** NestJS, TypeORM; API REST.
- **Cơ sở dữ liệu:** PostgreSQL; migration tạo cấu trúc bảng và tài khoản Demo User khi backend khởi động.
- **Tạo file:** `docx`, `pptxgenjs`; JSZip xử lý placeholder trong gói Office Open XML.
- **Lưu trữ:** mẫu và file tạo ra ở các thư mục riêng; Docker Compose dùng volume để giữ dữ liệu.

Chi tiết endpoint, ví dụ request và mô hình `Template` – `Document` – `User`: [docs/API.md](docs/API.md). Danh sách mẫu, placeholder và cách đăng ký mẫu mới: [docs/template-manifest.md](docs/template-manifest.md).

## Kiểm tra code

Chạy tại thư mục gốc:

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

Test backend kiểm tra upload Office, placeholder, XML, bảo toàn file nguồn, sao chép PPTX, metadata và lỗi tải file. Test đơn vị không cần PostgreSQL; kiểm tra tích hợp database cần chạy riêng.

## Giới hạn cần biết

- Ứng dụng dùng chung một Demo User; **chưa có đăng nhập hay cách ly dữ liệu giữa nhiều người dùng**.
- DOCX sửa được các trường do template định nghĩa, chưa phải trình soạn thảo Word tự do.
- Chưa có trình sửa slide tích hợp. Có thể sửa file PPTX đã tải bằng PowerPoint hoặc ứng dụng tương thích.
- Preview được tái dựng từ dữ liệu bên trong DOCX/PPTX, không phải ảnh render nguyên bản; cách xuống dòng, font và hiệu ứng có thể khác ứng dụng Office.
- Tệp tải lên được kiểm tra định dạng và cấu trúc gói Office; bước này không thay thế phần mềm quét mã độc.

## Tài liệu và bàn giao

- [Chạy thử cho người mới](docs/HUONG-DAN-CHAY-CHO-NGUOI-MOI.md)
- [Triển khai Ubuntu VPS](docs/DEPLOYMENT-UBUNTU.md)
- [API và mô hình dữ liệu](docs/API.md)
- [Bảo mật và giới hạn](docs/SECURITY.md)
- [Checklist bàn giao](docs/HANDOVER.md)

Khi gửi bài, đính kèm video quay màn hình theo yêu cầu của nhà tuyển dụng. Video không nằm trong repository.

Các thư viện chính và giấy phép được liệt kê trong [docs/API.md](docs/API.md). Tôi có sử dụng OpenAI Codex để hỗ trợ viết và rà soát code, tài liệu, cũng như kiểm tra một số luồng của ứng dụng.
