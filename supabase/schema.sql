-- Club Calendar 101/102 — Supabase schema
-- Run this entire file in Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  club_name text not null check (char_length(club_name) between 1 and 100),
  event_name text not null check (char_length(event_name) between 1 and 200),
  event_date date not null,
  start_time text not null,
  end_time text not null,
  location text not null check (char_length(location) between 1 and 200),
  contact_email text not null default '',
  max_attendance integer not null check (max_attendance between 1 and 10000),
  notes text not null default '' check (char_length(notes) <= 500),
  preferred_majors text not null default '',
  status text not null default 'active' check (status in ('active', 'cancelled')),
  created_at timestamptz not null default now()
);

create table if not exists public.signups (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  student_name text not null check (char_length(student_name) between 1 and 150),
  student_email text not null check (student_email ~* '^[^[:space:]@]+@wsu\.edu$'),
  student_wsuid text not null check (student_wsuid ~ '^[0-9]{8,9}$'),
  created_at timestamptz not null default now(),
  constraint unique_signup_per_event_email unique (event_id, student_email),
  constraint unique_signup_per_event_wsuid unique (event_id, student_wsuid)
);

create index if not exists events_date_idx on public.events(event_date);
create index if not exists signups_event_id_idx on public.signups(event_id);

alter table public.events enable row level security;
alter table public.signups enable row level security;

-- Public clients use the security-definer functions below rather than direct
-- table access. No public policy exposes attendance rows.
revoke all on public.events from anon, authenticated;
revoke all on public.signups from anon, authenticated;

create or replace function public.get_public_events()
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'events', coalesce((select jsonb_agg(to_jsonb(e) order by e.event_date, e.start_time)
      from public.events e where e.status = 'active'), '[]'::jsonb),
    'signupCounts', coalesce((select jsonb_object_agg(s.event_id::text, s.count)
      from (select event_id, count(*)::integer as count from public.signups group by event_id) s), '{}'::jsonb)
  );
$$;

create or replace function public.submit_event(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare new_id uuid;
start_minutes integer;
end_minutes integer;
begin
  if nullif(trim(p->>'clubName'), '') is null then raise exception 'Invalid club name'; end if;
  if char_length(p->>'clubName') > 100 then raise exception 'Club name is too long (maximum 100 characters)'; end if;
  if nullif(trim(p->>'eventName'), '') is null then raise exception 'Invalid event name'; end if;
  if char_length(p->>'eventName') > 200 then raise exception 'Event name is too long (maximum 200 characters)'; end if;
  if (p->>'eventDate')::date < current_date then raise exception 'Event date must be today or in the future'; end if;
  if nullif(trim(p->>'eventStartTime'), '') is null or nullif(trim(p->>'eventEndTime'), '') is null then raise exception 'Invalid event time'; end if;
  start_minutes := extract(hour from to_timestamp(trim(p->>'eventStartTime'), 'HH12:MI AM'))::integer * 60 + extract(minute from to_timestamp(trim(p->>'eventStartTime'), 'HH12:MI AM'))::integer;
  end_minutes := extract(hour from to_timestamp(trim(p->>'eventEndTime'), 'HH12:MI AM'))::integer * 60 + extract(minute from to_timestamp(trim(p->>'eventEndTime'), 'HH12:MI AM'))::integer;
  if end_minutes <= start_minutes then raise exception 'End time must be after the start time'; end if;
  if nullif(trim(p->>'location'), '') is null then raise exception 'Invalid location'; end if;
  if char_length(p->>'location') > 200 then raise exception 'Location is too long (maximum 200 characters)'; end if;
  if char_length(coalesce(p->>'notes', '')) > 500 then raise exception 'Notes are too long (maximum 500 characters)'; end if;
  if char_length(coalesce(p->>'contact', '')) > 200 then raise exception 'Contact email is too long (maximum 200 characters)'; end if;
  if (p->>'maxAttendance')::integer not between 1 and 10000 then raise exception 'Invalid max attendance'; end if;

  insert into public.events (club_name, event_name, event_date, start_time, end_time, location, contact_email, max_attendance, notes, preferred_majors)
  values (left(trim(p->>'clubName'), 100), left(trim(p->>'eventName'), 200), (p->>'eventDate')::date,
    left(trim(p->>'eventStartTime'), 50), left(trim(p->>'eventEndTime'), 50), left(trim(p->>'location'), 200),
    left(trim(coalesce(p->>'contact', '')), 200), (p->>'maxAttendance')::integer, left(coalesce(p->>'notes', ''), 500), left(coalesce(p->>'allowedMajors', ''), 500))
  returning id into new_id;
  return jsonb_build_object('success', true, 'eventId', new_id);
end;
$$;

create or replace function public.create_signup(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare new_id uuid; target_max integer; current_count integer;
begin
  if nullif(trim(p->>'studentName'), '') is null or char_length(trim(p->>'studentName')) > 150 then raise exception 'Please enter a valid student name'; end if;
  if char_length(p->>'studentEmail') > 200 then raise exception 'Email address is too long'; end if;
  select max_attendance into target_max from public.events where id = (p->>'eventId')::uuid and status = 'active' for update;
  if target_max is null then raise exception 'Event not found'; end if;
  if (p->>'studentEmail' !~* '^[^[:space:]@]+@wsu\.edu$' or p->>'studentWSUID' !~ '^[0-9]{8,9}$') then raise exception 'Invalid student information'; end if;
  if exists (select 1 from public.signups where event_id = (p->>'eventId')::uuid and student_email = lower(trim(p->>'studentEmail'))) then raise exception 'You have already signed up for this event'; end if;
  if exists (select 1 from public.signups where event_id = (p->>'eventId')::uuid and student_wsuid = trim(p->>'studentWSUID')) then raise exception 'This WSU ID is already signed up for this event'; end if;
  select count(*) into current_count from public.signups where event_id = (p->>'eventId')::uuid;
  if current_count >= target_max then raise exception 'Event is full'; end if;
  insert into public.signups (event_id, student_name, student_email, student_wsuid)
  values ((p->>'eventId')::uuid, left(trim(p->>'studentName'), 150), lower(trim(p->>'studentEmail')), trim(p->>'studentWSUID')) returning id into new_id;
  return jsonb_build_object('success', true, 'signupId', new_id);
end;
$$;

create or replace function public.get_attendance(p_event_id uuid, p_pin text)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select case when p_pin = '1010' then jsonb_build_object('signups', coalesce((select jsonb_agg(to_jsonb(s) order by s.created_at) from public.signups s where s.event_id = p_event_id), '[]'::jsonb)) else jsonb_build_object('error', 'Incorrect PIN') end;
$$;

-- Grant execution only after all functions have been created.
grant execute on function public.get_public_events() to anon, authenticated;
grant execute on function public.submit_event(jsonb) to anon, authenticated;
grant execute on function public.create_signup(jsonb) to anon, authenticated;
grant execute on function public.get_attendance(uuid, text) to anon, authenticated;
