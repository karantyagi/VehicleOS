-- OEM manuals up to 50 MB (ADR-007). Run after 003_receipts_storage.sql.

update storage.buckets
set file_size_limit = 52428800
where id = 'receipts';
