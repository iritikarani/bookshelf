-- Cosmic Space upgrade: book journal fields, profile details, public shelf by @username,
-- an optional guest book, and a list of public shelves for Discover. Safe to run more than once.

-- Books: when you started, your own tags, and saved quotes (each with a page and a note).
alter table public.books add column if not exists date_started date;
alter table public.books add column if not exists tags text[] not null default '{}';
alter table public.books add column if not exists quotes jsonb not null default '[]'::jsonb;
alter table public.books drop constraint if exists books_tags_limit;
alter table public.books add constraint books_tags_limit check (cardinality(tags) <= 20);
alter table public.books drop constraint if exists books_quotes_shape;
alter table public.books add constraint books_quotes_shape check (jsonb_typeof(quotes) = 'array' and jsonb_array_length(quotes) <= 200);

-- Profiles: a short bio, a picture, a yearly goal, and whether visitors may sign the guest book.
alter table public.profiles add column if not exists bio text;
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists reading_goal integer;
alter table public.profiles add column if not exists guestbook_enabled boolean not null default true;
alter table public.profiles drop constraint if exists profiles_bio_length;
alter table public.profiles add constraint profiles_bio_length check (bio is null or char_length(bio) <= 300);
alter table public.profiles drop constraint if exists profiles_goal_range;
alter table public.profiles add constraint profiles_goal_range check (reading_goal is null or reading_goal between 1 and 1000);
alter table public.profiles drop constraint if exists profiles_avatar_length;
alter table public.profiles add constraint profiles_avatar_length check (avatar_url is null or char_length(avatar_url) <= 600);

-- Which public profile a link points at: "@username" or the old random slug.
create or replace function public.public_owner(slug text) returns uuid
language sql stable security definer set search_path = public as $$
  select id from public.profiles
  where is_public
    and (case when left(slug, 1) = '@' then username = lower(substr(slug, 2)) else public_slug = slug end)
  limit 1
$$;
revoke execute on function public.public_owner(text) from public, anon, authenticated;

-- A public shelf, now with the owner's name, @username, picture, bio and guest book setting.
create or replace function public.get_public_shelf(slug text) returns json
language sql stable security definer set search_path = public as $$
  select json_build_object(
    'profile', json_build_object(
      'display_name', coalesce(p.display_name, p.username),
      'username', p.username,
      'bio', p.bio,
      'avatar_url', p.avatar_url,
      'guestbook_enabled', p.guestbook_enabled,
      'shelf_style', p.shelf_style,
      'room', p.room
    ),
    'rooms', coalesce((select json_agg(r order by r.position) from public.rooms r where r.user_id = p.id), '[]'::json),
    'shelves', coalesce((select json_agg(s order by s.position) from public.shelves s where s.user_id = p.id), '[]'::json),
    'books', coalesce((select json_agg(b order by b.position) from public.books b where b.user_id = p.id), '[]'::json),
    'decor', coalesce((select json_agg(d order by d.position) from public.decor d where d.user_id = p.id), '[]'::json)
  )
  from public.profiles p
  where p.id = public.public_owner(slug)
$$;
grant execute on function public.get_public_shelf(text) to anon, authenticated;

-- Signing the guest book: only on public shelves whose owner keeps it open.
create or replace function public.sign_guestbook(slug text, guest_name text, note text, with_heart boolean)
returns boolean
language plpgsql security definer set search_path = public as $$
declare
  shelf_owner uuid;
begin
  shelf_owner := public.public_owner(slug);
  if shelf_owner is null then return false; end if;
  if not (select guestbook_enabled from public.profiles where id = shelf_owner) then return false; end if;
  if coalesce(btrim(note), '') = '' and not coalesce(with_heart, false) then return false; end if;
  if (select count(*) from public.guestbook where owner_id = shelf_owner and created_at > now() - interval '1 hour') >= 30 then
    return false;
  end if;
  insert into public.guestbook (owner_id, name, message, heart)
  values (shelf_owner, left(coalesce(nullif(btrim(guest_name), ''), 'A friend'), 40), left(coalesce(btrim(note), ''), 280), coalesce(with_heart, false));
  return true;
end
$$;
grant execute on function public.sign_guestbook(text, text, text, boolean) to anon, authenticated;

-- Discover: public shelves only (never private ones), with a few covers each.
create or replace function public.list_public_shelves(max_count integer default 12) returns json
language sql stable security definer set search_path = public as $$
  select coalesce(json_agg(x), '[]'::json) from (
    select
      coalesce(p.display_name, p.username) as display_name,
      p.username,
      p.public_slug as slug,
      p.avatar_url,
      p.shelf_style,
      (select count(*) from public.books b where b.user_id = p.id) as book_count,
      (select coalesce(json_agg(c), '[]'::json) from (
        select b.title, b.author, b.cover_url, b.cover_color
        from public.books b where b.user_id = p.id
        order by b.favourite desc, b.rating desc, b.created_at desc limit 6
      ) c) as books
    from public.profiles p
    where p.is_public and exists (select 1 from public.books b where b.user_id = p.id)
    order by p.updated_at desc
    limit least(greatest(coalesce(max_count, 12), 1), 30)
  ) x
$$;
grant execute on function public.list_public_shelves(integer) to anon, authenticated;
