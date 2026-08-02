-- Cho phép nhiều phiên check-in/out trong cùng ngày (theo từng dự án).
-- Mỗi lúc chỉ được 1 phiên đang làm (đã check-in, chưa check-out).

alter table public.attendance_records
  drop constraint if exists attendance_records_employee_day_key;

create unique index if not exists attendance_records_one_active_per_day_idx
  on public.attendance_records (employee_id, work_date)
  where check_in_at is not null and check_out_at is null;
