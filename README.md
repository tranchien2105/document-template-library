# Thư viện Mẫu Tài liệu

Dự án khởi tạo cho bài kiểm tra Lập trình viên Fullstack. Giai đoạn 1 cung cấp mã nguồn nền Next.js/NestJS, cấu hình PostgreSQL/TypeORM và bộ sinh 5 mẫu DOCX cùng 3 mẫu PPTX. Giao diện thư viện hoàn chỉnh, API nghiệp vụ, thực thể cơ sở dữ liệu và trình chỉnh sửa chưa nằm trong phạm vi hiện tại.

## Công nghệ

- Giao diện: Next.js App Router, React, TypeScript.
- Máy chủ: NestJS, TypeScript; điểm kiểm tra hoạt động tại `GET /health`.
- Cơ sở dữ liệu: PostgreSQL, TypeORM; bật kết nối bằng `DATABASE_ENABLED=true`.
- Sinh file: `docx` tạo Word OOXML; `pptxgenjs` tạo PowerPoint OOXML.
- Quản lý gói: npm workspaces.

## Cấu trúc

```text
document-template-library/
├── frontend/                       # Ứng dụng nền Next.js
├── backend/                        # Ứng dụng nền NestJS và điểm kiểm tra
├── storage/templates/
│   ├── documents/                  # Các file .docx được sinh
│   ├── presentations/              # Các file .pptx được sinh
│   └── manifest.json               # Metadata và dữ liệu xem trước
├── scripts/generate-templates/     # Script sinh mẫu, tách biệt với máy chủ
├── docs/                           # Hướng dẫn và ghi chú kỹ thuật
├── .gitignore
└── package.json                    # npm workspaces và lệnh chung
```

## Yêu cầu môi trường

- Node.js 22.12 trở lên (khuyến nghị Node.js 22 LTS hiện hành).
- npm 10 trở lên.
- PostgreSQL chỉ cần khi muốn thử kết nối cơ sở dữ liệu; mặc định máy chủ không kết nối DB.

## Cài đặt

Từ thư mục `document-template-library`:

```bash
npm install
```

Tạo tệp cấu hình môi trường nếu cần:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

Không đưa file `.env` thật lên Git. `DATABASE_ENABLED` mặc định là `false`; để chuẩn bị thử PostgreSQL, đặt `DATABASE_ENABLED=true` và cập nhật các biến `DB_*`. Cấu hình TypeORM tắt `synchronize` để tránh tự sửa schema.

## Sinh bộ template

```bash
npm run templates:generate
```

Có thể chạy lại lệnh này; script tạo lại 8 tệp mẫu và cập nhật các mục ID tương ứng trong manifest, đồng thời giữ lại các mục khác. Kết quả thành công hoặc lỗi được thông báo riêng cho từng tệp.

Các file đầu ra:

| Loại | Tên file |
| --- | --- |
| Word | `business-report.docx` |
| Word | `resume.docx` |
| Word | `leave-request.docx` |
| Word | `meeting-minutes.docx` |
| Word | `project-proposal.docx` |
| PowerPoint | `company-intro.pptx` |
| PowerPoint | `business-review.pptx` |
| PowerPoint | `project-plan.pptx` |

Tệp Word lưu tại `storage/templates/documents/`, PowerPoint lưu tại `storage/templates/presentations/`. Metadata nằm ở `storage/templates/manifest.json`; ID là số nguyên ổn định (1–8). `thumbnailPath` hiện là `null`; manifest có dàn ý và tiêu đề slide để giao diện hiển thị bản xem trước dạng văn bản.

## Chạy ứng dụng

Chạy trong hai cửa sổ dòng lệnh từ thư mục dự án:

```bash
npm run dev:frontend
npm run dev:backend
```

- Giao diện: <http://localhost:3000>
- Máy chủ: <http://localhost:3001/health>

Đây là trang khởi tạo tối giản; chưa có giao diện quản lý mẫu. Máy chủ hiện chỉ có điểm kiểm tra hoạt động, chưa có API quản lý mẫu hay nghiệp vụ tài liệu.

Các lệnh kiểm tra:

```bash
npm run typecheck
npm run lint
npm run build
```

## Metadata và bản xem trước

