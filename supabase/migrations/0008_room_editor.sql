-- Room editor: the reader's own wall, floor, rug, curtains and shelf choices, layered on the room
-- style. The public shelf shares them too. Safe to re-run.

alter table public.profiles add column if not exists room jsonb;

create or replace function public.get_public_shelf(slug text) returns json
language sql stable security definer set search_path = public as $$
  select json_build_object(
    'profile', json_build_object(
      'display_name', coalesce(p.username, p.display_name),
      'shelf_style', p.shelf_style,
      'room', p.room
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
