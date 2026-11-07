-- davixiniTracker · migración de perfiles de artista del Davixiniverso
-- ejecuta este archivo en Supabase → SQL Editor después de supabase-setup.sql.

create table if not exists public.library_artists (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.library_artists enable row level security;
grant select on public.library_artists to anon, authenticated;
grant insert, update, delete on public.library_artists to authenticated;

drop policy if exists "public can read artists" on public.library_artists;
create policy "public can read artists" on public.library_artists
  for select to anon, authenticated using (true);

drop policy if exists "admins can insert artists" on public.library_artists;
create policy "admins can insert artists" on public.library_artists
  for insert to authenticated with check (public.is_library_admin());

drop policy if exists "admins can update artists" on public.library_artists;
create policy "admins can update artists" on public.library_artists
  for update to authenticated using (public.is_library_admin()) with check (public.is_library_admin());

drop policy if exists "admins can delete artists" on public.library_artists;
create policy "admins can delete artists" on public.library_artists
  for delete to authenticated using (public.is_library_admin());
