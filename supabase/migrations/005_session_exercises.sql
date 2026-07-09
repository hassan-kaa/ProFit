-- ProFit — per-session exercise snapshots
-- Run after 001_schema.sql, 002_rls.sql, 003_enrollment.sql, 004_fix_group_rls_recursion.sql.
--
-- Sessions used to always live-join program_exercises through
-- program_day_id, so editing a program retroactively rewrote what
-- already-completed/reviewed sessions showed. This snapshots each session's
-- exercises at generation time (assignProgramToStudent) so later program
-- edits only affect future sessions, and a single occurrence can be edited
-- independently (reschedule, swap exercises) without touching the program.

create table public.session_exercises (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  position int not null default 0,
  exercise_ref text,
  exercise_name text not null,
  sets int,
  reps text,
  load text,
  rest_seconds int,
  notes text
);

create index idx_session_exercises_session on public.session_exercises (session_id, position);

alter table public.session_exercises enable row level security;

create policy "coach manages session exercises" on public.session_exercises
  for all using (
    exists (
      select 1 from public.sessions s
      join public.program_days d on d.id = s.program_day_id
      where s.id = session_exercises.session_id
        and public.is_program_coach(d.program_id)
    )
  );

create policy "students read own session exercises" on public.session_exercises
  for select using (
    exists (
      select 1 from public.sessions s
      where s.id = session_exercises.session_id
        and s.student_id = auth.uid()
    )
  );

create policy "read exercises of shared sessions" on public.session_exercises
  for select using (
    exists (
      select 1 from public.sessions s
      join public.program_days d on d.id = s.program_day_id
      where s.id = session_exercises.session_id
        and s.shared
        and public.is_program_student(d.program_id)
    )
  );
