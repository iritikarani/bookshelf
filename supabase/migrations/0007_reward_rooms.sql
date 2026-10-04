-- Reading rewards add new rooms (starlit, gilded). The list of rooms now lives in the app, so new
-- ones never need another migration. Safe to re-run.

alter table public.profiles drop constraint if exists profiles_shelf_style_check;
alter table public.profiles add constraint profiles_shelf_style_check check (shelf_style ~ '^[a-z]{2,24}$');
