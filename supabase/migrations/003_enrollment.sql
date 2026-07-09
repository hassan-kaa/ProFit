-- ProFit — enrollment (coach roster) + assignment support
-- Run after 001_schema.sql and 002_rls.sql.

-- =============== coach roster ===============
create table public.coach_students (
  coach_id uuid not null references public.profiles(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'paused')),
  created_at timestamptz not null default now(),
  primary key (coach_id, student_id)
);

alter table public.coach_students enable row level security;

create policy "coach manages own roster" on public.coach_students
  for all using (coach_id = auth.uid()) with check (coach_id = auth.uid());
create policy "student reads own enrollment" on public.coach_students
  for select using (student_id = auth.uid());

-- coaches can read profiles of students enrolled with them
create policy "coach reads enrolled profiles" on public.profiles
  for select using (
    exists (
      select 1 from public.coach_students cs
      where cs.student_id = profiles.id and cs.coach_id = auth.uid()
    )
  );

-- =============== idempotent session generation ===============
-- assigning a program twice must not duplicate sessions
create unique index uniq_session_day_student_date
  on public.sessions (program_day_id, student_id, scheduled_date);

-- =============== enroll by email ===============
-- Students self-signup; the coach enrolls them by email. Security definer so
-- it can look up auth.users (not exposed through the API otherwise).
create or replace function public.enroll_student_by_email(p_email text)
returns jsonb
language plpgsql
security definer set search_path = ''
as $$
declare
  v_student uuid;
  v_role text;
  v_name text;
begin
  if not exists (
    select 1 from public.profiles where id = auth.uid() and role = 'coach'
  ) then
    return jsonb_build_object('error', 'Only coaches can enroll students.');
  end if;

  select u.id into v_student
  from auth.users u
  where lower(u.email) = lower(trim(p_email));

  if v_student is null then
    return jsonb_build_object(
      'error',
      'No account found for this email. Ask the student to sign up first.'
    );
  end if;

  select p.role, p.full_name into v_role, v_name
  from public.profiles p where p.id = v_student;

  if v_role is distinct from 'student' then
    return jsonb_build_object('error', 'This email belongs to a coach account.');
  end if;

  insert into public.coach_students (coach_id, student_id)
  values (auth.uid(), v_student)
  on conflict do nothing;

  return jsonb_build_object('ok', true, 'student_id', v_student, 'full_name', v_name);
end;
$$;