Manifest là danh sách dữ liệu, không phụ thuộc vào một thành phần giao diện cụ thể. Để thêm mẫu, bổ sung định nghĩa và nội dung trong `scripts/generate-templates/generate.mjs`; script sẽ sinh tệp và thêm hoặc cập nhật metadata. Cấu trúc được mô tả trong [docs/template-manifest.md](docs/template-manifest.md).

Môi trường thực hiện không có LibreOffice/soffice để chuyển DOCX/PPTX thành ảnh; vì vậy không tạo hình thu nhỏ giả. Có thể bổ sung công cụ chuyển đổi ở giai đoạn sau và lưu ảnh thật cạnh tệp mẫu.

## Giới hạn hiện tại và giai đoạn tiếp theo

- Chưa có giao diện thư viện mẫu hoàn chỉnh.
- Chưa có thực thể, migration, dữ liệu khởi tạo hoặc API nghiệp vụ.
- Chưa có xác thực, tạo bản sao tài liệu hay trình chỉnh sửa.
- Bản xem trước hiện là dàn ý metadata, không phải ảnh chuyển đổi từ Office.
- Các trường `{{placeholder}}` trong mẫu là nội dung để người dùng thay thế; chưa có hệ thống tự điền placeholder.

Giai đoạn tiếp theo có thể triển khai theo thứ tự: thiết kế thực thể và migration PostgreSQL; API danh sách và chi tiết mẫu; tải tệp mẫu và tạo bản sao; lưu metadata tệp; luồng chỉnh sửa dữ liệu/placeholder và xuất tệp; sau đó xây dựng giao diện và xác thực theo yêu cầu sản phẩm.

## Thư viện bên thứ ba và giấy phép

Các giấy phép dưới đây được đối chiếu với trường `license` trong metadata của các gói đã cài và khóa trong `package-lock.json`; nhóm thư viện chính cũng được đối chiếu trên trang gói npm. Phiên bản cụ thể được ghi trong lockfile:

| Giấy phép | Các gói phụ thuộc trực tiếp trong mã nguồn |
| --- | --- |
| MIT | `next` 16.4.3, `react`/`react-dom` 19.3.1, `@nestjs/common`, `@nestjs/core`, `@nestjs/platform-express`, `@nestjs/typeorm` (Nest 11), `@nestjs/cli`, `@nestjs/schematics`, `typeorm` 0.3.31, `pg` 8.23.1, `docx` 9.15.0, `pptxgenjs` 4.0.1, `eslint` 9.39.5, `eslint-config-next`, `@eslint/js`, `typescript-eslint`, `@types/node`, `@types/react`, `@types/react-dom`, `@types/express` |
| Apache-2.0 | `typescript` 5.9.3, `reflect-metadata` 0.2.2, `rxjs` 7.8.2 |
| BSD-2-Clause | `dotenv` 17.4.2 |

Nguồn gói đã đối chiếu: [Next.js](https://www.npmjs.com/package/next), [React](https://www.npmjs.com/package/react), [React DOM](https://www.npmjs.com/package/react-dom), [NestJS](https://www.npmjs.com/package/%40nestjs/core), [tích hợp NestJS và TypeORM](https://www.npmjs.com/package/%40nestjs/typeorm), [TypeORM](https://www.npmjs.com/package/typeorm), [`pg`](https://www.npmjs.com/package/pg), [`docx`](https://www.npmjs.com/package/docx), [`pptxgenjs`](https://www.npmjs.com/package/pptxgenjs), [TypeScript](https://www.npmjs.com/package/typescript), [`reflect-metadata`](https://www.npmjs.com/package/reflect-metadata), [ESLint](https://www.npmjs.com/package/eslint), [dotenv](https://www.npmjs.com/package/dotenv). Các gói phụ thuộc gián tiếp có thể dùng giấy phép khác; chưa lập báo cáo license cho toàn bộ cây phụ thuộc, vì vậy cần rà soát lockfile trước khi phát hành thương mại.

## Công khai việc sử dụng AI

AI đã được sử dụng để hỗ trợ lập trình trong giai đoạn khởi tạo này, gồm dựng cấu trúc mã nguồn, soạn nội dung mẫu và viết script sinh DOCX/PPTX. Người thực hiện cần rà soát nội dung, mã nguồn và giấy phép các gói phụ thuộc trước khi nộp hoặc phát hành.
