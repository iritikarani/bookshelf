-- Reading progress: the page a reader is on for books marked "Reading now". Safe to re-run.

alter table public.books add column if not exists current_page integer;
alter table public.books drop constraint if exists books_current_page_check;
alter table public.books add constraint books_current_page_check check (current_page is null or current_page >= 0);
