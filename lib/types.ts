// ---- Domain types (mirror supabase/migrations/001_schema.sql) ----

export type Role = "coach" | "student";

export interface Profile {
  id: string;
  role: Role;
  full_name: string | null;
  avatar_url: string | null;
}

export interface Group {
  id: string;
  coach_id: string;
  name: string;
  description: string | null;
  member_count?: number;
}

export type ProgramScope = "individual" | "group" | "self";
export type Cadence = "daily" | "weekly";

export interface Program {
  id: string;
  coach_id: string;
  title: string;
  description: string | null;
  scope: ProgramScope;
  group_id: string | null;
  student_id: string | null;
  cadence: Cadence;
  start_date: string | null;
  is_active: boolean;
  days: ProgramDay[];
}

export interface ProgramDay {
  id: string;
  program_id: string;
  day_index: number; // 0..6 for weekly programs
  title: string | null;
  notes: string | null;
  is_rest: boolean;
  exercises: ProgramExercise[];
}

export interface ProgramExercise {
  id: string;
  program_day_id: string;
  position: number;
  exercise_ref: string | null; // id in the external exercise DB
  exercise_name: string;
  sets: number | null;
  reps: string | null; // "8-12", "AMRAP", "30s"
  load: string | null; // "60kg", "BW", "70% 1RM"
  rest_seconds: number | null;
  notes: string | null;
}

export type SessionStatus = "scheduled" | "completed" | "skipped";

export interface Session {
  id: string;
  program_day_id: string;
  student_id: string;
  scheduled_date: string;
  status: SessionStatus;
  shared: boolean;
  student_name?: string;
  day_title?: string;
  program_title?: string;
  /** snapshot taken when the session was generated — edits to the
   *  underlying program do not retroactively change it */
  exercises?: SessionExercise[];
  review?: SessionReview | null;
}

export interface SessionExercise {
  id: string;
  session_id: string;
  position: number;
  exercise_ref: string | null;
  exercise_name: string;
  sets: number | null;
  reps: string | null;
  load: string | null;
  rest_seconds: number | null;
  notes: string | null;
}

export interface EnrolledStudent {
  id: string;
  full_name: string | null;
  status: string;
}

export interface SessionReview {
  id: string;
  session_id: string;
  student_id: string;
  /** 1 = way too easy … 3 = adapted … 5 = way too hard */
  difficulty: 1 | 2 | 3 | 4 | 5;
  adapted: boolean | null;
  comment: string | null;
  created_at: string;
}

export const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export const DIFFICULTY_LABELS: Record<number, string> = {
  1: "Way too easy",
  2: "A bit easy",
  3: "Well adapted",
  4: "A bit hard",
  5: "Way too hard",
};
