# Chatbot NB

Ứng dụng trợ lý ảo nội bộ gồm backend REST API (Express.js, TypeORM) và frontend React/Vite. Dữ liệu được lưu trong PostgreSQL; tính năng hỏi đáp theo tài liệu sử dụng OpenAI và pgvector.

## Thành phần và chức năng

- `chatbot_NB_BE/`: API đăng nhập, người dùng, hội thoại, chatbot và quản lý tài liệu.
- `chatbot_NB_FE/`: giao diện đăng nhập, chat, quản trị người dùng và import tài liệu.
- Tài liệu import hiện hỗ trợ `.docx`, tối đa 10 file mỗi lần và 50 MB mỗi file. Backend trích xuất nội dung, chia đoạn, lưu file vào `chatbot_NB_BE/uploads/` và lưu metadata trong PostgreSQL.
- Mỗi tài liệu được tạo embedding bằng OpenAI Embeddings; phần tìm kiếm vector cần extension pgvector.

## Yêu cầu

- Node.js 20.19+ hoặc 22.12+ và npm. Vite 7 yêu cầu các phiên bản Node này.
- PostgreSQL có cài extension pgvector. Tài khoản DB cần quyền kết nối, tạo/đọc/ghi bảng và tạo extension `vector` nếu migration cần bật extension.
- OpenAI API key có quyền gọi Chat Completions và Embeddings. Backend hiện khởi tạo OpenAI client ngay khi nạp module, nên thiếu `OPENAI_API_KEY` có thể làm server dừng ngay lúc khởi động.

## Cấu hình backend

Mở terminal tại thư mục backend và tạo file `chatbot_NB_BE/.env`:

```env
PORT=3000

DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_database_password
DB_DATABASE=chatbot_nb

JWT_SECRET=replace_with_a_long_random_secret
JWT_EXPIRES_IN=1d

OPENAI_API_KEY=your_openai_api_key
CHATGPT_MODEL=gpt-4o-mini
OPENAI_EMBED_MODEL=text-embedding-3-small
OPENAI_API_BASE=https://api.openai.com
```

`PORT`, `JWT_EXPIRES_IN`, `CHATGPT_MODEL`, `OPENAI_EMBED_MODEL` và `OPENAI_API_BASE` có giá trị mặc định trong code (hoặc là tùy chọn). Các biến `DB_*`, `JWT_SECRET` và `OPENAI_API_KEY` cần được cấu hình cho môi trường chạy. Giữ `.env` riêng tư, không commit API key, mật khẩu DB hoặc JWT secret.

Tạo database `chatbot_nb` trong PostgreSQL nếu database đó chưa có. Ví dụ với `psql`:

```sql
CREATE DATABASE chatbot_nb;
```

### Lưu ý quan trọng về schema và migration

Backend đang đặt `synchronize: false`, vì vậy server không tự tạo schema khi khởi động. Hiện trạng migration trong repo cũng chưa cung cấp quy trình bootstrap đáng tin cậy cho database trống:

- TypeORM chỉ quét `chatbot_NB_BE/src/migrations/*.js`.
- Hai file trong `chatbot_NB_BE/src/database/migrations/` không nằm trong đường dẫn migration đang cấu hình.
- Migration đang được nạp giả định một số bảng đã tồn tại; file `InitMigration1766116752523.js` trong `src/migrations` hiện bị comment toàn bộ.

Do đó, với database mới, cần có schema/bản dump tương thích của dự án trước khi chạy ứng dụng. Nếu được cung cấp bản dump, hãy restore vào database đã tạo và kiểm tra schema trước. Không chạy migration trên database production hoặc database có dữ liệu nếu chưa xác nhận trạng thái migration và backup.

Khi database đã có schema nền phù hợp, các lệnh migration có sẵn (chạy từ thư mục backend) là:

```powershell
npm run migration:run
```

Lệnh revert migration gần nhất:

```powershell
npm run migration:revert
```

`migration:generate` dùng để tạo migration từ thay đổi entity so với schema của database đang kết nối; cần kiểm tra file được tạo trước khi chạy trên dữ liệu thật.

## Cài đặt và chạy backend

Trong terminal thứ nhất:

