-- ProFit — initial schema
-- Run in the Supabase SQL editor, or `supabase db push`.

-- =============== profiles ===============
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  role text not null default 'student' check (role in ('coach', 'student')),
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

-- auto-create a profile on signup (role/name can be passed in auth metadata)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, role, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'role', 'student'),
    new.raw_user_meta_data ->> 'full_name'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =============== groups (shared-student programs) ===============
create table public.groups (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

create table public.group_members (
  group_id uuid not null references public.groups(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (group_id, student_id)
);

-- =============== programs ===============
-- scope:
--   'individual' → one student (student_id set)
--   'group'      → a group of students (group_id set)
--   'self'       → the coach's own training
create table public.programs (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  scope text not null default 'individual'
    check (scope in ('individual', 'group', 'self')),
  group_id uuid references public.groups(id) on delete set null,
  student_id uuid references public.profiles(id) on delete set null,
  cadence text not null default 'weekly' check (cadence in ('daily', 'weekly')),
  start_date date,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- day_index: 0..6 (Mon..Sun) for weekly cadence, running index for daily
create table public.program_days (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete cascade,
  day_index int not null,
  title text,
  notes text,
  is_rest boolean not null default false,
  unique (program_id, day_index)
);

create table public.program_exercises (
  id uuid primary key default gen_random_uuid(),
  program_day_id uuid not null references public.program_days(id) on delete cascade,
  position int not null default 0,
  exercise_ref text,          -- id in the external exercise DB (free-exercise-db)
  exercise_name text not null,
  sets int,
  reps text,                  -- "8-12", "AMRAP", "30s"
  load text,                  -- "60kg", "BW", "70% 1RM"
  rest_seconds int,
  notes text
);

-- =============== sessions & reviews ===============
create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  program_day_id uuid not null references public.program_days(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  scheduled_date date not null,
  status text not null default 'scheduled'
    check (status in ('scheduled', 'completed', 'skipped')),
  completed_at timestamptz,
  shared boolean not null default false, -- student chose to share this session
  created_at timestamptz not null default now()
);

create table public.session_reviews (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null unique references public.sessions(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  difficulty int not null check (difficulty between 1 and 5), -- 1 too easy … 5 too hard
  adapted boolean,   -- "was this session adapted to my level?"
  comment text,
  created_at timestamptz not null default now()
);

-- =============== indexes ===============
create index idx_programs_coach on public.programs (coach_id);
create index idx_program_days_program on public.program_days (program_id);
create index idx_program_exercises_day on public.program_exercises (program_day_id, position);
create index idx_sessions_student_date on public.sessions (student_id, scheduled_date);
create index idx_sessions_day on public.sessions (program_day_id);
create index idx_group_members_student on public.group_members (student_id);
