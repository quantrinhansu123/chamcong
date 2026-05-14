<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Jarviz Attendance

Ứng dụng chấm công giao diện mobile-first, lưu dữ liệu vào Supabase và hiển thị báo cáo từ dữ liệu thật.

## Chức năng hiện có

- `Trang chủ`:
  - `CHECK-IN`
  - `CHECK-OUT`
  - lưu `GPS`
  - hiển thị trạng thái chấm công hôm nay từ Supabase
- `Báo cáo`:
  - lấy số thật từ bảng `attendance_records`
  - tính `Ngày công`, `Giờ làm`, `Đi muộn`, `Chưa check-in`
  - biểu đồ giờ làm theo tuần
  - danh sách nhân sự hoạt động trong kỳ

## Chạy local

Yêu cầu: `Node.js`

1. Cài dependency:
   ```bash
   npm install
   ```
2. Chạy app:
   ```bash
   npm run dev
   ```
3. Mở:
   `http://localhost:3000`

## Supabase setup

1. Tạo project Supabase.
2. Vào `SQL Editor`.
3. Chạy file [supabase/schema.sql](supabase/schema.sql).
4. Cấu hình env trong `.env.local`:

```env
VITE_SUPABASE_URL="https://YOUR_PROJECT_ID.supabase.co"
VITE_SUPABASE_ANON_KEY="YOUR_SUPABASE_ANON_KEY"
VITE_EMPLOYEE_ID="1"
VITE_EMPLOYEE_NAME="Nguyễn Văn An"
```

5. Restart `npm run dev`.

## Dữ liệu chấm công

App ghi vào bảng `attendance_records`:

- `CHECK-IN`: `check_in_at`, `check_in_lat`, `check_in_lng`
- `CHECK-OUT`: `check_out_at`, `check_out_lat`, `check_out_lng`
- `GPS`: `last_lat`, `last_lng`, `location_accuracy_m`, `location_captured_at`

## Dùng trên nhiều máy

Nếu muốn cùng một nhân viên check-in/check-out được trên nhiều máy khác nhau, tất cả máy phải dùng cùng:

- `VITE_EMPLOYEE_ID`
- `VITE_EMPLOYEE_NAME`

App hiện ưu tiên danh tính từ env này để tránh sinh user ảo `ANON_*` theo từng browser.

## Lưu ý

- `Báo cáo` hiện đọc trực tiếp từ `attendance_records`, không còn dùng số hard-code.
- `.env.local` đang được track trong repo hiện tại để các máy khác clone về có thể chạy ngay với cùng Supabase project.
- `anon key` là key frontend public, nhưng project demo hiện vẫn nên siết lại `RLS policy` trước khi dùng production thật.
