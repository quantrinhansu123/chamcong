<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Jarviz Attendance

Ứng dụng chấm công giao diện mobile-first, lưu dữ liệu vào Supabase và hiển thị báo cáo từ dữ liệu thật.

## Chức năng hiện có

- `Trang chủ`:
  - nhập `Mã nhân viên` và `Tên nhân viên` lần đầu trên từng máy/browser
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
   `http://localhost:3001`

## Supabase setup

1. Tạo project Supabase mới.
2. Vào `SQL Editor` → New query.
3. Dán **toàn bộ** file [supabase/init-all.sql](supabase/init-all.sql) → **Run** (1 lần là đủ: bảng + RLS + dữ liệu mẫu).
4. Cấu hình env trong `.env.local`:

```env
VITE_SUPABASE_URL="https://YOUR_PROJECT_ID.supabase.co"
VITE_SUPABASE_ANON_KEY="YOUR_SUPABASE_ANON_KEY"
```

5. Restart `npm run dev`.

Test nhanh sau khi chạy SQL:
- Mở `http://localhost:3001/?name=Nguyen+Van+A&userId=1001`
- Chọn dự án Demo → Check-in
## Dữ liệu chấm công

App ghi vào bảng `attendance_records`:

- `CHECK-IN`: `check_in_at`, `check_in_lat`, `check_in_lng`
- `CHECK-OUT`: `check_out_at`, `check_out_lat`, `check_out_lng`
- `GPS`: `last_lat`, `last_lng`, `location_accuracy_m`, `location_captured_at`

## Dùng trên nhiều người/máy

Khi người dùng mở app lần đầu, app sẽ yêu cầu nhập:

- `Mã nhân viên`
- `Tên nhân viên`

Thông tin này được lưu trong `localStorage` của từng browser. Vì vậy nhiều người có thể cùng mở link Vercel và check-in/check-out riêng trong cùng ngày, miễn là mỗi người dùng một mã khác nhau.

Nếu muốn đổi người test trên cùng một máy, vào `Cài đặt` rồi bấm `Đăng xuất`. Sau đó nhập mã/tên mới.

## Lưu ý

- `Báo cáo` hiện đọc trực tiếp từ `attendance_records`, không còn dùng số hard-code.
- `.env.local` đang được track trong repo hiện tại để các máy khác clone về có thể chạy ngay với cùng Supabase project.
- `VITE_EMPLOYEE_ID` và `VITE_EMPLOYEE_NAME` chỉ còn là gợi ý/placeholder, không tự áp vào tất cả người dùng.
- `anon key` là key frontend public, nhưng project demo hiện vẫn nên siết lại `RLS policy` trước khi dùng production thật.
