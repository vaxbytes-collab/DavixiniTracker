-- davixiniTracker · configuración inicial de Supabase
-- ejecuta este archivo en Supabase → SQL Editor → New query.

create table if not exists public.library_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_library_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.library_admins
    where user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_library_admin() from public;
grant execute on function public.is_library_admin() to anon, authenticated;

create table if not exists public.library_albums (
  id text primary key,
  data jsonb not null,
  cover_path text,
  updated_at timestamptz not null default now()
);

create table if not exists public.library_tracks (
  id text primary key,
  album_id text,
  data jsonb not null,
  audio_path text not null,
  artwork_path text,
  updated_at timestamptz not null default now()
);

create table if not exists public.library_playlists (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.library_admins enable row level security;
alter table public.library_albums enable row level security;
alter table public.library_tracks enable row level security;
alter table public.library_playlists enable row level security;

revoke all on table public.library_admins from anon, authenticated;
grant select on public.library_albums, public.library_tracks, public.library_playlists to anon, authenticated;
grant insert, update, delete on public.library_albums, public.library_tracks, public.library_playlists to authenticated;

drop policy if exists "public can read albums" on public.library_albums;
create policy "public can read albums" on public.library_albums
  for select to anon, authenticated using (true);
drop policy if exists "admins can insert albums" on public.library_albums;
create policy "admins can insert albums" on public.library_albums
  for insert to authenticated with check (public.is_library_admin());
drop policy if exists "admins can update albums" on public.library_albums;
create policy "admins can update albums" on public.library_albums
  for update to authenticated using (public.is_library_admin()) with check (public.is_library_admin());
drop policy if exists "admins can delete albums" on public.library_albums;
create policy "admins can delete albums" on public.library_albums
  for delete to authenticated using (public.is_library_admin());

drop policy if exists "public can read tracks" on public.library_tracks;
create policy "public can read tracks" on public.library_tracks
  for select to anon, authenticated using (true);
drop policy if exists "admins can insert tracks" on public.library_tracks;
create policy "admins can insert tracks" on public.library_tracks
  for insert to authenticated with check (public.is_library_admin());
drop policy if exists "admins can update tracks" on public.library_tracks;
create policy "admins can update tracks" on public.library_tracks
  for update to authenticated using (public.is_library_admin()) with check (public.is_library_admin());
drop policy if exists "admins can delete tracks" on public.library_tracks;
create policy "admins can delete tracks" on public.library_tracks
  for delete to authenticated using (public.is_library_admin());

drop policy if exists "public can read playlists" on public.library_playlists;
create policy "public can read playlists" on public.library_playlists
  for select to anon, authenticated using (true);
drop policy if exists "admins can insert playlists" on public.library_playlists;
create policy "admins can insert playlists" on public.library_playlists
  for insert to authenticated with check (public.is_library_admin());
drop policy if exists "admins can update playlists" on public.library_playlists;
create policy "admins can update playlists" on public.library_playlists
  for update to authenticated using (public.is_library_admin()) with check (public.is_library_admin());
drop policy if exists "admins can delete playlists" on public.library_playlists;
create policy "admins can delete playlists" on public.library_playlists
  for delete to authenticated using (public.is_library_admin());

insert into storage.buckets (id, name, public, file_size_limit)
values ('library-media', 'library-media', true, 52428800)
on conflict (id) do update set public = true, file_size_limit = 52428800;

drop policy if exists "public can read library media" on storage.objects;
create policy "public can read library media" on storage.objects
  for select to anon, authenticated using (bucket_id = 'library-media');

drop policy if exists "admins can upload library media" on storage.objects;
create policy "admins can upload library media" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'library-media' and public.is_library_admin()
  );

drop policy if exists "admins can update library media" on storage.objects;
create policy "admins can update library media" on storage.objects
  for update to authenticated using (
    bucket_id = 'library-media' and public.is_library_admin()
  ) with check (
    bucket_id = 'library-media' and public.is_library_admin()
  );

drop policy if exists "admins can delete library media" on storage.objects;
create policy "admins can delete library media" on storage.objects
  for delete to authenticated using (
    bucket_id = 'library-media' and public.is_library_admin()
  );

-- PASO FINAL: crea tu usuario en Authentication → Users y copia su UUID.
-- Sustituye el texto de abajo por ese UUID y ejecuta esta consulta por separado:
insert into public.library_admins (user_id)
values ('90315f88-8f16-4d7c-9c83-96525e602564')
on conflict (user_id) do nothing;
