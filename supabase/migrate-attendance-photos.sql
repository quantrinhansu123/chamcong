-- Ảnh chấm công + storage bucket
-- Chạy trong Supabase SQL Editor

alter table public.attendance_records
  add column if not exists check_in_photo_url text,
  add column if not exists check_out_photo_url text;

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
