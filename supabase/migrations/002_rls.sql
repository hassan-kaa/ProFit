-- ProFit — row level security

alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.programs enable row level security;
alter table public.program_days enable row level security;
alter table public.program_exercises enable row level security;
alter table public.sessions enable row level security;
alter table public.session_reviews enable row level security;

-- helper: is the current user the coach of a program?
create or replace function public.is_program_coach(p_program_id uuid)
returns boolean
language sql security definer set search_path = ''
stable as $$
  select exists (
    select 1 from public.programs
    where id = p_program_id and coach_id = auth.uid()
  );
$$;

-- helper: is the current user enrolled in a program (directly or via group)?
create or replace function public.is_program_student(p_program_id uuid)
returns boolean
language sql security definer set search_path = ''
stable as $$
  select exists (
    select 1 from public.programs p
    where p.id = p_program_id
      and (
        p.student_id = auth.uid()
        or exists (
          select 1 from public.group_members gm
          where gm.group_id = p.group_id and gm.student_id = auth.uid()
        )
      )
  );
$$;

-- =============== profiles ===============
create policy "read own profile" on public.profiles
  for select using (id = auth.uid());
-- coaches can see students in their groups / individual programs
create policy "coach reads related profiles" on public.profiles
  for select using (
    exists (
      select 1 from public.group_members gm
      join public.groups g on g.id = gm.group_id
      where gm.student_id = profiles.id and g.coach_id = auth.uid()
    )
    or exists (
      select 1 from public.programs p
      where p.student_id = profiles.id and p.coach_id = auth.uid()
    )
  );
create policy "update own profile" on public.profiles
  for update using (id = auth.uid());

-- =============== groups ===============
create policy "coach manages own groups" on public.groups
  for all using (coach_id = auth.uid()) with check (coach_id = auth.uid());
create policy "students read their groups" on public.groups
  for select using (
    exists (
      select 1 from public.group_members gm
      where gm.group_id = groups.id and gm.student_id = auth.uid()
    )
  );

create policy "coach manages group members" on public.group_members
  for all using (
    exists (select 1 from public.groups g
            where g.id = group_members.group_id and g.coach_id = auth.uid())
  );
create policy "students read own membership" on public.group_members
  for select using (student_id = auth.uid());

-- =============== programs ===============
create policy "coach manages own programs" on public.programs
  for all using (coach_id = auth.uid()) with check (coach_id = auth.uid());
create policy "students read enrolled programs" on public.programs
  for select using (public.is_program_student(id));

create policy "coach manages program days" on public.program_days
  for all using (public.is_program_coach(program_id));
create policy "students read program days" on public.program_days
  for select using (public.is_program_student(program_id));

create policy "coach manages program exercises" on public.program_exercises
  for all using (
    exists (select 1 from public.program_days d
            where d.id = program_exercises.program_day_id
              and public.is_program_coach(d.program_id))
  );
create policy "students read program exercises" on public.program_exercises
  for select using (
    exists (select 1 from public.program_days d
            where d.id = program_exercises.program_day_id
              and public.is_program_student(d.program_id))
  );

-- =============== sessions ===============
create policy "coach manages sessions of own programs" on public.sessions
  for all using (
    exists (select 1 from public.program_days d
            where d.id = sessions.program_day_id
              and public.is_program_coach(d.program_id))
  );
create policy "students read own sessions" on public.sessions
  for select using (student_id = auth.uid());
create policy "students update own sessions" on public.sessions
  for update using (student_id = auth.uid());
-- shared sessions are visible to other students of the same program
create policy "read shared sessions" on public.sessions
  for select using (
    shared and exists (
      select 1 from public.program_days d
      where d.id = sessions.program_day_id
        and public.is_program_student(d.program_id)
    )
  );

-- =============== session reviews ===============
create policy "students write own reviews" on public.session_reviews
  for insert with check (student_id = auth.uid());
create policy "students read own reviews" on public.session_reviews
  for select using (student_id = auth.uid());
create policy "coach reads reviews of own programs" on public.session_reviews
  for select using (
    exists (
      select 1 from public.sessions s
      join public.program_days d on d.id = s.program_day_id
      where s.id = session_reviews.session_id
        and public.is_program_coach(d.program_id)
    )
  );
