# ProFit — AI-assisted fitness coaching

MVP scaffold: Next.js 15 (App Router) + Supabase + Claude API + Tailwind CSS v4.

## Quick start

```bash
npm install
npm run dev        # http://localhost:3000
```

The app runs in **demo mode** out of the box (no keys needed) — all coach
screens work with sample data so you can explore the UX immediately.

## Enable Supabase (auth + persistence)

1. Create a project at [supabase.com](https://supabase.com).
2. In the SQL editor, run in order:
   - `supabase/migrations/001_schema.sql`
   - `supabase/migrations/002_rls.sql`
   - `supabase/migrations/003_enrollment.sql`
3. Fill in `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` in
   `.env` (Project Settings → API).
4. Restart `npm run dev`. Auth, role guards, and persistence activate
   automatically.

Tip: for local testing, disable "Confirm email" under Authentication →
Providers → Email, so signups work without an email server.

## Auth & roles

Two separate entrances, one auth system:

- **Coaches** sign in/up at `/login` → land on `/dashboard`. Signups here
  create `role = 'coach'` profiles.
- **Students** sign in/up at `/login/student` → land on `/student`. Signups
  here create `role = 'student'` profiles.
- Roles are stored in `profiles` (set via auth metadata →
  `handle_new_user` trigger). Both layouts do a server-side role check: a
  student opening `/dashboard` is redirected to `/student` and vice versa,
  regardless of which login page they used.

## Enrollment & program assignment

1. Student signs up at `/login/student` and shares their email with the coach.
2. Coach: Students & Groups → **Enroll student** → enter that email
   (`enroll_student_by_email` RPC → `coach_students` row; the coach gains
   read access to the student's profile via RLS).
3. Coach: **Assign program** on the student card → picks one of their
   programs. This links the program (`programs.student_id`) and
   auto-creates one session per training day for the current week
   (idempotent — a unique index prevents duplicates on re-assign).
4. The student immediately sees the sessions under Today / Coming up.

## Enable AI assistance

Add `ANTHROPIC_API_KEY` to `.env.local` (from console.anthropic.com).
Without it, the AI panel returns a canned demo response.

The AI route (`app/api/ai/assist/route.ts`) sends the full program context
(days, exercises, sets/reps/loads) with each request, so suggestions are
specific to the open program.

## Exercise animations

Source: [ExerciseDB OSS](https://github.com/bootstrapping-lab/exercisedb-api)
(AGPL-3.0, non-commercial use — revisit if this ever goes commercial) —
~1,500 exercises with real animated GIFs, no API key, hotlinked from the
repo's `/media` folder the same way the previous source was hotlinked. The
adapter lives in `lib/exercise-db.ts`.

Each exercise also gets a `trainingType` (mobility / strength / coordination
/ speed / agility / cardio) — a taxonomy the source data doesn't provide, so
it's produced by a one-time AI classification pass
(`scripts/classify-exercise-types.mjs`, run with
`node --env-file=.env scripts/classify-exercise-types.mjs`) and cached in
`lib/exercise-training-types.json`. Re-run it if the upstream dataset grows;
already-classified ids are skipped.

## Coach ↔ student flow (demo mode)

Both views share one client-side store (`lib/demo-store.ts`,
localStorage-backed), so the full loop works end to end without a backend:

1. Coach builds a program (weekly builder) → student is enrolled
   (individually or via group).
2. Student ("Student view" button in the sidebar) sees today's session,
   checks off sets, taps exercise names for animated form guides.
3. On finish, the student reviews the session (difficulty 1–5, "adapted to
   my level?", comment) and can share it with their group.
4. Back in the coach view: dashboard reviews, schedule statuses, and
   student cards update instantly. Shared sessions appear in programmates'
   "Shared" feed.

The store's read/write functions map 1:1 to the Supabase tables
(`sessions`, `session_reviews`), so swapping in real persistence is a
drop-in refactor.

## Project structure

```
app/
  (dashboard)/          # coach UI (sidebar layout)
    dashboard/          # overview: today's sessions, reviews, programs
    programs/           # program list + weekly builder ([id])
    schedule/           # week view across students/groups
    exercises/          # searchable animated exercise library
    students/           # students & groups
  student/              # student UI (top-nav, mobile-first, sky accent)
    (index)             # today: session runner w/ set check-off + review
    program/            # read-only week view of enrolled programs
    shared/             # feed of sessions programmates shared
  api/ai/assist/        # Claude API route (server-side key)
  login/                # Supabase email auth (coach signup)
components/
  ProgramBuilder.tsx    # weekly grid editor (sets/reps/load, rest days)
  ExercisePickerModal.tsx
  ExerciseAnimation.tsx # 2-frame cross-fade animation
  ExerciseDetailModal.tsx # form guide lookup by exercise ref
  ReviewModal.tsx       # post-session difficulty/adapted/comment
  AiAssistPanel.tsx     # program-aware AI chat
  Sidebar.tsx, ui.tsx
lib/
  types.ts              # domain types (mirror the SQL schema)
  exercise-db.ts        # exercise data adapter (swappable source)
  data.ts               # THE data layer: Supabase queries + demo fallback
  demo-data.ts          # demo-mode fixtures
  supabase/             # browser/server/middleware clients
supabase/migrations/    # schema + RLS + enrollment
```

## Data model (summary)

`profiles` (coach/student) → `groups` + `group_members` →
`programs` (scope: individual | group | self; cadence: daily | weekly) →
`program_days` → `program_exercises` (sets, reps, load, rest) →
`sessions` (per student per date, shareable) → `session_reviews`
(difficulty 1–5, "adapted to my level", comment).

RLS: coaches manage everything they own; students see only programs they're
enrolled in (directly or via group), write their own reviews, and can see
sessions other students chose to share.

## Theme

Dark theme with semantic colors (defined in `app/globals.css`):
primary blue (from the logo) = training/primary actions, violet = AI features,
orange = load/intensity, sky = schedule/info, amber = reviews, rose = "too
hard" alerts.

## Logo

The `Logo` component (`components/Logo.tsx`) renders the brand lockup from
`public/logo.png` — save the asset there (not committed as a placeholder;
add your own file) and it's picked up automatically by the sidebar, student
top-nav, both login pages, and the browser favicon (`app/layout.tsx` →
`metadata.icons`).

## Roadmap

- [ ] Group management UI (create groups, add members, assign group programs)
- [ ] Recurring session generation (next weeks, not just the current one)
- [ ] AI: structured program edits (apply suggestions with one click)
- [ ] Team organization module (football teams: injuries, recovery, prep sessions)
