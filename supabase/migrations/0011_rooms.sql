-- More than one room: each room has its own shelves (and so its own books) and its own look.
-- The first room is the profile itself (its shelf_style and room), so existing shelves, whose
-- room_id stays empty, are simply in the first room. Safe to re-run.

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  position integer not null default 0,
  shelf_style text not null default 'pastel',
  room jsonb,
  created_at timestamptz not null default now()
);
create index if not exists rooms_user_idx on public.rooms (user_id, position);

alter table public.rooms enable row level security;
drop policy if exists "own rooms" on public.rooms;
create policy "own rooms" on public.rooms
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table public.shelves add column if not exists room_id uuid references public.rooms (id) on delete cascade;
create index if not exists shelves_room_idx on public.shelves (room_id);

-- The public shelf now lists the rooms too (shelves already carry their room_id).
create or replace function public.get_public_shelf(slug text) returns json
language sql stable security definer set search_path = public as $$
  select json_build_object(
    'profile', json_build_object(
      'display_name', coalesce(p.username, p.display_name),
      'shelf_style', p.shelf_style,
      'room', p.room
    ),
    'rooms', coalesce((select json_agg(r order by r.position) from public.rooms r where r.user_id = p.id), '[]'::json),
    'shelves', coalesce((select json_agg(s order by s.position) from public.shelves s where s.user_id = p.id), '[]'::json),
    'books', coalesce((select json_agg(b order by b.position) from public.books b where b.user_id = p.id), '[]'::json),
    'decor', coalesce((select json_agg(d order by d.position) from public.decor d where d.user_id = p.id), '[]'::json)
  )
  from public.profiles p
  where p.public_slug = slug and p.is_public
$$;
