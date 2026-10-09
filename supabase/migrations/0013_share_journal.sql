-- Privacy for public shelves: choose whether visitors see what you wrote about your books
-- (what you liked, favourite line, saved quotes). Ratings, covers and statuses stay visible.
-- Also stops sending account ids (user_id) in public shelf data. Run after 0012.
-- Safe to run more than once; changes no existing rows.

alter table public.profiles add column if not exists share_journal boolean not null default true;

create or replace function public.get_public_shelf(slug text) returns json
language sql stable security definer set search_path = public as $$
  select json_build_object(
    'profile', json_build_object(
      'display_name', coalesce(p.display_name, p.username),
      'username', p.username,
      'bio', p.bio,
      'avatar_url', p.avatar_url,
      'guestbook_enabled', p.guestbook_enabled,
      'share_journal', p.share_journal,
      'shelf_style', p.shelf_style,
      'room', p.room
    ),
    'rooms', coalesce((select json_agg(to_jsonb(r) - 'user_id' order by r.position) from public.rooms r where r.user_id = p.id), '[]'::json),
    'shelves', coalesce((select json_agg(to_jsonb(s) - 'user_id' order by s.position) from public.shelves s where s.user_id = p.id), '[]'::json),
    'books', coalesce((select json_agg(
        case when p.share_journal then to_jsonb(b) - 'user_id'
        else (to_jsonb(b) - 'user_id') || jsonb_build_object('what_i_liked', null, 'favourite_line', null, 'quotes', '[]'::jsonb)
        end
        order by b.position) from public.books b where b.user_id = p.id), '[]'::json),
    'decor', coalesce((select json_agg(to_jsonb(d) - 'user_id' order by d.position) from public.decor d where d.user_id = p.id), '[]'::json)
  )
  from public.profiles p
  where p.id = public.public_owner(slug)
$$;
grant execute on function public.get_public_shelf(text) to anon, authenticated;