```powershell
cd chatbot_NB_BE
npm install
npm run dev
```

`npm run dev` chạy `nodemon src/server.js`. Chạy chế độ thường bằng `npm start`.

Khi kết nối thành công, server lắng nghe tại `http://localhost:3000` (hoặc cổng trong `PORT`). Mở `http://localhost:3000/` để kiểm tra route gốc. API nằm dưới tiền tố `/api`, gồm các nhóm `/api/auth`, `/api/users`, `/api/conver`, `/api/chatbot` và `/api/document`.

Khi khởi động lần đầu với schema DB phù hợp, backend tự tạo tài khoản quản trị nếu chưa có:

```text
Username: admin
Password: Admin@6421
```

Đổi mật khẩu mặc định ngay sau lần đăng nhập đầu tiên và không sử dụng thông tin này trên môi trường dùng chung hoặc production.

## Cài đặt và chạy frontend

Mở terminal thứ hai tại root workspace:

```powershell
cd chatbot_NB_FE
npm install
npm run dev
```

Vite in địa chỉ local ra terminal, mặc định là `http://localhost:5173`. Mở địa chỉ đó trong trình duyệt; đăng nhập bằng tài khoản hợp lệ trong database.

FE hiện cấu hình API cố định thành `http://localhost:3000` trong `src/config/api.js`; không có biến `VITE_API_URL`. Nếu backend chạy trên host/cổng khác, cập nhật `API_BASE_URL` trong file này rồi khởi động lại Vite. Backend hiện cấu hình CORS để nhận các origin localhost.

Các lệnh frontend khác:

```powershell
npm run build
npm run preview
npm run lint
```

`npm run build` tạo bản build trong `dist/`; `npm run preview` phục vụ bản build để kiểm tra local. Dùng `npm run dev` cho phát triển. Script `npm start` trong package hiện gọi `react-scripts`, nhưng dự án không khai báo dependency `react-scripts`; không dùng script này để khởi chạy ứng dụng Vite.

## Luồng sử dụng

1. Khởi động PostgreSQL và xác nhận database có schema tương thích.
2. Khởi động backend, sau đó frontend.
3. Đăng nhập. Tài khoản `admin` có thể vào phần quản trị; tạo tài khoản người dùng cần thiết.
4. Vào màn hình import và tải tài liệu `.docx` lên. Embedding phụ thuộc vào OpenAI API key, kết nối mạng và schema vector đã sẵn sàng.
5. Mở chat để gửi câu hỏi. Khi sử dụng ngữ cảnh tài liệu, backend truy vấn các đoạn gần nhất trong pgvector rồi gửi chúng tới model chat đã cấu hình.

## Xử lý sự cố thường gặp

- **Backend dừng ngay khi chạy:** kiểm tra `OPENAI_API_KEY` trong `chatbot_NB_BE/.env`; xác nhận lệnh được chạy từ thư mục backend để dotenv đọc đúng file.
- **Không kết nối được PostgreSQL:** kiểm tra PostgreSQL đang chạy, database đã được tạo và các giá trị `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE` chính xác.
- **Lỗi thiếu bảng/cột khi chạy:** server không tự đồng bộ schema. Xem phần [Lưu ý quan trọng về schema và migration](#lưu-ý-quan-trọng-về-schema-và-migration); không khắc phục bằng cách bật `synchronize` trên DB có dữ liệu.
- **Lỗi `vector` hoặc embedding:** xác nhận PostgreSQL đã cài pgvector, extension đã được bật và cột embedding có dimension 1536 tương thích với `text-embedding-3-small`.
- **Frontend không gọi được backend:** xác nhận backend đang nghe cổng 3000; nếu thay đổi cổng/host, sửa `API_BASE_URL` trong `chatbot_NB_FE/src/config/api.js`.
- **Import tài liệu thành công nhưng chat không tìm thấy nội dung:** xem log backend để kiểm tra lỗi embedding. File và chunks có thể đã được lưu trong DB dù bước tạo embedding thất bại.

## Một số lệnh backend

Chạy từ `chatbot_NB_BE/`:

```powershell
npm start
npm run dev
npm run migration:run
npm run migration:revert
```
