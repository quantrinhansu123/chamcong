-- Lưu project_id (bảng projects) thay vì FK products/product_locations
alter table public.attendance_records
  add column if not exists project_id text;

create index if not exists attendance_records_project_id_idx
  on public.attendance_records (project_id, work_date desc);
