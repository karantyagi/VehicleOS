-- Receipts bucket + 50 MB limit for OEM manuals (ADR-007).
-- Idempotent: safe if 003 was never run ("bucket not found" fix).
-- Run entire file in Supabase SQL editor.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'receipts',
  'receipts',
  false,
  52428800,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif',
    'application/pdf'
  ]
)
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "receipts insert own prefix" on storage.objects;
create policy "receipts insert own prefix"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'receipts'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "receipts select own prefix" on storage.objects;
create policy "receipts select own prefix"
on storage.objects for select to authenticated
using (
  bucket_id = 'receipts'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "receipts delete own prefix" on storage.objects;
create policy "receipts delete own prefix"
on storage.objects for delete to authenticated
using (
  bucket_id = 'receipts'
  and (storage.foldername(name))[1] = auth.uid()::text
);
