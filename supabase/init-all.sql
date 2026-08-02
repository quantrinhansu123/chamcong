-- ═══════════════════════════════════════════════════════════════════════════
-- Jarviz Attendance — CHẠY 1 LẦN trên Supabase MỚI
-- Cách dùng:
--   1) Tạo project Supabase mới
--   2) SQL Editor → New query → dán TOÀN BỘ file này → Run
--   3) Cập nhật .env / .env.local:
--        VITE_SUPABASE_URL=https://XXXX.supabase.co
--        VITE_SUPABASE_ANON_KEY=...
--   4) Restart: npm run dev
-- ═══════════════════════════════════════════════════════════════════════════

create extension if not exists "pgcrypto";

-- ─── Helpers ────────────────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ─── Users (nhân sự) ────────────────────────────────────────────────────────
create table if not exists public.users (
  user_id text primary key,
  full_name text not null,
  email text,
  phone text,
  avatar_url text,
  department text,
  status text not null default 'active',
  role text,
  access_role text,
  password text,
  password_updated_at timestamptz,
  base_salary numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.users
  add column if not exists phone text,
  add column if not exists access_role text,
  add column if not exists password text,
  add column if not exists password_updated_at timestamptz,
  add column if not exists base_salary numeric;

create index if not exists users_full_name_idx on public.users (full_name);
create index if not exists users_status_idx on public.users (status);

drop trigger if exists set_users_updated_at on public.users;
create trigger set_users_updated_at
before update on public.users
for each row execute function public.set_updated_at();

-- ─── Projects (dự án chấm công) ─────────────────────────────────────────────
create table if not exists public.projects (
  project_id text primary key,
  name text not null,
  status text default 'active',
  description text,
  customer_id text,
  pricing numeric,
  deadline timestamptz,
  documents jsonb default '[]'::jsonb,
  contract_id text,
  content_blocks jsonb,
  assignees jsonb default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.projects
  add column if not exists description text,
  add column if not exists customer_id text,
  add column if not exists pricing numeric,
  add column if not exists deadline timestamptz,
  add column if not exists documents jsonb,
  add column if not exists contract_id text,
  add column if not exists content_blocks jsonb,
  add column if not exists assignees jsonb;

create index if not exists projects_name_idx on public.projects (name);
create index if not exists projects_status_idx on public.projects (status);

drop trigger if exists set_projects_updated_at on public.projects;
create trigger set_projects_updated_at
before update on public.projects
for each row execute function public.set_updated_at();

-- ─── Work sessions (ai phụ trách dự án) ─────────────────────────────────────
create table if not exists public.work_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  project_id text not null,
  created_at timestamptz not null default now(),
  unique (user_id, project_id)
);

create index if not exists work_sessions_user_idx on public.work_sessions (user_id);
create index if not exists work_sessions_project_idx on public.work_sessions (project_id);

-- ─── Optional CRM stubs (tasks / features) — app đọc nếu có ─────────────────
create table if not exists public.features (
  feature_id text primary key,
  project_id text,
  name text,
  description text,
  deadline timestamptz,
  status text,
  content_blocks jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.features
  add column if not exists description text,
  add column if not exists deadline timestamptz,
  add column if not exists status text,
  add column if not exists content_blocks jsonb,
  add column if not exists updated_at timestamptz;

create table if not exists public.tasks (
  task_id text primary key,
  name text not null,
  feature_id text,
  assigned_to text,
  description text,
  image_url text,
  content_blocks jsonb,
  deadline timestamptz,
  status text,
  completed_at timestamptz,
  status_updated_at timestamptz,
  work_type text,
  parent_task_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.tasks
  add column if not exists description text,
  add column if not exists image_url text,
  add column if not exists content_blocks jsonb,
  add column if not exists deadline timestamptz,
  add column if not exists status text,
  add column if not exists completed_at timestamptz,
  add column if not exists status_updated_at timestamptz,
  add column if not exists work_type text,
  add column if not exists parent_task_id text,
  add column if not exists updated_at timestamptz;

create index if not exists tasks_assigned_to_idx on public.tasks (assigned_to);
create index if not exists features_project_idx on public.features (project_id);

-- ─── Vị trí chấm công theo dự án ────────────────────────────────────────────
-- Không FK cứng vào projects vì data cũ có thể còn location của dự án đã xóa
create table if not exists public.project_checkin_locations (
  project_id text primary key,
  lat numeric(10, 7) not null,
  lng numeric(10, 7) not null,
  radius_m integer not null default 200 check (radius_m >= 50),
  updated_at timestamptz not null default now()
);

create index if not exists project_checkin_locations_updated_idx
  on public.project_checkin_locations (updated_at desc);

-- ─── Departments / employees (tương thích schema cũ, tùy chọn) ──────────────
create table if not exists public.departments (
  id bigserial primary key,
  name text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.employees (
  id bigserial primary key,
  full_name text not null,
  email text not null unique,
  phone text,
  avatar_url text,
  department_id bigint references public.departments (id) on delete set null,
  position text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists employees_full_name_idx on public.employees (full_name);
create index if not exists employees_status_idx on public.employees (status);

drop trigger if exists set_employees_updated_at on public.employees;
create trigger set_employees_updated_at
before update on public.employees
for each row execute function public.set_updated_at();

-- ─── Products (schema cũ, giữ tương thích) ──────────────────────────────────
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists products_name_idx on public.products (name);
create index if not exists products_active_idx on public.products (is_active);

create table if not exists public.product_locations (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  name text not null,
  lat numeric(10, 7) not null,
  lng numeric(10, 7) not null,
  radius_m integer not null default 200 check (radius_m >= 50),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists product_locations_product_idx on public.product_locations (product_id);
create index if not exists product_locations_active_idx on public.product_locations (is_active);

drop trigger if exists set_products_updated_at on public.products;
create trigger set_products_updated_at
before update on public.products
for each row execute function public.set_updated_at();

drop trigger if exists set_product_locations_updated_at on public.product_locations;
create trigger set_product_locations_updated_at
before update on public.product_locations
for each row execute function public.set_updated_at();

-- ─── Attendance records ─────────────────────────────────────────────────────
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
  check_in_photo_url text,
  check_out_photo_url text,
  last_lat numeric(10, 7),
  last_lng numeric(10, 7),
  location_accuracy_m numeric(10, 2),
  location_captured_at timestamptz,
  project_id text,
  product_id uuid references public.products (id) on delete set null,
  product_location_id uuid references public.product_locations (id) on delete set null,
  product_name text,
  location_name text,
  status text not null default 'not_checked_in'
    check (status in ('not_checked_in', 'working', 'checked_out')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Bổ sung cột nếu bảng đã tồn tại từ bản cũ
alter table public.attendance_records
  add column if not exists project_id text,
  add column if not exists product_id uuid,
  add column if not exists product_location_id uuid,
  add column if not exists product_name text,
  add column if not exists location_name text,
  add column if not exists check_in_photo_url text,
  add column if not exists check_out_photo_url text;

-- Nhiều phiên/ngày theo dự án; tối đa 1 phiên đang làm
alter table public.attendance_records
  drop constraint if exists attendance_records_employee_day_key;

create index if not exists attendance_records_work_date_idx
  on public.attendance_records (work_date desc);
create index if not exists attendance_records_employee_date_idx
  on public.attendance_records (employee_id, work_date desc);
create index if not exists attendance_records_project_id_idx
  on public.attendance_records (project_id, work_date desc);
create index if not exists attendance_records_product_idx
  on public.attendance_records (product_id, work_date desc);
create unique index if not exists attendance_records_one_active_per_day_idx
  on public.attendance_records (employee_id, work_date)
  where check_in_at is not null and check_out_at is null;

drop trigger if exists set_attendance_records_updated_at on public.attendance_records;
create trigger set_attendance_records_updated_at
before update on public.attendance_records
for each row execute function public.set_updated_at();

-- ─── RLS ────────────────────────────────────────────────────────────────────
alter table public.users enable row level security;
alter table public.projects enable row level security;
alter table public.work_sessions enable row level security;
alter table public.features enable row level security;
alter table public.tasks enable row level security;
alter table public.project_checkin_locations enable row level security;
alter table public.departments enable row level security;
alter table public.employees enable row level security;
alter table public.products enable row level security;
alter table public.product_locations enable row level security;
alter table public.attendance_records enable row level security;

-- users
drop policy if exists "users read" on public.users;
create policy "users read" on public.users for select to anon, authenticated using (true);
drop policy if exists "users insert" on public.users;
create policy "users insert" on public.users for insert to anon, authenticated with check (true);
drop policy if exists "users update" on public.users;
create policy "users update" on public.users for update to anon, authenticated using (true) with check (true);

-- projects
drop policy if exists "projects read" on public.projects;
create policy "projects read" on public.projects for select to anon, authenticated using (true);
drop policy if exists "projects insert" on public.projects;
create policy "projects insert" on public.projects for insert to anon, authenticated with check (true);
drop policy if exists "projects update" on public.projects;
create policy "projects update" on public.projects for update to anon, authenticated using (true) with check (true);

-- work_sessions
drop policy if exists "work_sessions read" on public.work_sessions;
create policy "work_sessions read" on public.work_sessions for select to anon, authenticated using (true);
drop policy if exists "work_sessions insert" on public.work_sessions;
create policy "work_sessions insert" on public.work_sessions for insert to anon, authenticated with check (true);
drop policy if exists "work_sessions update" on public.work_sessions;
create policy "work_sessions update" on public.work_sessions for update to anon, authenticated using (true) with check (true);
drop policy if exists "work_sessions delete" on public.work_sessions;
create policy "work_sessions delete" on public.work_sessions for delete to anon, authenticated using (true);

-- features / tasks
drop policy if exists "features read" on public.features;
create policy "features read" on public.features for select to anon, authenticated using (true);
drop policy if exists "tasks read" on public.tasks;
create policy "tasks read" on public.tasks for select to anon, authenticated using (true);

-- project_checkin_locations
drop policy if exists "project_checkin_locations read" on public.project_checkin_locations;
create policy "project_checkin_locations read"
  on public.project_checkin_locations for select to anon, authenticated using (true);
drop policy if exists "project_checkin_locations insert" on public.project_checkin_locations;
create policy "project_checkin_locations insert"
  on public.project_checkin_locations for insert to anon, authenticated with check (true);
drop policy if exists "project_checkin_locations update" on public.project_checkin_locations;
create policy "project_checkin_locations update"
  on public.project_checkin_locations for update to anon, authenticated using (true) with check (true);
drop policy if exists "project_checkin_locations delete" on public.project_checkin_locations;
create policy "project_checkin_locations delete"
  on public.project_checkin_locations for delete to anon, authenticated using (true);

-- departments / employees
drop policy if exists "demo departments read" on public.departments;
create policy "demo departments read" on public.departments for select to anon, authenticated using (true);
drop policy if exists "demo employees read" on public.employees;
create policy "demo employees read" on public.employees for select to anon, authenticated using (true);
drop policy if exists "demo employees insert" on public.employees;
create policy "demo employees insert" on public.employees for insert to anon, authenticated with check (true);
drop policy if exists "demo employees update" on public.employees;
create policy "demo employees update" on public.employees for update to anon, authenticated using (true) with check (true);

-- products / product_locations
drop policy if exists "demo products read" on public.products;
create policy "demo products read" on public.products for select to anon, authenticated using (true);
drop policy if exists "demo products insert" on public.products;
create policy "demo products insert" on public.products for insert to anon, authenticated with check (true);
drop policy if exists "demo products update" on public.products;
create policy "demo products update" on public.products for update to anon, authenticated using (true) with check (true);
drop policy if exists "demo product_locations read" on public.product_locations;
create policy "demo product_locations read" on public.product_locations for select to anon, authenticated using (true);
drop policy if exists "demo product_locations insert" on public.product_locations;
create policy "demo product_locations insert" on public.product_locations for insert to anon, authenticated with check (true);
drop policy if exists "demo product_locations update" on public.product_locations;
create policy "demo product_locations update" on public.product_locations for update to anon, authenticated using (true) with check (true);

-- attendance_records
drop policy if exists "demo attendance read" on public.attendance_records;
drop policy if exists "attendance read" on public.attendance_records;
create policy "attendance read" on public.attendance_records for select to anon, authenticated using (true);
drop policy if exists "demo attendance insert" on public.attendance_records;
drop policy if exists "attendance insert" on public.attendance_records;
create policy "attendance insert" on public.attendance_records for insert to anon, authenticated with check (true);
drop policy if exists "demo attendance update" on public.attendance_records;
drop policy if exists "attendance update" on public.attendance_records;
create policy "attendance update" on public.attendance_records for update to anon, authenticated using (true) with check (true);

-- ─── Storage: ảnh chấm công ─────────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'attendance-photos',
  'attendance-photos',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "attendance photos public read" on storage.objects;
create policy "attendance photos public read"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'attendance-photos');

drop policy if exists "attendance photos anon upload" on storage.objects;
create policy "attendance photos anon upload"
  on storage.objects for insert
  to anon, authenticated
  with check (bucket_id = 'attendance-photos');

drop policy if exists "attendance photos anon update" on storage.objects;
create policy "attendance photos anon update"
  on storage.objects for update
  to anon, authenticated
  using (bucket_id = 'attendance-photos')
  with check (bucket_id = 'attendance-photos');

-- ─── Dữ liệu mẫu (bỏ qua nếu bạn sẽ chạy export-data.sql) ───────────────────
-- Có thể xóa khối này nếu chỉ import data thật từ export-data.sql
insert into public.users (user_id, full_name, email, phone, department, status, role)
values
  ('1001', 'Nguyen Van A', 'a@example.com', '0901000001', 'Kỹ thuật', 'active', 'staff'),
  ('1002', 'Tran Thi B', 'b@example.com', '0901000002', 'Kỹ thuật', 'active', 'staff')
on conflict (user_id) do nothing;

-- Reload PostgREST schema cache
notify pgrst, 'reload schema';
