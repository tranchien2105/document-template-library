# API và mô hình dữ liệu

Các API của ứng dụng dùng tiền tố `/api`. Trên website, trình duyệt gọi API cùng địa chỉ với giao diện qua Caddy. Khi chạy local, backend mặc định ở `http://localhost:3001`.

## Endpoint chính

| Phương thức | Đường dẫn | Mục đích |
| --- | --- | --- |
| `GET` | `/health` | Kiểm tra backend |
| `GET` | `/api/templates` | Danh sách, tìm kiếm, lọc và phân trang mẫu |
| `GET` | `/api/templates/categories` | Danh mục mẫu đang hoạt động |
| `GET` | `/api/templates/:id` | Chi tiết và trường chỉnh sửa của mẫu |
| `GET` | `/api/templates/:id/preview` | Dữ liệu xem trước |
| `POST` | `/api/templates/:id/documents` | Tạo DOCX từ các trường đã khai báo |
| `POST` | `/api/templates/:id/copies` | Tạo bản PPTX độc lập; có thể thay placeholder |
| `GET` | `/api/documents` | Danh sách tài liệu của Demo User |
| `GET` | `/api/documents/:uuid` | Metadata công khai của tài liệu |
| `GET` | `/api/files/:uuid` | Tải file đã tạo |
| `POST` | `/api/templates` | Tải DOCX mới lên (`multipart/form-data`) |
| `POST` | `/api/templates/presentations` | Tải PPTX mới lên (`multipart/form-data`) |
| `PATCH` | `/api/templates/:id` | Sửa tên, mô tả hoặc danh mục |
| `DELETE` | `/api/templates/:id` | Ẩn mẫu khỏi thư viện, giữ file nguồn |

Khi tạo DOCX/PPTX, gửi JSON dạng `{ "values": { "field_key": "Nội dung" } }`. Khi tải mẫu lên, gửi `file`, `name`, `description` và `category` bằng `multipart/form-data`. Phản hồi khi tạo file:

```json
{
  "id": "uuid",
  "fileName": "tai-lieu.docx",
  "downloadUrl": "/api/files/uuid"
}
```

Danh sách mẫu trả `{ items, meta }`. Thông tin tài liệu trả về cho trình duyệt không chứa đường dẫn lưu file trên máy chủ.

## Mô hình dữ liệu

```mermaid
erDiagram
    TEMPLATE ||--o{ DOCUMENT : tao
    USER ||--o{ DOCUMENT : so_huu
    TEMPLATE {
        int id PK
        string name
        string slug
        string category
        string type
        string file_path
        string thumbnail_path
        jsonb preview
    }
    USER {
        int id PK
        string name
        string email
    }
    DOCUMENT {
        uuid id PK
        int template_id FK
        int user_id FK
        string name
        string type
        string file_name
        string file_path
        jsonb values
    }
```

`Template` và `User` dùng ID số nguyên; `Document` dùng UUID. PostgreSQL lưu thông tin mẫu và file đã tạo. File mẫu và file đầu ra nằm ở các thư mục riêng. Backend chạy migration khi khởi động; TypeORM `synchronize` được tắt.

## Thư viện và giấy phép

Các thư viện chính gồm Next.js, React, NestJS, TypeORM, `pg`, `docx` và `pptxgenjs` (MIT); TypeScript, RxJS và `reflect-metadata` (Apache-2.0); `dotenv` (BSD-2-Clause). JSZip có hai lựa chọn giấy phép: MIT hoặc GPL-3.0-or-later. Danh sách phiên bản đang dùng nằm trong `package-lock.json`.
