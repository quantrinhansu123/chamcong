-- ═══════════════════════════════════════════════════════════════════════════
-- Jarviz Attendance — CHẠY TOÀN BỘ FILE NÀY trong Supabase SQL Editor
-- Project: https://pmpkffexnqrcfauyjemk.supabase.co
-- ═══════════════════════════════════════════════════════════════════════════

create extension if not exists "pgcrypto";

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
  status text not null default 'not_checked_in'
    check (status in ('not_checked_in', 'working', 'checked_out')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint attendance_records_employee_day_key unique (employee_id, work_date)
);

create index if not exists attendance_records_work_date_idx on public.attendance_records (work_date desc);
create index if not exists attendance_records_employee_date_idx on public.attendance_records (employee_id, work_date desc);

-- ─── Products & locations ────────────────────────────────────────────────────
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

alter table public.attendance_records
  add column if not exists product_id uuid references public.products (id) on delete set null,
  add column if not exists product_location_id uuid references public.product_locations (id) on delete set null,
  add column if not exists product_name text,
  add column if not exists location_name text;

create index if not exists attendance_records_product_idx on public.attendance_records (product_id, work_date desc);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists set_employees_updated_at on public.employees;
create trigger set_employees_updated_at before update on public.employees
for each row execute function public.set_updated_at();

drop trigger if exists set_attendance_records_updated_at on public.attendance_records;
create trigger set_attendance_records_updated_at before update on public.attendance_records
for each row execute function public.set_updated_at();

drop trigger if exists set_products_updated_at on public.products;
create trigger set_products_updated_at before update on public.products
for each row execute function public.set_updated_at();

drop trigger if exists set_product_locations_updated_at on public.product_locations;
create trigger set_product_locations_updated_at before update on public.product_locations
for each row execute function public.set_updated_at();

alter table public.departments enable row level security;
alter table public.employees enable row level security;
alter table public.attendance_records enable row level security;
alter table public.products enable row level security;
alter table public.product_locations enable row level security;

drop policy if exists "demo departments read" on public.departments;
create policy "demo departments read" on public.departments for select to anon, authenticated using (true);

drop policy if exists "demo employees read" on public.employees;
create policy "demo employees read" on public.employees for select to anon, authenticated using (true);
drop policy if exists "demo employees insert" on public.employees;
create policy "demo employees insert" on public.employees for insert to anon, authenticated with check (true);
drop policy if exists "demo employees update" on public.employees;
create policy "demo employees update" on public.employees for update to anon, authenticated using (true) with check (true);

drop policy if exists "demo attendance read" on public.attendance_records;
create policy "demo attendance read" on public.attendance_records for select to anon, authenticated using (true);
drop policy if exists "demo attendance insert" on public.attendance_records;
create policy "demo attendance insert" on public.attendance_records for insert to anon, authenticated with check (true);
drop policy if exists "demo attendance update" on public.attendance_records;
create policy "demo attendance update" on public.attendance_records for update to anon, authenticated using (true) with check (true);

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
