-- Phase 1: account profile and local-first mood entry synchronization.
-- All application-owned data is protected by RLS; browser clients use only
-- the authenticated role and never receive administrative credentials.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  time_zone text not null default 'UTC',
  locale text not null default 'en-US',
  theme text not null default 'system' check (theme in ('light', 'dark', 'system')),
  week_start_day smallint not null default 0 check (week_start_day between 0 and 6),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.mood_entries (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  mood_rating smallint not null check (mood_rating between 1 and 5),
  energy_rating smallint check (energy_rating between 1 and 5),
  note_plain_text text,
  occurred_at_utc timestamptz not null,
  occurred_time_zone text not null,
  occurred_local_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  revision integer not null default 0 check (revision >= 0),
  client_mutation_id uuid not null,
  constraint mood_entries_client_mutation_unique unique (user_id, client_mutation_id)
);

create index mood_entries_user_updated_at_idx
  on public.mood_entries (user_id, updated_at desc);
create index mood_entries_user_local_date_idx
  on public.mood_entries (user_id, occurred_local_date desc);

alter table public.profiles enable row level security;
alter table public.mood_entries enable row level security;

create policy "Profiles are readable by their owner"
  on public.profiles for select to authenticated
  using ((select auth.uid()) = id);
create policy "Profiles are created by their owner"
  on public.profiles for insert to authenticated
  with check ((select auth.uid()) = id);
create policy "Profiles are updated by their owner"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);
create policy "Profiles are deleted by their owner"
  on public.profiles for delete to authenticated
  using ((select auth.uid()) = id);

create policy "Mood entries are readable by their owner"
  on public.mood_entries for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Mood entries are created by their owner"
  on public.mood_entries for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "Mood entries are updated by their owner"
  on public.mood_entries for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Mood entries are deleted by their owner"
  on public.mood_entries for delete to authenticated
  using ((select auth.uid()) = user_id);

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger mood_entries_set_updated_at
  before update on public.mood_entries
  for each row execute function public.set_updated_at();

-- Creates a profile for normal Auth sign-ups. The unique primary key makes the
-- operation safe when a client also creates its own profile during onboarding.
create function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, nullif(new.raw_user_meta_data ->> 'display_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger auth_user_created_profile
  after insert on auth.users
  for each row execute function public.create_profile_for_new_user();

-- Applies one client mutation atomically. expected_revision is 0 for an entry
-- not yet seen on the server; otherwise it must match the authoritative row.
-- A conflict raises SQLSTATE 40001 so the client can pull, preserve both
-- versions, and present resolution rather than silently overwriting data.
create function public.apply_mood_entry_mutation(
  p_entry jsonb,
  p_expected_revision integer
)
returns public.mood_entries
language plpgsql
set search_path = ''
as $$
declare
  current_entry public.mood_entries;
  candidate public.mood_entries;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication is required' using errcode = '28000';
  end if;

  select * into candidate
  from jsonb_populate_record(null::public.mood_entries, p_entry);

  if candidate.id is null or candidate.user_id <> (select auth.uid()) then
    raise exception 'Entry owner must be the authenticated user' using errcode = '42501';
  end if;

  select * into current_entry
  from public.mood_entries
  where id = candidate.id
  for update;

  if not found then
    if p_expected_revision <> 0 then
      raise exception 'Entry does not exist at revision %', p_expected_revision using errcode = '40001';
    end if;

    insert into public.mood_entries (
      id, user_id, mood_rating, energy_rating, note_plain_text,
      occurred_at_utc, occurred_time_zone, occurred_local_date,
      deleted_at, client_mutation_id, revision
    ) values (
      candidate.id, candidate.user_id, candidate.mood_rating, candidate.energy_rating,
      candidate.note_plain_text, candidate.occurred_at_utc,
      candidate.occurred_time_zone, candidate.occurred_local_date,
      candidate.deleted_at, candidate.client_mutation_id, 0
    ) returning * into current_entry;
    return current_entry;
  end if;

  if current_entry.user_id <> (select auth.uid()) then
    raise exception 'Entry owner must be the authenticated user' using errcode = '42501';
  end if;
  if current_entry.revision <> p_expected_revision then
    raise exception 'Entry changed remotely; expected revision %, found %',
      p_expected_revision, current_entry.revision using errcode = '40001';
  end if;

  update public.mood_entries
  set mood_rating = candidate.mood_rating,
      energy_rating = candidate.energy_rating,
      note_plain_text = candidate.note_plain_text,
      occurred_at_utc = candidate.occurred_at_utc,
      occurred_time_zone = candidate.occurred_time_zone,
      occurred_local_date = candidate.occurred_local_date,
      deleted_at = candidate.deleted_at,
      client_mutation_id = candidate.client_mutation_id,
      revision = current_entry.revision + 1
  where id = current_entry.id
  returning * into current_entry;

  return current_entry;
end;
$$;

revoke all on function public.apply_mood_entry_mutation(jsonb, integer) from public;
grant execute on function public.apply_mood_entry_mutation(jsonb, integer) to authenticated;
