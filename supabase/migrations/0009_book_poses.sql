-- Books can lean against their neighbour or lie flat in a pile, as well as stand or face out. Safe to re-run.

alter table public.books drop constraint if exists books_display_check;
alter table public.books add constraint books_display_check check (display in ('spine', 'cover', 'lean', 'stack'));
