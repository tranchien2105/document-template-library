# Chạy thử Papertrail trên máy Windows

Thực hiện các bước dưới đây để chạy Papertrail trên Windows. Không cần cài Node.js, npm, Python hay PostgreSQL; chỉ cần Docker Desktop và kết nối Internet trong lần chạy đầu.

## Bước 1: Cài Docker Desktop

1. Mở [hướng dẫn cài Docker Desktop cho Windows của Docker](https://docs.docker.com/desktop/setup/install/windows-install/).
2. Tải Docker Desktop và cài đặt theo hướng dẫn trên màn hình. Nếu được hỏi cách chạy, chọn WSL 2.
3. Khởi động lại máy nếu trình cài đặt yêu cầu.
4. Mở ứng dụng **Docker Desktop** từ Start Menu.
5. Chờ đến khi Docker Desktop báo engine đã chạy. Giữ Docker Desktop mở trong suốt quá trình sử dụng Papertrail.

> Docker Desktop có điều khoản sử dụng riêng. Máy thuộc doanh nghiệp cần tuân theo điều khoản áp dụng của Docker.

## Bước 2: Tải source code

### Cách dễ nhất — không cần cài Git

1. Mở [repository Papertrail trên GitHub](https://github.com/tranchien2105/document-template-library).
2. Nhấn nút **Code**, chọn **Download ZIP**.
3. Mở thư mục **Downloads**, nhấn chuột phải file ZIP vừa tải và chọn **Extract All…**.
4. Mở thư mục vừa giải nén. Đi sâu vào thư mục `document-template-library-main` nếu có.
5. Kiểm tra trong thư mục đó nhìn thấy file `docker-compose.yml`.
6. Nhấn vào thanh địa chỉ của File Explorer, gõ `powershell`, rồi nhấn **Enter**. Một cửa sổ PowerShell sẽ mở đúng tại thư mục dự án.

### Nếu máy đã có Git

Mở PowerShell tại thư mục muốn chứa dự án và chạy:

```powershell
git clone https://github.com/tranchien2105/document-template-library.git
cd document-template-library
```

Kiểm tra thư mục hiện tại có `docker-compose.yml`:

```powershell
dir docker-compose.yml
```

Nếu PowerShell báo không tìm thấy file, cửa sổ đang ở sai thư mục. Dùng File Explorer mở đúng thư mục dự án rồi mở PowerShell tại đó.

## Bước 3: Khởi động Papertrail

Trong PowerShell đang ở thư mục có `docker-compose.yml`, sao chép và chạy lệnh:

```powershell
docker compose up --build
```

Lần đầu có thể mất vài phút. Docker đang tải các thành phần cần thiết, cài thư viện bên trong container, tạo database và khởi động ứng dụng. Để cửa sổ PowerShell mở trong suốt thời gian sử dụng.

Khi các dịch vụ đã khởi động, mở trình duyệt và vào:

- **Papertrail:** <http://localhost:3000>
- **Kiểm tra backend:** <http://localhost:3001/health>

Trang kiểm tra backend trả về trạng thái JSON có `"status":"ok"` khi backend sẵn sàng. Database được tạo và các mẫu ban đầu được nạp tự động khi backend chạy lần đầu.

## Bước 4: Thử các chức năng

1. Tìm một mẫu trong thư viện, ví dụ “Đơn xin nghỉ phép”.
2. Mở mẫu, sửa một vài trường và tạo DOCX.
3. Tải DOCX về máy.
4. Mở một mẫu PowerPoint, xem các slide preview, sửa trường rồi tạo và tải bản PPTX.
5. Mở “Tài liệu của tôi” để xem lại các file đã tạo.

## Bước 5: Tắt ứng dụng

1. Quay lại cửa sổ PowerShell đang chạy Docker.
2. Nhấn **Ctrl+C**.
3. Để dọn các container, chạy:

```powershell
docker compose down
```

Lệnh trên giữ lại database và file đã tạo để lần sau dùng tiếp. **Không chạy `docker compose down -v`** nếu muốn giữ dữ liệu.

## Nếu gặp lỗi

- **`docker` không được nhận diện:** Docker Desktop chưa cài xong hoặc PowerShell đã mở trước khi cài. Đóng PowerShell, mở lại; nếu vẫn lỗi, mở Docker Desktop và đợi khởi động xong.
- **Không kết nối được Docker Engine/daemon:** Docker Desktop chưa chạy. Mở Docker Desktop và chờ trạng thái engine hoạt động.
- **Lệnh chạy nhưng tải rất lâu:** lần đầu Docker cần tải image và dependency. Kiểm tra Internet và cứ để lệnh chạy; không đóng cửa sổ.
- **Báo port đã được sử dụng:** một chương trình khác đang chiếm cổng `3000`, `3001` hoặc `5432`. Dừng chương trình đang dùng cổng đó rồi chạy lại; nếu không xác định được chương trình, liên hệ người hỗ trợ máy tính.
- **Trang web chưa mở được ngay:** giữ PowerShell mở thêm một lúc; frontend chỉ khởi động sau khi backend và database sẵn sàng. Sau đó tải lại `http://localhost:3000`.
- **Muốn xem log sau khi đã chạy nền:** tại thư mục dự án, chạy `docker compose logs -f`; nhấn **Ctrl+C** để dừng xem log (các container vẫn chạy).

## Câu lệnh cần nhớ

| Việc cần làm | Lệnh |
| --- | --- |
| Chạy lần đầu hoặc build lại | `docker compose up --build` |
| Dừng ứng dụng, giữ dữ liệu | `docker compose down` |
| Xem trạng thái các dịch vụ | `docker compose ps` |
| Xem log | `docker compose logs -f` |

Các lệnh Docker Compose trên cũng dùng được trên macOS/Linux sau khi cài Docker. Cách cài Docker phụ thuộc hệ điều hành.
