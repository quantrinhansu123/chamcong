-- Vị trí chấm công theo từng dự án (lưu trên Supabase, dùng chung mọi thiết bị)
create table if not exists public.project_checkin_locations (
  project_id text primary key,
  lat numeric(10, 7) not null,
  lng numeric(10, 7) not null,
  radius_m integer not null default 200 check (radius_m >= 50),
  updated_at timestamptz not null default now()
);

create index if not exists project_checkin_locations_updated_idx
  on public.project_checkin_locations (updated_at desc);

alter table public.project_checkin_locations enable row level security;

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
