-- Reading status gains "dnf" (did not finish); new books default to "want to read". Safe to re-run.

alter table public.books drop constraint if exists books_status_check;
alter table public.books add constraint books_status_check check (status in ('read', 'reading', 'to_read', 'dnf'));
alter table public.books alter column status set default 'to_read';
