"use client";

/**
 * Unified client data layer.
 *
 * Real mode  → Supabase (auth, RLS-guarded queries).
 * Demo mode  → localStorage over the fixtures in demo-data.ts
 *              (active while NEXT_PUBLIC_SUPABASE_* are unset).
 *
 * Pages/components only ever import from here, so removing demo mode later
 * touches exactly one file.
 */

import { useCallback, useEffect, useState } from "react";
import { createClient, isSupabaseConfigured } from "./supabase/client";
import {
  DEMO_COACH,
  DEMO_PROGRAMS,
  DEMO_SESSIONS,
  DEMO_STUDENTS,
  DEMO_GROUPS,
  DEMO_GROUP_MEMBERS,
  DEMO_TODAY,
} from "./demo-data";
import type {
  EnrolledStudent,
  Group,
  Profile,
  Program,
  ProgramExercise,
  Session,
  SessionExercise,
  SessionReview,
} from "./types";

/* ================================================================== */
/* events & shared hook plumbing                                       */
/* ================================================================== */

const EVENT = "profit-data";

function notify() {
  window.dispatchEvent(new Event(EVENT));
}

/** re-runs `load` on mount and whenever any mutation calls notify() */
function useLiveQuery<T>(load: () => Promise<T>, initial: T): T {
  const [value, setValue] = useState<T>(initial);
  const refresh = useCallback(() => {
    load().then(setValue).catch(console.error);
  }, [load]);
  useEffect(() => {
    refresh();
    window.addEventListener(EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [refresh]);
  return value;
}

export const demoMode = () => !isSupabaseConfigured();

export function getToday(): string {
  return demoMode() ? DEMO_TODAY : new Date().toISOString().slice(0, 10);
}

function mondayOf(dateStr: string): Date {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d;
}

export function weekDates(today = getToday()): string[] {
  const mon = mondayOf(today);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mon);
    d.setUTCDate(d.getUTCDate() + i);
    return d.toISOString().slice(0, 10);
  });
}

/* ================================================================== */
/* demo-mode storage                                                   */
/* ================================================================== */

const DEMO_STATE_KEY = "profit-demo-v1";
const DEMO_STUDENT_KEY = "profit-demo-student";

function demoState(): { programs: Program[]; sessions: Session[] } {
  try {
    const raw = localStorage.getItem(DEMO_STATE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as {
        programs?: Program[];
        sessions?: Session[];
      };
      return {
        programs: parsed.programs ?? DEMO_PROGRAMS,
        sessions: parsed.sessions ?? DEMO_SESSIONS,
      };
    }
  } catch {
    /* fall through */
  }
  return { programs: DEMO_PROGRAMS, sessions: DEMO_SESSIONS };
}

function demoPrograms(): Program[] {
  return demoState().programs;
}

function demoSessions(): Session[] {
  return demoState().sessions;
}

function demoSave(patch: Partial<{ programs: Program[]; sessions: Session[] }>) {
  localStorage.setItem(DEMO_STATE_KEY, JSON.stringify({ ...demoState(), ...patch }));
  notify();
}

function demoMutateSession(id: string, fn: (s: Session) => Session) {
  demoSave({ sessions: demoSessions().map((s) => (s.id === id ? fn(s) : s)) });
}

function demoMutateProgram(id: string, fn: (p: Program) => Program) {
  demoSave({ programs: demoPrograms().map((p) => (p.id === id ? fn(p) : p)) });
}

function demoStudentId(): string {
  if (typeof window === "undefined") return "s1";
  return localStorage.getItem(DEMO_STUDENT_KEY) ?? "s1";
}

function demoFindDay(dayId: string) {
  for (const program of demoPrograms()) {
    const day = program.days.find((d) => d.id === dayId);
    if (day) return { program, day };
  }
  return null;
}

function demoIsProgramMate(studentId: string, s: Session): boolean {
  const found = demoFindDay(s.program_day_id);
  if (!found) return false;
  if (found.program.student_id === studentId) return true;
  if (found.program.group_id)
    return (
      DEMO_GROUP_MEMBERS[found.program.group_id]?.includes(studentId) ?? false
    );
  return false;
}

/* ================================================================== */
/* row mapping (supabase → domain types)                               */
/* ================================================================== */

