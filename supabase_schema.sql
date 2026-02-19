-- Supabase schema for player self-registration and session scheduling
-- Run in Supabase SQL editor.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  is_gm boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint display_name_length check (char_length(display_name) between 2 and 40)
);

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  scheduled_at timestamptz not null,
  max_players int not null default 5,
  status text not null default 'open',
  notes text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint session_status_valid check (status in ('open', 'closed', 'completed', 'cancelled')),
  constraint max_players_valid check (max_players between 1 and 12)
);

create table if not exists public.session_signups (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  character_name text,
  signup_status text not null default 'confirmed',
  created_at timestamptz not null default timezone('utc', now()),
  constraint signup_status_valid check (signup_status in ('confirmed', 'waitlist', 'cancelled')),
  constraint one_signup_per_user_per_session unique (session_id, user_id)
);

create index if not exists idx_sessions_scheduled_at on public.sessions(scheduled_at);
create index if not exists idx_sessions_status on public.sessions(status);
create index if not exists idx_signups_session_id on public.session_signups(session_id);
create index if not exists idx_signups_user_id on public.session_signups(user_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger sessions_set_updated_at
before update on public.sessions
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.sessions enable row level security;
alter table public.session_signups enable row level security;

-- Profiles: users can see all player names, but only edit their own profile.
drop policy if exists "Profiles are viewable by authenticated users" on public.profiles;
create policy "Profiles are viewable by authenticated users"
on public.profiles for select
to authenticated
using (true);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
on public.profiles for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

-- Sessions: authenticated users can read, GMs can create/update/delete.
drop policy if exists "Sessions are viewable by authenticated users" on public.sessions;
create policy "Sessions are viewable by authenticated users"
on public.sessions for select
to authenticated
using (true);

drop policy if exists "GMs can create sessions" on public.sessions;
create policy "GMs can create sessions"
on public.sessions for insert
to authenticated
with check (
  (select auth.uid()) = created_by
  and exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid()) and p.is_gm = true
  )
);

drop policy if exists "GMs can update sessions" on public.sessions;
create policy "GMs can update sessions"
on public.sessions for update
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid()) and p.is_gm = true
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid()) and p.is_gm = true
  )
);

drop policy if exists "GMs can delete sessions" on public.sessions;
create policy "GMs can delete sessions"
on public.sessions for delete
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid()) and p.is_gm = true
  )
);

-- Signups: authenticated users can read all signups for roster visibility,
-- and manage only their own signup rows.
drop policy if exists "Signups are viewable by authenticated users" on public.session_signups;
create policy "Signups are viewable by authenticated users"
on public.session_signups for select
to authenticated
using (true);

drop policy if exists "Users can create their own signups" on public.session_signups;
create policy "Users can create their own signups"
on public.session_signups for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own signups" on public.session_signups;
create policy "Users can delete their own signups"
on public.session_signups for delete
to authenticated
using ((select auth.uid()) = user_id);

create or replace function public.join_session(p_session_id uuid, p_character_name text default null)
returns public.session_signups
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_session public.sessions;
  v_existing public.session_signups;
  v_signup_count int;
  v_signup public.session_signups;
begin
  if v_uid is null then
    raise exception 'Must be authenticated';
  end if;

  select * into v_session from public.sessions where id = p_session_id;
  if not found then
    raise exception 'Session not found';
  end if;

  if v_session.status <> 'open' then
    raise exception 'Session is not open';
  end if;

  select * into v_existing
  from public.session_signups
  where session_id = p_session_id and user_id = v_uid;

  if found then
    return v_existing;
  end if;

  select count(*) into v_signup_count
  from public.session_signups
  where session_id = p_session_id and signup_status = 'confirmed';

  if v_signup_count >= v_session.max_players then
    raise exception 'Session is full';
  end if;

  insert into public.session_signups (session_id, user_id, character_name)
  values (p_session_id, v_uid, nullif(trim(p_character_name), ''))
  returning * into v_signup;

  return v_signup;
end;
$$;

grant execute on function public.join_session(uuid, text) to authenticated;
