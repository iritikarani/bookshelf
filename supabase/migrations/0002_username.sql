-- Cosmic Space: usernames.
-- Run after 0001_init.sql (safe to run more than once).

-- ───────────────────────── column + rules ─────────────────────────
alter table public.profiles add column if not exists username text;

-- 3–20 characters: lowercase letters, numbers, "_" and "."; starts with a letter or number.
alter table public.profiles drop constraint if exists profiles_username_format;
alter table public.profiles add constraint profiles_username_format
  check (username is null or username ~ '^[a-z0-9][a-z0-9_.]{2,19}$');

-- One person per username.
create unique index if not exists profiles_username_key on public.profiles (username);

-- ───────────────────────── is a username free? ─────────────────────────
-- Callable before signing in, so the sign-up form can check as you type.
create or replace function public.username_available(name text) returns boolean
language sql stable security definer set search_path = public as $$
  select not exists (select 1 from public.profiles where username = lower(name))
$$;

grant execute on function public.username_available(text) to anon, authenticated;

-- ───────────────────────── new user bootstrap, now with username ─────────────────────────
-- The sign-up form passes { username } as user metadata. Google sign-ups have none and
-- choose one inside the app on first visit.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  uname text := nullif(lower(trim(new.raw_user_meta_data ->> 'username')), '');
begin
  insert into public.profiles (id, display_name, username)
  values (
    new.id,
    coalesce(uname, new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    uname
  );

  insert into public.shelves (user_id, name, position) values
    (new.id, 'Top shelf', 0),
    (new.id, 'Middle shelf', 1),
    (new.id, 'Bottom shelf', 2);
  return new;
end $$;

-- ───────────────────────── public shelf shows the username ─────────────────────────
create or replace function public.get_public_shelf(slug text) returns json
language sql stable security definer set search_path = public as $$
  select json_build_object(
    'profile', json_build_object(
      'display_name', coalesce(p.username, p.display_name),
      'shelf_style', p.shelf_style
    ),
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
