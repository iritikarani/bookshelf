-- Decor: retire the classical bust and allow the new objects (chai, glasses, hourglass, diya,
-- typewriter, cat, quill, fairy-light jar). Safe to run more than once.

delete from public.decor where kind = 'bust';

-- The list of objects lives in the app now, so adding one never needs another migration.
alter table public.decor drop constraint if exists decor_kind_check;
alter table public.decor add constraint decor_kind_check
  check (kind ~ '^[a-z]{2,24}$');
