# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # start dev server (http://localhost:3000)
npm run build       # production build
npm run start       # run production build
npm run lint         # next lint
npm run typecheck   # tsc --noEmit
```

There is no test suite / test runner configured yet.

## Architecture

Next.js 15 (App Router) + Supabase + Claude API + Tailwind v4. Two parallel
UIs sharing one auth system and one data layer:

- `app/(dashboard)/` — coach UI (sidebar layout): dashboard, programs (list +
  weekly builder), schedule, exercise library, students & groups.
- `app/student/` — student UI (top-nav, mobile-first): today's session
  runner, read-only program view, shared-sessions feed.
- `app/api/ai/assist/route.ts` — server-side Claude API route (needs
  `ANTHROPIC_API_KEY`; returns a canned response without it).

**Auth & role guards**: `middleware.ts` → `lib/supabase/middleware.ts`
refreshes the Supabase session cookie and redirects unauthenticated users to
`/login` (coach) or `/login/student` (student). Each layout
(`app/(dashboard)/layout.tsx`, `app/student/layout.tsx`) is a server
component that independently re-checks `profiles.role` and redirects a
student away from `/dashboard` (and a coach away from `/student`). **A user
with no `profiles` row fails both checks and bounces between the two routes
forever (visible as alternating 307s)** — every account needs a profile row,
normally created by the `handle_new_user` trigger on signup.

**Data layer**: pages/components never talk to Supabase directly — they go
through `lib/data.ts`, a unified set of hooks that transparently switches
between real Supabase queries and a localStorage-backed demo store
(`lib/demo-data.ts`) based on `isSupabaseConfigured()`
(`lib/supabase/client.ts` / `server.ts`, true iff `NEXT_PUBLIC_SUPABASE_URL`

- `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set). Demo mode's read/write shape maps
  1:1 to the real tables, so it's the reference for what any new persistence
  code should look like.

**Database & RLS**: `supabase/migrations/*.sql`, applied in order via the
Supabase SQL Editor (no CLI/migration runner wired up):

1. `001_schema.sql` — tables + `handle_new_user` trigger (auto-creates a
   `profiles` row on signup, role from auth metadata, default `student`).
2. `002_rls.sql` — RLS policies + `is_program_coach`/`is_program_student`
   security-definer helpers.
3. `003_enrollment.sql` — `coach_students` roster + `enroll_student_by_email` RPC.
4. `004_fix_group_rls_recursion.sql` — fixes infinite RLS recursion between
   `groups` ↔ `group_members` (and the `profiles` policy joining them) by
   routing through security-definer helpers instead of direct cross-table
   subqueries in the policy itself.

   **Rule for any new cross-table RLS policy**: never let a policy on table A
   subquery table B if B has a policy that subqueries A — wrap the check in a
   `security definer` function (following `is_program_coach` /
   `is_group_coach` / `is_coach_of_student`) so it bypasses RLS instead of
   recursing.

**Exercise data**: `lib/exercise-db.ts` adapts
[free-exercise-db](https://github.com/yuhonas/free-exercise-db) (public
domain, ~870 exercises, start/end photos only — `ExerciseAnimation`
cross-fades between them). This is the one file to change to upgrade to a
real animated-GIF source (e.g. ExerciseDB/RapidAPI) later.

**Theme**: dark, semantic colors defined in `app/globals.css` — lime =
training/primary actions, violet = AI features, orange = load/intensity, sky
= schedule/info, amber = reviews, rose = "too hard" alerts.

## Environment

`.env` needs `NEXT_PUBLIC_SUPABASE_URL` (the project's `https://*.supabase.co`
API URL from Project Settings → API — **not** the Postgres connection
string), `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and optionally `ANTHROPIC_API_KEY`.
Without the Supabase vars the app runs in full demo mode (no auth, no
persistence, sample data only). For local testing, disable "Confirm email"
under Authentication → Providers → Email in the Supabase dashboard — the
shared default SMTP has a very low send rate limit that trips easily during
repeated signup testing.

## Features

- Coach: program builder (weekly grid — sets/reps/load/rest, rest days),
  program list, schedule (week view across students/groups), searchable
  animated exercise library, students & groups management, enroll student by
  email, assign program to a student (idempotent session generation).
- Student: today's session runner with set check-off, exercise form-guide
  lookups, post-session review (difficulty 1–5, "adapted to my level?",
  comment), opt-in sharing of a completed session, feed of programmates'
  shared sessions.
- AI assist panel: program-aware chat, sends full program context (days,
  exercises, sets/reps/loads) to Claude with each request.

## Roadmap

- [ ] Group management UI (create groups, add members, assign group programs)
- [ ] Recurring session generation (next weeks, not just the current one)
- [ ] AI: structured program edits (apply suggestions with one click)
- [ ] Team organization module (football teams: injuries, recovery, prep sessions)

## Progress log

Keep this updated with dated, one-line entries for notable fixes/decisions —
not routine feature work (that belongs in git history).

- 2026-07-07: fixed stale `@supabase/phoenix` install (missing `phoenix.mjs`,
  clean `node_modules` reinstall fixed it); fixed `NEXT_PUBLIC_SUPABASE_URL`
  set to a Postgres connection string instead of the HTTPS API URL; fixed
  infinite RLS recursion between `groups`/`group_members`/`profiles`
  (`004_fix_group_rls_recursion.sql`).

## Todos

- ability to choose the rest days and reschedule them
- ability to choose whether the coach is assigning a sinlge session or a weekly program
- ability to edit sessions and programs
- the ai adds the sessions himself to if confirmed by the user
- change the current images representing the exercices to 2d animations (look for a free api)
- change the calendar view to make it more easy and obvious for the coach (should look more spacious and easy to interact and read)
- add exercices types (not just group by muscle), like mobility , strengh , coordination, speed, agility .. etc
- we should define a strategy for users to share the sessions if they like it
