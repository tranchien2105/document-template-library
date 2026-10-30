# Papertrail — Thư viện mẫu tài liệu

MVP full-stack giúp người dùng tìm kiếm, xem trước và tạo tài liệu DOCX hoặc bản trình chiếu PPTX có thể tải xuống. Giao diện và nội dung của 5 mẫu DOCX, 3 mẫu PPTX đều sử dụng tiếng Việt.

## Bản demo trực tuyến

Trải nghiệm Papertrail tại: [https://papertrail-dev.duckdns.org/](https://papertrail-dev.duckdns.org/).

## Kiến trúc

- **Frontend:** Next.js App Router, React, TypeScript.
- **Backend/API:** NestJS, TypeScript, TypeORM.
- **Cơ sở dữ liệu:** PostgreSQL; manifest là nguồn dữ liệu chuẩn ban đầu cho 8 mẫu.
- **Lưu trữ:** mẫu Office trong `storage/templates`; tệp đầu ra riêng trong `storage/generated`.
- **Xử lý tài liệu:** `docx`, `pptxgenjs`; JSZip thay placeholder DOCX trong OOXML và giữ định dạng gốc.

```text
frontend/                     Thư viện, trang chi tiết, tài liệu đã tạo và quản lý mẫu
backend/src/                  API NestJS, entity, migration và service TypeORM
scripts/generate-templates/   Script sinh và kiểm tra mẫu Office
storage/templates/            5 DOCX, 3 PPTX và manifest.json
storage/generated/            Các tệp được tạo theo từng yêu cầu
docker-compose.yml            Frontend, backend, PostgreSQL và volume lưu dữ liệu
```

## Yêu cầu và cài đặt

### Cách nhanh: chạy toàn bộ ứng dụng bằng Docker

Đây là cách thuận tiện để người đánh giá chạy dự án. Máy chỉ cần cài Docker Desktop hoặc Docker Engine có Docker Compose; không cần tự cài Node.js, npm, Python hay PostgreSQL trên máy host.

Tại thư mục gốc repository, chạy:

```bash
docker compose up --build
```

Hướng dẫn từng bước cho người mới trên Windows, gồm cách tải source từ GitHub và khắc phục lỗi thường gặp: [`docs/HUONG-DAN-CHAY-CHO-NGUOI-MOI.md`](docs/HUONG-DAN-CHAY-CHO-NGUOI-MOI.md).

Hướng dẫn triển khai production lên Ubuntu 24.04 bằng Docker Compose và Caddy: [`docs/DEPLOYMENT-UBUNTU.md`](docs/DEPLOYMENT-UBUNTU.md). Cấu hình production nằm trong `docker-compose.prod.yml`; cấu hình phát triển bên dưới không bị thay đổi.

Lần đầu chạy, Docker sẽ tải image nền và cài dependency trong lúc build, nên cần Internet và có thể mất vài phút. Khi các dịch vụ đã khởi động:

- Website: <http://localhost:3000>
- API: <http://localhost:3001/api/templates>
- Kiểm tra backend: <http://localhost:3001/health>

Nhấn `Ctrl+C` để dừng, rồi có thể chạy lại cùng lệnh. `docker compose down` dừng và xóa container nhưng giữ database và file đã tạo. **Không dùng `docker compose down -v` nếu muốn giữ dữ liệu**, vì `-v` xóa volume database và file đầu ra. Mẫu tải lên được lưu trong `storage/templates` trên máy host.

Port mặc định: frontend `3000`, API `3001`, PostgreSQL `5432`. Để đổi port hoặc mật khẩu database, tạo `.env` từ `.env.example` rồi chỉnh `FRONTEND_PORT`, `API_PORT`, `DB_PORT` hoặc `DB_PASSWORD`. Không đưa `.env` chứa thông tin riêng lên GitHub.

### Cách phát triển trực tiếp trên máy

Yêu cầu Node.js 22.12 trở lên, npm 10 trở lên, Python 3 (cho validator Office Open XML) và Docker Compose (cho PostgreSQL).

Cài dependency tại thư mục gốc:

```bash
npm install
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

Đặt cùng một giá trị `DB_PASSWORD` khác mặc định trong `.env` gốc (Docker Compose dùng) và `backend/.env` (NestJS dùng). Không đưa file môi trường có bí mật lên Git.

Khởi động riêng database:

```bash
docker compose up -d postgres
docker compose ps
```

Khi backend khởi động, TypeORM chạy các migration bổ sung (đã tắt `synchronize`), rồi đồng bộ dữ liệu mẫu từ `storage/templates/manifest.json`. Việc đồng bộ kiểm tra ID, slug, metadata, đường dẫn được phép, phần mở rộng và sự tồn tại của file. Mẫu đóng gói được cập nhật theo ID số nguyên ổn định; mẫu đã tải lên trong `uploads/` vẫn được giữ. Migration gán tài liệu hiện có cho Demo User được seed. Để khởi tạo database trống, hãy dùng named volume mới; **xóa volume sẽ xóa dữ liệu bên trong**.

Sinh lại các file Office và manifest:

```bash
npm run templates:generate
```

Chỉ sinh lại 5 DOCX, giữ nguyên PPTX:

```bash
npm run templates:generate:documents
```

Chỉ sinh lại 3 PPTX cùng metadata trường chỉnh sửa:

```bash
npm run templates:generate -- --presentations-only
```

Các lệnh sinh mẫu chạy `scripts/generate-templates/build-previews.py` để dựng metadata xem trước từ gói Office và đồng bộ màu các mẫu với Papertrail, sau đó chạy `scripts/generate-templates/validate-office.py`. Validator kiểm tra ZIP, XML, content type, relationship và ID, numbering của Word, số slide, placeholder PPTX và tính nhất quán manifest. Nếu cài LibreOffice, script còn chuyển các mẫu sang PDF ở chế độ headless để kiểm tra tương thích độc lập.

Chạy backend và frontend ở hai terminal riêng:

```bash
npm run dev:backend
npm run dev:frontend
```

- Website: <http://localhost:3000>
- Health check: <http://localhost:3001/health>
- API: <http://localhost:3001/api/templates>

Backend đọc `backend/.env`; trình duyệt đọc `frontend/.env.local`. Đặt `NEXT_PUBLIC_API_BASE_URL` nếu API ở địa chỉ khác. Cấu hình origin frontend được phép qua `CORS_ORIGIN` trong backend; nhiều origin phân tách bằng dấu phẩy.

## Chức năng

- Tìm kiếm, lọc mẫu theo loại và danh mục; kết quả phân trang lấy từ PostgreSQL.
- Tìm kiếm tiếng Việt xét cả slug và nội dung preview. Tên, mô tả, danh mục và nhãn form được hiển thị bằng tiếng Việt.
- Trang chi tiết dựng lại đoạn văn, tiêu đề, danh sách, bảng và placeholder DOCX từ `word/document.xml`. PPTX preview đọc shape, văn bản, vị trí và màu từ gói trình chiếu. Sửa trường sẽ cập nhật nội dung preview liên quan.
- Trường DOCX lấy từ placeholder trong metadata manifest. Backend kiểm tra khóa và độ dài; thay token trong XML tài liệu, header, footer, kể cả khi token bị chia qua nhiều Word run; sau đó tạo DOCX riêng.
- Tạo PPTX kiểm tra và thay placeholder slide đã khai báo, lưu giá trị gửi lên, không sửa bản nguồn.
- Metadata file được tạo lưu trong PostgreSQL. `GET /api/documents/:uuid` trả metadata công khai, không trả đường dẫn hệ thống hoặc giá trị form.
- File thuộc về `Demo User` (`demo@papertrail.local`) do server xác định; client không chọn chủ sở hữu. Trang “Tài liệu của tôi” đọc danh sách từ PostgreSQL và tải được file thật.
- Trang “Quản lý mẫu” hỗ trợ tải DOCX/PPTX lên. API kiểm tra gói Office, trích trường DOCX hoặc tiêu đề slide và placeholder PPTX (kể cả token tách giữa các text run), lưu riêng file nguồn và giữ mẫu sau khi backend khởi động lại. PPTX cũ thiếu metadata trường được bổ sung từ file nguồn khi mở hoặc tạo bản sao.
- `PATCH /api/templates/:id` sửa metadata; `DELETE /api/templates/:id` ngừng kích hoạt mẫu mà không xóa file nguồn.
- Tải xuống dùng UUID do server sinh, không dùng đường dẫn filesystem do client cung cấp.
- Thay đổi schema dùng migration tường minh; không bật đồng bộ schema có thể phá hủy dữ liệu.

## API

| Phương thức | Đường dẫn | Chức năng |
| --- | --- | --- |
| `GET` | `/health` | Kiểm tra trạng thái API |
| `GET` | `/api/templates?type=document&category=Kinh%20doanh&search=báo%20cáo&page=1&limit=12` | Tìm kiếm, lọc, phân trang |
| `GET` | `/api/templates/categories` | Lấy danh mục đang hoạt động |
| `GET` | `/api/templates/:id` | Metadata và trường preview của mẫu |
| `GET` | `/api/templates/:id/preview` | Metadata dàn ý hoặc slide preview |
| `POST` | `/api/templates` | Tải DOCX bằng multipart `file`, `name`, `description`, `category` (tối đa 10 MB) |
| `POST` | `/api/templates/presentations` | Tải PPTX bằng `multipart/form-data`: `file`, `name`, `description`, `category` |
| `POST` | `/api/templates/:id/documents` | Tạo DOCX, JSON `{ "values": { "cong_ty_ten": "..." } }` |
| `POST` | `/api/templates/:id/copies` | Tạo bản sao PPTX, JSON tùy chọn `{ "values": { "field_key": "..." } }` |
| `GET` | `/api/documents/:uuid` | Lấy metadata công khai của file đã tạo |
| `GET` | `/api/documents` | Liệt kê file của người dùng demo |
| `GET` | `/api/files/:uuid` | Tải file đã tạo |
| `PATCH` | `/api/templates/:id` | Sửa `name`, `description` hoặc `category` |
| `DELETE` | `/api/templates/:id` | Ngừng kích hoạt mẫu, giữ file nguồn |

API danh sách trả `{ items, meta: { page, limit, total, totalPages } }`. API tạo file trả `{ id, fileName, downloadUrl }`. ID mẫu không tồn tại trả 404; đầu vào không hợp lệ trả 400. Bản ghi lưu mẫu, tên hiển thị, loại/tên file, đường dẫn tương đối và giá trị trường đã kiểm tra. Metadata công khai không chứa đường dẫn lưu trữ hay giá trị form. File đầu ra nằm trong `storage/generated/documents` và `storage/generated/presentations`.

Ví dụ tạo DOCX bằng các khóa trong `preview.fields` của mẫu:

```bash
curl -X POST http://localhost:3001/api/templates/3/documents \
  -H 'Content-Type: application/json' \
  -d '{"values":{"nhan_vien_ten":"Nguyễn Minh An","phong_ban":"Sản phẩm","nghi_phep_bat_dau_ngay":"02/11/2026","nghi_phep_ket_thuc_ngay":"03/11/2026","nghi_phep_ly_do":"Giải quyết việc gia đình"}}'
```

Ví dụ tạo PPTX và xem metadata đã lưu:

```bash
curl -X POST http://localhost:3001/api/templates/6/copies \
  -H 'Content-Type: application/json' \
  -d '{"values":{"cong_ty_ten":"Công ty Minh An","lien_he_email":"lienhe@example.com"}}'
curl http://localhost:3001/api/documents/<uuid-nhan-duoc>
```

`User` và `Template` dùng ID số nguyên; MVP seed một Demo User cố định. `Document` dùng UUID, tham chiếu `Template.id` và `User.id`, lưu metadata file cùng giá trị trường đã kiểm tra dưới dạng JSONB. Metadata công khai trả URL tải nhưng không trả đường dẫn file hoặc giá trị form.

Mở <http://localhost:3000/documents> để xem file đã tạo; mở <http://localhost:3000/manage-templates> để thêm DOCX hoặc PPTX. DOCX tải lên cần ít nhất một placeholder văn bản Word dạng `{{field_name}}`. Placeholder PPTX cùng định dạng được trích theo slide, hiển thị thành trường chỉnh sửa ở trang chi tiết và được thay trong bản sao khi gửi.

## Danh mục mẫu

**DOCX:** `business-report.docx`, `resume.docx`, `leave-request.docx`, `meeting-minutes.docx`, `project-proposal.docx`.

**PPTX:** `company-intro.pptx` (6 slide), `business-review.pptx` (6 slide), `project-plan.pptx` (7 slide).

Các mẫu có nội dung và placeholder tiếng Việt. Preview được dựng từ cấu trúc gói Office thật, không phải ảnh chụp pixel-perfect; phân trang Word và font có thể khác tùy ứng dụng. Có thể tải thumbnail PNG, JPG hoặc WebP từ “Quản lý mẫu”. Mẫu không có thumbnail sẽ hiển thị ảnh bìa minh họa có nhãn rõ ràng.

## Build, kiểm tra và test

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

Lệnh test backend build backend rồi chạy Node test runner. Test bao gồm thay placeholder DOCX bị chia run, escape XML, chặn path traversal, kiểm tra 8 gói Office Open XML, kiểm tra placeholder, bảo toàn file nguồn, lưu metadata, dọn file khi lưu metadata thất bại và lọc metadata công khai. Kiểm tra API với PostgreSQL cần database đang chạy; repository chưa có container riêng cho test tích hợp database.

Kịch bản demo nhà tuyển dụng: [`docs/DEMO.md`](docs/DEMO.md). Checklist bàn giao, gồm các bước tự quay video: [`docs/HANDOVER.md`](docs/HANDOVER.md).

## Giới hạn hiện tại

- Ứng dụng dùng một Demo User, chưa có xác thực/phân quyền. Trước khi triển khai thực tế cần xác thực và kiểm tra quyền sở hữu trước khi cho truy cập metadata hoặc tải file.
- Trình soạn DOCX chỉ sửa các trường được định nghĩa trong mẫu, không phải trình soạn thảo Word đầy đủ.
- PPTX hỗ trợ thay trường văn bản đã khai báo, chưa có trình chỉnh sửa slide tự do. Trang chi tiết preview các trường được hỗ trợ theo slide.
- Preview dựng nội dung và thuộc tính bố cục từ OOXML, không nhúng renderer của Word/PowerPoint; phân trang, kích thước chữ và hiệu ứng có thể khác.
- Giá trị trường DOCX/PPTX lưu cùng metadata file cho mục đích demo; API công khai không trả các giá trị này. Khách truy cập chưa xác thực dùng chung danh sách tài liệu của Demo User.
- Kiểm tra upload gồm phần mở rộng, MIME khai báo, giới hạn central directory ZIP, CRC, OOXML bắt buộc và quan hệ nội bộ. Macro và nội dung chủ động nhúng bị từ chối. `TEMPLATE_UPLOAD_MAX_BYTES` cấu hình giới hạn upload (mặc định 10 MiB; chấp nhận 1–50 MiB). Đây không phải antivirus hoặc xác thực OOXML đầy đủ. Chi tiết và bằng chứng test: [`docs/SECURITY.md`](docs/SECURITY.md).
- Đường dẫn được giới hạn trong storage root; tên file do server sinh và tạo theo chế độ không ghi đè; tải file dựa trên bản ghi UUID. Quản lý mẫu và tài liệu dùng chung chưa có xác thực; không công khai như dịch vụ đa người dùng.
- Backend không khởi động hoàn chỉnh nếu PostgreSQL không sẵn sàng.

## Hướng phát triển tiếp theo

1. Bổ sung test tích hợp PostgreSQL cho lọc, migration, upload và lỗi API.
2. Tạo thumbnail render bằng LibreOffice trong pipeline build được kiểm soát.
3. Thêm chính sách lưu giữ và dọn file sinh ra.
4. Bổ sung xác thực, phân quyền, quét file tải lên và quyền truy cập theo người dùng trước khi triển khai thực tế.

Chi tiết kiểm soát bảo mật, bằng chứng kiểm tra và rủi ro còn lại: [`docs/SECURITY.md`](docs/SECURITY.md).

## Thư viện bên thứ ba và công khai sử dụng AI

Phiên bản dependency trực tiếp nằm trong `package-lock.json`. Metadata package đã cài ghi nhận Next.js, React, NestJS, TypeORM, `docx`, `pptxgenjs` và `pg` dùng MIT; TypeScript, RxJS và `reflect-metadata` dùng Apache-2.0; `dotenv` dùng BSD-2-Clause; JSZip có lựa chọn giấy phép `(MIT OR GPL-3.0-or-later)`. Trước khi phân phối thương mại, hãy rà soát điều khoản giấy phép và toàn bộ dependency bắc cầu.

Các công cụ AI hỗ trợ lập trình, bao gồm OpenAI Codex, được sử dụng để hỗ trợ triển khai, rà soát, viết tài liệu, tạo nội dung mẫu tiếng Việt và kiểm tra. Chủ dự án cần rà soát tài liệu được tạo và dependency trước khi nộp hoặc phát hành.
