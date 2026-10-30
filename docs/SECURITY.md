# Ghi chú bảo mật Papertrail

Papertrail hiện là ứng dụng thử nghiệm dùng chung một tài khoản. Các biện pháp dưới đây giảm một số rủi ro thường gặp, nhưng không đảm bảo mọi tệp Office đều an toàn và không tạo cơ chế riêng tư cho từng người dùng.

## Tóm tắt rà soát

| Hạng mục | Trạng thái | Kết quả |
| --- | --- | --- |
| SQL injection | ĐẠT | Giá trị tìm kiếm, bộ lọc và phân trang được truyền dưới dạng tham số TypeORM; trường sắp xếp được cố định trong code. |
| Kiểm tra yêu cầu | MỘT PHẦN | ID, tham số tìm kiếm, thông tin mẫu và trường biểu mẫu được kiểm tra. DTO được kiểm tra trong service/controller; chưa bật `ValidationPipe` toàn cục vì DTO chưa dùng decorator xác thực. |
| Kiểm tra file Office tải lên | ĐẠT CÓ GIỚI HẠN | Kiểm tra phần mở rộng, MIME khai báo, cấu trúc ZIP, kích thước, tỷ lệ nén, CRC, các thành phần OOXML và liên kết nội bộ. Chưa kiểm tra toàn bộ chuẩn OOXML hoặc quét mã độc. |
| Đường dẫn và symlink | ĐẠT | Đường dẫn được giữ trong thư mục lưu trữ đã cấu hình và kiểm tra theo đường dẫn thực; tên file đầu ra dùng UUID. |
| Tải file đã tạo | ĐẠT TRONG MÔ HÌNH DEMO | Cần có bản ghi database; đường dẫn phải khớp UUID và loại file; tên file được làm sạch trước khi đưa vào header tải xuống. |
| Cô lập người dùng | CHƯA CÓ | Mọi khách truy cập dùng chung Demo User không có xác thực. UUID chỉ là mã định danh, không phải cơ chế phân quyền. |
| Hiển thị nội dung trên frontend | ĐẠT QUA RÀ SOÁT | React hiển thị tên mẫu và nội dung tài liệu dưới dạng văn bản. Không tìm thấy `dangerouslySetInnerHTML`, `innerHTML` hoặc `eval` trong `frontend/src`. |
| Cô lập công cụ render | KHÔNG ÁP DỤNG | Ứng dụng không chạy LibreOffice hoặc công cụ render Office khác. Preview slide/tài liệu là nội dung minh họa dựa trên metadata. |

## Các biện pháp đã triển khai

- **Giới hạn upload và cấu trúc request:** Interceptor giới hạn kích thước file và các trường multipart. `TEMPLATE_UPLOAD_MAX_BYTES` nhận giá trị từ 1–50 MiB, mặc định 10 MiB. Lỗi vượt giới hạn Multer trả HTTP 413 mà không tiết lộ thông tin nội bộ.
- **Kiểm tra gói Office:** `backend/src/common/office-package.ts` kiểm tra metadata central directory của ZIP trước khi xử lý bằng JSZip. Từ chối archive chia phần/ZIP64, mã hóa hoặc dùng phương thức nén không hỗ trợ, đường dẫn trùng/không an toàn, symlink, quá nhiều entry, file giải nén lớn hơn 32 MiB, tổng dung lượng giải nén trên 128 MiB và tỷ lệ nén trên 200:1. Các entry được giải nén với giới hạn đầu ra; kích thước thực tế và CRC được xác minh trước khi đọc các phần OOXML bị giới hạn.
- **Kiểm tra OOXML và nội dung chủ động:** File tải lên phải có content type đúng loại tài liệu/trình chiếu, root office-document relationship, main part và các relationship nội bộ có thể phân giải. Từ chối khai báo bật macro, VBA, embedded object, ActiveX, custom UI, liên kết dữ liệu ngoài và phần mở rộng đáng ngờ của file thực thi/script. Hyperlink bên ngoài chỉ chấp nhận HTTP(S) và mailto. Đây là bảo vệ cấu trúc, không phải trình phân tích đầy đủ chuẩn Office hay công cụ quét mã độc.
- **Kiểm tra MIME:** `TemplateService` yêu cầu MIME tương ứng với loại Office hoặc tín hiệu chung `application/octet-stream`, sau đó vẫn xác minh cấu trúc gói. MIME do client khai báo không được xem là bằng chứng file an toàn.
- **An toàn đường dẫn và ghi file:** `backend/src/common/storage.ts` kiểm tra real path chuẩn để ngăn thoát khỏi thư mục gốc qua symlink. File mới được tạo ở chế độ độc quyền (`O_EXCL`, `O_NOFOLLOW` nếu hệ thống hỗ trợ) và quyền hạn chế `0600`; va chạm tên không thể ghi đè hoặc xóa file có sẵn. Mẫu gốc không bị chỉnh sửa khi tạo file.
- **Dọn file đầu ra và tải xuống:** Tên DOCX/PPTX đầu ra dùng UUID. File được tạo sẽ bị xóa nếu lưu metadata thất bại. Tra cứu tải xuống yêu cầu bản ghi đã lưu, UUID canonical, đường dẫn khớp mẫu `{documents|presentations}/{id}.{extension}` và file tồn tại, không rỗng. Phản hồi tải file đặt `X-Content-Type-Options: nosniff` và dùng tên file đã làm sạch.
- **Database và xử lý request:** `TemplateService` dùng tham số trong query builder, trường sắp xếp cố định, phân trang có giới hạn, allowlist cho trường cập nhật và kiểm tra giá trị placeholder. Lỗi nội bộ trả thông báo upload/tải file chung; response API có các header `nosniff`, chặn frame, chính sách referrer hạn chế và cache `no-store`.
- **CORS:** `CORS_ORIGIN` là danh sách origin tường minh, phân cách bằng dấu phẩy và tắt credentials. Cấu hình wildcard bị từ chối khi `NODE_ENV=production`. CORS chỉ kiểm soát truy cập từ trình duyệt, không thay thế xác thực.
- **Quyền sở hữu tài liệu:** Danh sách, metadata và tải xuống được giới hạn theo Demo User do server xác định khi repository người dùng được cấu hình. Do không có đăng nhập hay phân quyền, điều này không tạo ra tính riêng tư giữa các khách truy cập.