/* eslint-disable @typescript-eslint/no-explicit-any */
function one<T>(v: T | T[] | null | undefined): T | null {
  if (v == null) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

function mapProgram(row: any): Program {
  const days = (row.program_days ?? [])
    .map((d: any) => ({
      id: d.id,
      program_id: d.program_id,
      day_index: d.day_index,
      title: d.title,
      notes: d.notes,
      is_rest: d.is_rest,
      exercises: (d.program_exercises ?? []).sort(
        (a: any, b: any) => a.position - b.position
      ),
    }))
    .sort((a: any, b: any) => a.day_index - b.day_index);
  return { ...row, program_days: undefined, days } as Program;
}

function mapSession(row: any): Session {
  const day = one<any>(row.program_days);
  const prog = day ? one<any>(day.programs) : null;
  const student = one<any>(row.profiles);
  return {
    id: row.id,
    program_day_id: row.program_day_id,
    student_id: row.student_id,
    scheduled_date: row.scheduled_date,
    status: row.status,
    shared: row.shared,
    student_name: student?.full_name ?? undefined,
    day_title: day?.title ?? undefined,
    program_title: prog?.title ?? undefined,
    exercises: row.session_exercises
      ? [...row.session_exercises].sort(
          (a: any, b: any) => a.position - b.position
        )
      : undefined,
    review: one<SessionReview>(row.session_reviews),
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

const SESSION_SELECT =
  "*, session_reviews(*), profiles(full_name), session_exercises(*), " +
  "program_days!inner(title, programs!inner(title))";

/* ================================================================== */
/* auth & profile                                                      */
/* ================================================================== */

export async function fetchMyProfile(): Promise<Profile | null> {
  if (demoMode()) return null;
  const sb = createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return null;
  const { data } = await sb
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  return data as Profile | null;
}

export function useProfile() {
  return useLiveQuery<Profile | null>(fetchMyProfile, null);
}

export async function signOut() {
  if (demoMode()) return;
  await createClient().auth.signOut();
}

/** demo-mode student impersonation (real mode: identity comes from auth) */
export function useCurrentStudent() {
  const [studentId, setId] = useState("s1");
  useEffect(() => {
    const refresh = () => setId(demoStudentId());
    refresh();
    window.addEventListener(EVENT, refresh);
    return () => window.removeEventListener(EVENT, refresh);
  }, []);
  const setStudentId = useCallback((id: string) => {
    localStorage.setItem(DEMO_STUDENT_KEY, id);
    notify();
  }, []);
  return { studentId, setStudentId };
}

/* ================================================================== */
/* programs (coach)                                                    */
/* ================================================================== */

export async function fetchPrograms(): Promise<Program[]> {
  if (demoMode()) return demoPrograms();
  const sb = createClient();
  const { data, error } = await sb
    .from("programs")
    .select("*, program_days(*, program_exercises(*))")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapProgram);
}

export function usePrograms(): Program[] {
  return useLiveQuery(fetchPrograms, []);
}

export async function fetchProgram(id: string): Promise<Program | null> {
  if (demoMode()) return demoPrograms().find((p) => p.id === id) ?? null;
  const sb = createClient();
  const { data } = await sb
    .from("programs")
    .select("*, program_days(*, program_exercises(*))")
    .eq("id", id)
    .single();
  return data ? mapProgram(data) : null;
}

export function useProgram(id: string) {
  const load = useCallback(() => fetchProgram(id), [id]);
  const [state, setState] = useState<{
    program: Program | null;
    loading: boolean;
  }>({ program: null, loading: true });
  useEffect(() => {
    load().then((program) => setState({ program, loading: false }));
  }, [load]);
  return state;
}

export async function createProgram(): Promise<string | null> {
  if (demoMode()) {
    const id = `demo-${crypto.randomUUID()}`;
    const program: Program = {
      id,
      coach_id: DEMO_COACH.id,
      title: "New program",
      description: null,
      scope: "individual",
      group_id: null,
      student_id: null,
      cadence: "weekly",
      start_date: null,
      is_active: true,
      days: Array.from({ length: 7 }, (_, i) => ({
        id: `${id}-d${i}`,
        program_id: id,
        day_index: i,
        title: null,
        notes: null,
        is_rest: i >= 5,
        exercises: [],
      })),
    };
    demoSave({ programs: [...demoPrograms(), program] });
    return id;
  }
  const sb = createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return null;
  const { data: prog, error } = await sb
    .from("programs")
    .insert({ coach_id: user.id, title: "New program", scope: "individual" })
    .select()
    .single();
  if (error || !prog) throw error;
  await sb.from("program_days").insert(
    Array.from({ length: 7 }, (_, i) => ({
      program_id: prog.id,
      day_index: i,
      is_rest: i >= 5, // weekend rest by default
    }))
  );
  notify();
  return prog.id as string;
}

/**
 * Persists the builder state. Days are upserted by (program_id, day_index)
 * so their ids — and any sessions pointing at them — survive the save.
 */
export async function saveProgram(p: Program): Promise<void> {
  if (demoMode()) {
    demoMutateProgram(p.id, () => p);
    return;
  }
  const sb = createClient();

  const { error: progErr } = await sb
    .from("programs")
    .update({
      title: p.title,
      description: p.description,
      scope: p.scope,
      group_id: p.group_id,
      student_id: p.student_id,
      cadence: p.cadence,
      start_date: p.start_date,
      is_active: p.is_active,
    })
    .eq("id", p.id);
  if (progErr) throw progErr;

  const { data: days, error: dayErr } = await sb
    .from("program_days")
    .upsert(
      p.days.map((d) => ({
        program_id: p.id,
        day_index: d.day_index,
        title: d.title,
        notes: d.notes,
        is_rest: d.is_rest,
      })),
      { onConflict: "program_id,day_index" }
    )
    .select();
  if (dayErr) throw dayErr;

  const idByIndex = new Map<number, string>(
    (days ?? []).map((d) => [d.day_index as number, d.id as string])
  );

  const dayIds = [...idByIndex.values()];
  if (dayIds.length) {
    await sb.from("program_exercises").delete().in("program_day_id", dayIds);
  }
  const rows = p.days.flatMap((d) =>
    d.exercises.map((e, i) => ({
      program_day_id: idByIndex.get(d.day_index),
      position: i,
      exercise_ref: e.exercise_ref,
      exercise_name: e.exercise_name,
      sets: e.sets,
      reps: e.reps,
      load: e.load,
      rest_seconds: e.rest_seconds,
      notes: e.notes,
    }))
  );
  if (rows.length) {
    const { error } = await sb.from("program_exercises").insert(rows);
    if (error) throw error;
  }
  notify();
}

/* ================================================================== */
/* enrollment & assignment (coach)                                     */
/* ================================================================== */

export async function fetchEnrolledStudents(): Promise<EnrolledStudent[]> {
  if (demoMode())
    return DEMO_STUDENTS.map((s) => ({
      id: s.id,
      full_name: s.full_name,
      status: "active",
    }));
  const sb = createClient();
  const { data: roster } = await sb
    .from("coach_students")
    .select("student_id, status");
  const ids = (roster ?? []).map((r) => r.student_id);
  if (ids.length === 0) return [];
  const { data: profiles } = await sb
    .from("profiles")
    .select("id, full_name")
    .in("id", ids);
  const statusById = new Map(
    (roster ?? []).map((r) => [r.student_id, r.status])
  );
  return (profiles ?? []).map((p) => ({
    id: p.id,
    full_name: p.full_name,
    status: statusById.get(p.id) ?? "active",
  }));
}

export function useEnrolledStudents(): EnrolledStudent[] {
  return useLiveQuery(fetchEnrolledStudents, []);
}

export async function enrollStudentByEmail(
  email: string
): Promise<{ ok?: boolean; full_name?: string; error?: string }> {
  if (demoMode())
    return { error: "Demo mode — connect Supabase to enroll real students." };
  const sb = createClient();
  const { data, error } = await sb.rpc("enroll_student_by_email", {
    p_email: email,
  });
  if (error) return { error: error.message };
  if (data?.ok) notify();
  return data as { ok?: boolean; full_name?: string; error?: string };
}

/**
 * Links a program to a student and generates one session per training day
 * for the current week (idempotent thanks to the unique index), snapshotting
 * each day's current exercises onto the new session so later program edits
 * don't retroactively change it.
 */
export async function assignProgramToStudent(
  programId: string,
  studentId: string
): Promise<{ created: number; error?: string }> {
  if (demoMode()) {
    const program = demoPrograms().find((p) => p.id === programId);
    if (!program) return { created: 0, error: "Program not found." };
    demoMutateProgram(programId, (p) => ({
      ...p,
      student_id: studentId,
      scope: "individual",
    }));

    const week = weekDates();
    const existing = demoSessions();
    const studentName = DEMO_STUDENTS.find((s) => s.id === studentId)?.full_name;
    const newSessions: Session[] = [];
    for (const day of program.days) {
      if (day.is_rest) continue;
      const scheduled_date = week[day.day_index] ?? week[0];
      const dup = existing.some(
        (s) =>
          s.program_day_id === day.id &&
          s.student_id === studentId &&
          s.scheduled_date === scheduled_date
      );
      if (dup) continue;
      const sessionId = `demo-sess-${crypto.randomUUID()}`;
      newSessions.push({
        id: sessionId,
        program_day_id: day.id,
        student_id: studentId,
        scheduled_date,
        status: "scheduled",
        shared: false,
        student_name: studentName,
        day_title: day.title ?? undefined,
        program_title: program.title,
        exercises: day.exercises.map((e, i) => ({
          id: `${sessionId}-e${i}`,
          session_id: sessionId,
          position: i,
          exercise_ref: e.exercise_ref,
          exercise_name: e.exercise_name,
          sets: e.sets,
          reps: e.reps,
          load: e.load,
          rest_seconds: e.rest_seconds,
          notes: e.notes,
        })),
        review: null,
      });
    }
    demoSave({ sessions: [...demoSessions(), ...newSessions] });
    return { created: newSessions.length };
  }

  const sb = createClient();

  const { error: linkErr } = await sb
    .from("programs")
    .update({ student_id: studentId, scope: "individual" })
    .eq("id", programId);
  if (linkErr) return { created: 0, error: linkErr.message };

  const { data: days } = await sb
    .from("program_days")
    .select("id, day_index, is_rest, program_exercises(*)")
    .eq("program_id", programId);

  const week = weekDates();
  const rows = (days ?? [])
    .filter((d) => !d.is_rest)
    .map((d) => ({
      program_day_id: d.id,
      student_id: studentId,
      scheduled_date: week[d.day_index] ?? week[0],
    }));

  if (rows.length === 0) return { created: 0 };

  const { data: inserted, error } = await sb
    .from("sessions")
    .upsert(rows, {
      onConflict: "program_day_id,student_id,scheduled_date",
      ignoreDuplicates: true,
    })
    .select("id, program_day_id");
  if (error) return { created: 0, error: error.message };

  const exercisesByDay = new Map<string, ProgramExercise[]>(
    (days ?? []).map((d) => [
      d.id as string,
      ((d.program_exercises ?? []) as ProgramExercise[])
        .slice()
        .sort((a, b) => a.position - b.position),
    ])
  );
  const exerciseRows = (inserted ?? []).flatMap((s) =>
    (exercisesByDay.get(s.program_day_id as string) ?? []).map((e, i) => ({
      session_id: s.id,
      position: i,
      exercise_ref: e.exercise_ref,
      exercise_name: e.exercise_name,
      sets: e.sets,
      reps: e.reps,
      load: e.load,
      rest_seconds: e.rest_seconds,
      notes: e.notes,
    }))
  );
  if (exerciseRows.length) {
    const { error: exErr } = await sb
      .from("session_exercises")
      .insert(exerciseRows);
    if (exErr) return { created: 0, error: exErr.message };
  }

  notify();
  return { created: (inserted ?? []).length };
}

/* ================================================================== */
/* groups                                                              */
/* ================================================================== */

export async function fetchGroups(): Promise<Group[]> {
  if (demoMode()) return DEMO_GROUPS;
  const sb = createClient();
  const { data } = await sb.from("groups").select("*");
  return (data ?? []) as Group[];
}

export function useGroups(): Group[] {
  return useLiveQuery(fetchGroups, []);
}

/* ================================================================== */
/* sessions                                                            */
/* ================================================================== */

/** all sessions across the coach's programs */
export async function fetchCoachSessions(): Promise<Session[]> {
  if (demoMode()) return demoSessions();
  const sb = createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return [];
  // RLS ("coach manages sessions of own programs") already scopes this to
  // the coach's own sessions — no need to re-filter by coach_id here (a
  // two-level-deep nested-embed filter proved unreliable).
  const { data, error } = await sb
    .from("sessions")
    .select(SESSION_SELECT)
    .order("scheduled_date");
  if (error) throw error;
  return (data ?? []).map(mapSession);
}

export function useCoachSessions(): Session[] {
  return useLiveQuery(fetchCoachSessions, []);
}

/** the logged-in (or demo-selected) student's sessions */
export async function fetchMySessions(): Promise<Session[]> {
  if (demoMode())
    return demoSessions().filter((s) => s.student_id === demoStudentId());
  const sb = createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return [];
  const { data, error } = await sb
    .from("sessions")
    .select(SESSION_SELECT)
    .eq("student_id", user.id)
    .order("scheduled_date");
  if (error) throw error;
  return (data ?? []).map(mapSession);
}

export function useMySessions(): Session[] {
  return useLiveQuery(fetchMySessions, []);
}

/** programs the student is enrolled in (direct or via group) */
export async function fetchMyPrograms(): Promise<Program[]> {
  if (demoMode()) {
    const sid = demoStudentId();
    return demoPrograms().filter(
      (p) =>
        p.student_id === sid ||
        (p.group_id && DEMO_GROUP_MEMBERS[p.group_id]?.includes(sid))
    );
  }
  const sb = createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return [];

  const { data: memberships } = await sb
    .from("group_members")
    .select("group_id");
  const groupIds = (memberships ?? []).map((m) => m.group_id);

  let query = sb
    .from("programs")
    .select("*, program_days(*, program_exercises(*))");
  query = groupIds.length
    ? query.or(`student_id.eq.${user.id},group_id.in.(${groupIds.join(",")})`)
    : query.eq("student_id", user.id);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(mapProgram);
}

export function useMyPrograms(): Program[] {
  return useLiveQuery(fetchMyPrograms, []);
}

/** sessions programmates chose to share (excluding my own) */
export async function fetchSharedSessions(): Promise<Session[]> {
  if (demoMode()) {
    const sid = demoStudentId();
    return demoSessions().filter(
      (s) => s.shared && s.student_id !== sid && demoIsProgramMate(sid, s)
    );
  }
  const sb = createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return [];
  // RLS "read shared sessions" already scopes this to programmates
  const { data, error } = await sb
    .from("sessions")
    .select(SESSION_SELECT)
    .eq("shared", true)
    .neq("student_id", user.id)
    .order("scheduled_date", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapSession);
}

export function useSharedSessions(): Session[] {
  return useLiveQuery(fetchSharedSessions, []);
}

/* ---- session mutations (student) ---- */

export async function submitReview(
  sessionId: string,
  review: Pick<SessionReview, "difficulty" | "adapted" | "comment">
): Promise<void> {
  if (demoMode()) {
    demoMutateSession(sessionId, (s) => ({
      ...s,
      status: "completed",
      review: {
        id: `rev-${sessionId}`,
        session_id: sessionId,
        student_id: s.student_id,
        created_at: new Date().toISOString(),
        ...review,
      },
    }));
    return;
  }
  const sb = createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return;
  await sb
    .from("sessions")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("id", sessionId);
  const { error } = await sb.from("session_reviews").insert({
    session_id: sessionId,
    student_id: user.id,
    ...review,
  });
  if (error) throw error;
  notify();
}

export async function completeSession(sessionId: string): Promise<void> {
  if (demoMode()) {
    demoMutateSession(sessionId, (s) => ({ ...s, status: "completed" }));
    return;
  }
  const sb = createClient();
  await sb
    .from("sessions")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("id", sessionId);
  notify();
}

export async function toggleShare(
  sessionId: string,
  shared: boolean
): Promise<void> {
  if (demoMode()) {
    demoMutateSession(sessionId, (s) => ({ ...s, shared }));
    return;
  }
  const sb = createClient();
  await sb.from("sessions").update({ shared }).eq("id", sessionId);
  notify();
}

/* ---- session mutations (coach) ---- */

export async function rescheduleSession(
  sessionId: string,
  date: string
): Promise<{ error?: string }> {
  if (demoMode()) {
    const session = demoSessions().find((s) => s.id === sessionId);
    if (!session) return { error: "Session not found." };
    const conflict = demoSessions().some(
      (s) =>
        s.id !== sessionId &&
        s.program_day_id === session.program_day_id &&
        s.student_id === session.student_id &&
        s.scheduled_date === date
    );
    if (conflict)
      return { error: "This student already has a session that day." };
    demoMutateSession(sessionId, (s) => ({ ...s, scheduled_date: date }));
    return {};
  }
  const sb = createClient();
  const { error } = await sb
    .from("sessions")
    .update({ scheduled_date: date })
    .eq("id", sessionId);
  if (error) {
    if (error.code === "23505")
      return { error: "This student already has a session that day." };
    return { error: error.message };
  }
  notify();
  return {};
}

/** replaces a single session's exercise snapshot — the program day itself is untouched */
export async function updateSessionExercises(
  sessionId: string,
  exercises: Pick<
    SessionExercise,
    | "exercise_ref"
    | "exercise_name"
    | "sets"
    | "reps"
    | "load"
    | "rest_seconds"
    | "notes"
  >[]
): Promise<void> {
  if (demoMode()) {
    demoMutateSession(sessionId, (s) => ({
      ...s,
      exercises: exercises.map((e, i) => ({
        id: `${sessionId}-e${i}`,
        session_id: sessionId,
        position: i,
        ...e,
      })),
    }));
    return;
  }
  const sb = createClient();
  await sb.from("session_exercises").delete().eq("session_id", sessionId);
  if (exercises.length) {
    const { error } = await sb
      .from("session_exercises")
      .insert(exercises.map((e, i) => ({ session_id: sessionId, position: i, ...e })));
    if (error) throw error;
  }
  notify();
}
