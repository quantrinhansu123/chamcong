-- Migration: thêm sản phẩm + vị trí cho DB đã tồn tại
-- Chạy trong Supabase SQL Editor nếu đã chạy init-all.sql trước đó

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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

alter table public.attendance_records
  add column if not exists product_id uuid references public.products (id) on delete set null,
  add column if not exists product_location_id uuid references public.product_locations (id) on delete set null,
  add column if not exists product_name text,
  add column if not exists location_name text;

alter table public.products enable row level security;
alter table public.product_locations enable row level security;

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