## Kết quả kiểm tra đã thực hiện

Bộ test backend kiểm tra file DOCX/PPTX tải lên, từ chối ZIP thường, gói nén bất thường và MIME sai; kiểm tra giới hạn upload, lỗi 413, traversal, symlink, ghi file đồng thời, bảo toàn mẫu nguồn và dọn file khi lưu metadata thất bại. Test cũng kiểm tra 8 gói Office đi kèm cùng các luồng tạo file.

Các lệnh dưới đây được chạy lại ngày 30/10/2026 bằng Node.js 22 và npm 11:

| Kiểm tra | Kết quả |
| --- | --- |
| `npm run typecheck` | ĐẠT |
| `npm run lint` | ĐẠT |
| `npm run build` | ĐẠT |
| `npm test` | ĐẠT — 25 bài test |
| Rà frontend tìm `dangerouslySetInnerHTML`, `innerHTML`, `eval` | ĐẠT — không có kết quả trong `frontend/src` |
| Test API kết nối PostgreSQL thật | CHƯA CHẠY |
| Thử luồng bằng trình duyệt và mở file với Office | CHƯA CHẠY |

## Rủi ro và giới hạn còn lại

- API upload, sửa/xóa mẫu, metadata tài liệu và tải file chưa yêu cầu đăng nhập. Phải bảo vệ các endpoint quản lý trước khi triển khai công khai.
- Mọi khách truy cập đều thấy tài liệu của cùng Demo User. Gán Demo User chỉ phục vụ demo, không phải phân quyền hoặc cô lập tenant.
- Kiểm tra Office bao phủ cấu trúc ZIP, giải nén có giới hạn, content type và relationships chính; chưa triển khai mọi quy tắc schema OOXML và không quét mã độc. Không nhận upload công khai tùy ý nếu thiếu bước quét/xử lý cô lập.
- Nội dung upload được giữ trong bộ nhớ đến giới hạn cấu hình. Chưa có rate limit hoặc quota tài nguyên cho upload đồng thời.
- Kiểm tra storage giúp giảm nguy cơ symlink/path escape, nhưng không phải ranh giới lưu trữ đa tenant được gia cố chống lại kẻ tấn công có quyền truy cập hệ điều hành vào tài khoản chạy server hoặc thư mục storage.
- Frontend không render HTML tải lên. Nội dung được hiển thị dạng text qua cơ chế escape của React; preview Office không phải trang đã render thực tế.
- `synchronize` vẫn tắt. Thay đổi schema database tiếp tục được quản lý bằng migration.

## Nếu được hỏi về bảo mật trong buổi phỏng vấn

### 1. Ngăn ZIP bomb và file Office lỗi cấu trúc

- **Nguy cơ:** File nén nhỏ nhưng bung ra dung lượng khổng lồ, OOXML không hợp lệ hoặc archive không phải Office nhưng đổi đuôi thành `.docx`/`.pptx`.
- **Triển khai:** `backend/src/common/office-package.ts` (`preflightZip`, `validateOfficeArchive`, `loadValidatedOfficePackage`) và `TemplateService.uploadDocumentTemplate` / `uploadPresentationTemplate`.
- **Cách hoạt động:** Kiểm tra header ZIP và metadata central directory; giới hạn số entry, kích thước giải nén và tỷ lệ nén; giải nén từng entry có giới hạn đầu ra; xác minh kích thước, CRC, các phần OOXML và relationships quan trọng.
- **Bằng chứng:** Test backend từ chối ZIP thường và archive có tỷ lệ nén cao; 5 DOCX và 3 PPTX đi kèm đều qua validator.
- **Giới hạn:** Không thay thế antivirus và không xác thực toàn bộ schema OOXML.

