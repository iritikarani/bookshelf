-- Guest book: visitors to a public shelf leave a note or a heart. Only the shelf's owner can read
-- or delete them. Visitors sign through sign_guestbook(), which needs no account. Safe to re-run.

create table if not exists public.guestbook (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  name text not null default 'A friend' check (char_length(name) between 1 and 40),
  message text not null default '' check (char_length(message) <= 280),
  heart boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists guestbook_owner_idx on public.guestbook (owner_id, created_at desc);

alter table public.guestbook enable row level security;
drop policy if exists "guestbook: owner reads" on public.guestbook;
create policy "guestbook: owner reads" on public.guestbook for select using (owner_id = auth.uid());
drop policy if exists "guestbook: owner deletes" on public.guestbook;
create policy "guestbook: owner deletes" on public.guestbook for delete using (owner_id = auth.uid());

-- Sign a public shelf's guest book. Returns false when the shelf isn't public, the note is empty,
-- or the shelf has had a lot of notes in the last hour (a simple guard against floods).
create or replace function public.sign_guestbook(slug text, guest_name text, note text, with_heart boolean)
returns boolean
language plpgsql security definer set search_path = public as $$
declare
  shelf_owner uuid;
begin
  select id into shelf_owner from public.profiles where public_slug = slug and is_public;
  if shelf_owner is null then return false; end if;
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
