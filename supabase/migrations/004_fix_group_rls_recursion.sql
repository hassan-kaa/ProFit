-- KamilFit — fix infinite RLS recursion between groups <-> group_members
-- (and the profiles policy that joins them directly).
--
-- security definer functions run as the function owner (table owner), which
-- bypasses RLS on the tables it queries — same pattern already used by
-- is_program_coach / is_program_student in 002_rls.sql.

create or replace function public.is_group_coach(p_group_id uuid)
returns boolean
language sql security definer set search_path = ''
stable as $$
  select exists (
    select 1 from public.groups
    where id = p_group_id and coach_id = auth.uid()
  );
$$;

create or replace function public.is_group_member(p_group_id uuid)
returns boolean
language sql security definer set search_path = ''
stable as $$
  select exists (
    select 1 from public.group_members
    where group_id = p_group_id and student_id = auth.uid()
  );
$$;

create or replace function public.is_coach_of_student(p_student_id uuid)
returns boolean
language sql security definer set search_path = ''
stable as $$
  select exists (
    select 1 from public.group_members gm
    join public.groups g on g.id = gm.group_id
    where gm.student_id = p_student_id and g.coach_id = auth.uid()
  )
  or exists (
    select 1 from public.programs p
    where p.student_id = p_student_id and p.coach_id = auth.uid()
  );
$$;

-- groups: replace direct group_members subquery with helper
drop policy if exists "students read their groups" on public.groups;
create policy "students read their groups" on public.groups
  for select using (public.is_group_member(id));

-- group_members: replace direct groups subquery with helper
drop policy if exists "coach manages group members" on public.group_members;
create policy "coach manages group members" on public.group_members
  for all using (public.is_group_coach(group_id))
  with check (public.is_group_coach(group_id));

-- profiles: replace direct group_members/groups join with helper
drop policy if exists "coach reads related profiles" on public.profiles;
create policy "coach reads related profiles" on public.profiles
  for select using (public.is_coach_of_student(id));