### 2. Ngăn path traversal và symlink escape

- **Nguy cơ:** Đường dẫn metadata hoặc symlink có chủ ý khiến server đọc/trả file nằm ngoài thư mục template hoặc generated.
- **Triển khai:** `backend/src/common/storage.ts` (`safeTemplatePath`, `safeGeneratedPath`, `assertSafeDirectory`).
- **Cách hoạt động:** Kiểm tra đường dẫn tương đối và real path chuẩn so với storage root đã cấu hình trước khi đọc, ghi hoặc tải file.
- **Bằng chứng:** Test từ chối đường dẫn traversal và symlink mẫu trỏ tới `/etc/passwd`.
- **Giới hạn:** Kẻ tấn công có quyền sửa filesystem của server vẫn có thể thay đổi môi trường lưu trữ; đây không phải sandbox hệ điều hành.

### 3. Ngăn ghi đè đầu ra và va chạm request

- **Nguy cơ:** Hai lần tạo file trùng tên hoặc đường dẫn đầu ra đoán được ghi đè file có sẵn.
- **Triển khai:** `backend/src/common/storage.ts` (`writeNewFile`) và `TemplateService.createDocument` / `copyPresentation`.
- **Cách hoạt động:** Mỗi request dùng đường dẫn UUID và mở file ở chế độ độc quyền, không theo symlink nếu hệ điều hành hỗ trợ. Nếu lưu database thất bại, chỉ xóa file do request đó vừa tạo.
- **Bằng chứng:** Test tự động xác nhận file hiện có không bị ghi đè; test tạo file xác nhận mẫu gốc không đổi và file đầu ra bị dọn khi ghi database lỗi.
- **Giới hạn:** Quyền truy cập storage và hạn ngạch ổ đĩa vẫn cần được vận hành phù hợp.

### 4. Ngăn tải xuống file tùy ý

- **Nguy cơ:** Client truyền đường dẫn hoặc sửa metadata để lấy file khác trên server, hoặc response bị trình duyệt hiểu thành nội dung chủ động.
- **Triển khai:** `TemplateService.file`, `DocumentsService.getForDownload` và `GeneratedFileController.download`.
- **Cách hoạt động:** UUID được tra qua bản ghi đã lưu; đường dẫn phải khớp chính xác quy ước UUID/loại file; file phải tồn tại; tên file được làm sạch; response đặt `nosniff`.
- **Bằng chứng:** Test bao phủ bản ghi/file không tồn tại, lọc trường metadata công khai và loại file sinh hợp lệ.
- **Giới hạn:** Không có xác thực nên khách truy cập biết hoặc lấy được UUID tài liệu Demo User vẫn có thể yêu cầu tải file.

### 5. Ngăn SQL injection và thay placeholder không an toàn

- **Nguy cơ:** Đầu vào tìm kiếm/bộ lọc làm thay đổi cấu trúc SQL hoặc văn bản chèn vào tài liệu làm hỏng OOXML.
- **Triển khai:** `TemplateService.list`, `validateTemplateValues`, `replaceDocxPlaceholders` và `replacePptxPlaceholders`.
- **Cách hoạt động:** Query dùng tham số TypeORM; sắp xếp được cố định; chỉ nhận trường đã khai báo trong template; ký tự không hợp lệ trong XML bị từ chối và ký tự đặc biệt XML được escape.
- **Bằng chứng:** Test hiện có kiểm tra lọc kết hợp, query/trường không hợp lệ, XML escaping và placeholder bị chia qua nhiều run.
- **Giới hạn:** Các tính năng query/sort bổ sung sau này cần tiếp tục dùng tham số và allowlist.

### 6. Giải thích giới hạn của Demo User

- **Nguy cơ:** Nhầm danh tính demo dùng chung hoặc UUID ngẫu nhiên với cơ chế xác thực/phân quyền thật.
- **Triển khai:** `DocumentsService` phân giải Demo User ở server và giới hạn bản ghi theo user đó; ứng dụng chưa có module xác thực.
- **Cách hoạt động:** Trình duyệt không thể chọn chủ sở hữu tùy ý, nhưng mọi khách truy cập chưa xác thực vẫn dùng chung danh tính demo này.
- **Bằng chứng:** Unit test xác minh server gán chủ sở hữu và giới hạn danh sách theo user.
- **Giới hạn:** Cần thêm xác thực và phân quyền trên mọi endpoint tài liệu/quản lý trước khi chạy production hoặc công khai.
