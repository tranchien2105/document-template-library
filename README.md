# Papertrail

Thư viện mẫu giúp tìm, xem trước và tạo tài liệu **DOCX** hoặc bản trình chiếu **PPTX** bằng tiếng Việt.

## Dùng thử

🌐 **Demo trực tuyến:** [papertrail-dev.duckdns.org](https://papertrail-dev.duckdns.org/)

Chạy trên máy bằng Docker:

```bash
git clone https://github.com/tranchien2105/document-template-library.git
cd document-template-library
docker compose up --build -d
```

Mở **http://localhost:3000**. Lần chạy đầu cần Internet để tải và build các image. Không cần cài Node.js, Python hay PostgreSQL trên máy.

Để dừng ứng dụng mà giữ dữ liệu: `docker compose down`. **Không thêm `-v`** nếu bạn muốn giữ database và file đã tạo.

## Papertrail hoạt động như thế nào?

**Sơ đồ production:**

```mermaid
flowchart LR
    User[Trình duyệt] --> Caddy[Caddy<br/>cổng 80]
    Caddy -->|Trang web| Web[Next.js<br/>Giao diện]
    Caddy -->|/api/* và /health| API[NestJS<br/>API]
    API --> DB[(PostgreSQL<br/>mẫu và metadata)]
    API --> Templates[(Mẫu DOCX/PPTX<br/>lưu riêng)]
    API --> Files[(Tệp mới<br/>lưu riêng)]
```

```mermaid
flowchart LR
    A[Tìm và chọn mẫu] --> B[Xem trước]
    B --> C[Sửa các trường được hỗ trợ]
    C --> D[Tạo file DOCX hoặc bản sao PPTX]
    D --> E[Lưu metadata]
    E --> F[Tải file xuống]
```

File được tạo riêng; mẫu gốc không bị sửa. DOCX chỉnh sửa qua các trường của mẫu. PPTX có thể tải xuống để chỉnh sửa bằng PowerPoint hoặc ứng dụng tương thích.

## Một vài mẫu

<p align="center">
  <img src="storage/templates/thumbnails/1-b917545f-c4d8-4cb9-94f6-f4da5d8017d0.png" alt="Ảnh minh họa mẫu báo cáo kinh doanh" width="48%" />
  <img src="storage/templates/thumbnails/6-916e1be1-1dee-4bdb-984b-f8b8a02e7d65.png" alt="Ảnh minh họa mẫu giới thiệu công ty" width="48%" />
</p>

**Kho mẫu khởi tạo:** 5 DOCX và 3 PPTX. Danh sách được quản lý bằng manifest, giao diện tải dữ liệu từ backend.

## Công nghệ

- **Frontend:** Next.js, React, TypeScript.
- **Backend:** NestJS, TypeORM, PostgreSQL.
- **Tài liệu:** JSZip, `docx`, `pptxgenjs`; file lưu trên filesystem Docker volume.
- **AI:** OpenAI Codex được dùng hỗ trợ viết, rà soát và kiểm tra code.

## Kiểm tra

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

## Giới hạn hiện tại

- Chưa có đăng nhập; đây là bản demo dùng chung một Demo User.
- DOCX chỉ sửa các trường khai báo trong mẫu; chưa phải trình soạn thảo Word đầy đủ.
- Không có trình sửa slide tích hợp. Bản xem trước được dựng từ cấu trúc Office, có thể khác cách Word/PowerPoint hiển thị.

## Tài liệu khác

- [Hướng dẫn cho người mới chạy bằng Docker](docs/HUONG-DAN-CHAY-CHO-NGUOI-MOI.md)
- [Triển khai lên Ubuntu VPS](docs/DEPLOYMENT-UBUNTU.md)
- [API và mô hình dữ liệu](docs/API.md)
- [Danh sách mẫu và cách bổ sung mẫu](docs/template-manifest.md)
- [Kịch bản demo](docs/DEMO.md) · [Checklist bàn giao](docs/HANDOVER.md)
- [Các giới hạn và kiểm soát bảo mật](docs/SECURITY.md)
