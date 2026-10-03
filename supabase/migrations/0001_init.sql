-- Ex Libris schema: profiles, shelves, books, cover storage, public sharing.
-- Run in the Supabase SQL editor (or `supabase db push`).

create extension if not exists "pgcrypto";

-- ───────────────────────── profiles ─────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  shelf_style text not null default 'pastel'
    check (shelf_style in ('pastel', 'modern', 'scandi', 'japandi', 'academia', 'cottage', 'midcentury', 'coastal', 'boho', 'industrial')),
  is_public boolean not null default false,
  public_slug text not null unique default encode(gen_random_bytes(6), 'hex'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ───────────────────────── shelves ─────────────────────────
create table if not exists public.shelves (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  position integer not null default 0,
  is_want_to_read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists shelves_user_idx on public.shelves (user_id, position);

-- ───────────────────────── books ─────────────────────────
create table if not exists public.books (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  shelf_id uuid not null references public.shelves (id) on delete restrict,
  title text not null,
  author text not null default '',
  cover_url text,
  uploaded_cover text,
  cover_color text, -- colour of the generated cover when no image is used
  display text not null default 'spine' check (display in ('spine', 'cover')), -- spine-out or face-out
  year_published integer,
  pages integer,
  genre text,
  short_description text,
  position integer not null default 0,
  rating smallint not null default 0 check (rating between 0 and 5),
  what_i_liked text,
  favourite_line text,
  date_finished date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists books_user_idx on public.books (user_id);
create index if not exists books_shelf_idx on public.books (shelf_id, position);

-- ───────────────────────── decor ─────────────────────────
-- Objects placed between books (plants, candles, a globe…). They share the
-- shelf's position ordering with books.
create table if not exists public.decor (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  shelf_id uuid not null references public.shelves (id) on delete cascade,
  kind text not null check (kind in ('plant', 'succulent', 'pampas', 'candles', 'frame', 'globe', 'calendar', 'bust', 'camera', 'stack')),
  position integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists decor_shelf_idx on public.decor (shelf_id, position);

-- updated_at maintenance
create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists books_touch on public.books;
create trigger books_touch before update on public.books
  for each row execute function public.touch_updated_at();
drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- ───────────────────────── row level security ─────────────────────────
-- Everything is private by default: a user can only see and change their own rows.
alter table public.profiles enable row level security;
alter table public.shelves enable row level security;
alter table public.books enable row level security;
alter table public.decor enable row level security;

drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "own shelves" on public.shelves;
create policy "own shelves" on public.shelves
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own books" on public.books;
create policy "own books" on public.books
  for all using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.shelves s where s.id = shelf_id and s.user_id = auth.uid())
  );

drop policy if exists "own decor" on public.decor;
create policy "own decor" on public.decor
  for all using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.shelves s where s.id = shelf_id and s.user_id = auth.uid())
  );

-- ───────────────────────── new user bootstrap ─────────────────────────
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)));

  insert into public.shelves (user_id, name, position, is_want_to_read) values
    (new.id, 'Favourites', 0, false),
    (new.id, 'Read', 1, false),
    (new.id, 'Want to read', 2, true);
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ───────────────────────── public read-only shelf ─────────────────────────
-- Returns the shelf for a slug only when its owner has switched sharing on.
create or replace function public.get_public_shelf(slug text) returns json
language sql stable security definer set search_path = public as $$
  select json_build_object(
    'profile', json_build_object('display_name', p.display_name, 'shelf_style', p.shelf_style),
    'shelves', coalesce((
      select json_agg(s order by s.position) from public.shelves s where s.user_id = p.id
    ), '[]'::json),
    'books', coalesce((
      select json_agg(b order by b.position) from public.books b where b.user_id = p.id
    ), '[]'::json),
    'decor', coalesce((
      select json_agg(d order by d.position) from public.decor d where d.user_id = p.id
    ), '[]'::json)
  )
  from public.profiles p
  where p.public_slug = slug and p.is_public
$$;

grant execute on function public.get_public_shelf(text) to anon, authenticated;

-- ───────────────────────── cover uploads ─────────────────────────
insert into storage.buckets (id, name, public)
values ('covers', 'covers', true)
on conflict (id) do nothing;

drop policy if exists "upload own covers" on storage.objects;
create policy "upload own covers" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'covers' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "delete own covers" on storage.objects;
create policy "delete own covers" on storage.objects
  for delete to authenticated
  using (bucket_id = 'covers' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "read covers" on storage.objects;
create policy "read covers" on storage.objects
  for select using (bucket_id = 'covers');
