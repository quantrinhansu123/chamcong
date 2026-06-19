-- Tạo bảng chấm công cho app Jarviz Attendance
-- Chạy trong Supabase → SQL Editor (project pmpkffexnqrcfauyjemk)
-- Không cần bảng products/employees — dùng chung với projects + users

create extension if not exists "pgcrypto";

create table if not exists public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  employee_id text not null,
  employee_name text not null,
  work_date date not null,
  shift_name text not null default 'Ca hành chính',
  scheduled_start time not null default '08:00',
  scheduled_end time not null default '17:30',
  check_in_at timestamptz,
  check_out_at timestamptz,
  check_in_lat numeric(10, 7),
  check_in_lng numeric(10, 7),
  check_out_lat numeric(10, 7),
  check_out_lng numeric(10, 7),
  last_lat numeric(10, 7),
  last_lng numeric(10, 7),
  location_accuracy_m numeric(10, 2),
  location_captured_at timestamptz,
  project_id text,
  product_id uuid,
  product_location_id uuid,
  product_name text,
  location_name text,
  status text not null default 'not_checked_in'
    check (status in ('not_checked_in', 'working', 'checked_out')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint attendance_records_employee_day_key unique (employee_id, work_date)
);

create index if not exists attendance_records_work_date_idx
  on public.attendance_records (work_date desc);

create index if not exists attendance_records_employee_date_idx
  on public.attendance_records (employee_id, work_date desc);

create index if not exists attendance_records_project_id_idx
  on public.attendance_records (project_id, work_date desc);

create or replace function public.set_attendance_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_attendance_records_updated_at on public.attendance_records;
create trigger set_attendance_records_updated_at
before update on public.attendance_records
for each row execute function public.set_attendance_updated_at();

alter table public.attendance_records enable row level security;

drop policy if exists "attendance read" on public.attendance_records;
create policy "attendance read"
  on public.attendance_records for select to anon, authenticated using (true);

drop policy if exists "attendance insert" on public.attendance_records;
create policy "attendance insert"
  on public.attendance_records for insert to anon, authenticated with check (true);

drop policy if exists "attendance update" on public.attendance_records;
create policy "attendance update"
  on public.attendance_records for update to anon, authenticated using (true) with check (true);

-- Bắt Supabase API reload schema cache
notify pgrst, 'reload schema';
