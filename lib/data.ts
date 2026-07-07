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
  SessionReview,
} from "./types";

/* ================================================================== */
/* events & shared hook plumbing                                       */
/* ================================================================== */

const EVENT = "kamilfit-data";

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

const DEMO_STATE_KEY = "kamilfit-demo-v1";
const DEMO_STUDENT_KEY = "kamilfit-demo-student";

function demoSessions(): Session[] {
  try {
    const raw = localStorage.getItem(DEMO_STATE_KEY);
    if (raw) return (JSON.parse(raw) as { sessions: Session[] }).sessions;
  } catch {
    /* fall through */
  }
  return DEMO_SESSIONS;
}

function demoMutateSession(id: string, fn: (s: Session) => Session) {
  const sessions = demoSessions().map((s) => (s.id === id ? fn(s) : s));
  localStorage.setItem(DEMO_STATE_KEY, JSON.stringify({ sessions }));
  notify();
}

function demoStudentId(): string {
  if (typeof window === "undefined") return "s1";
  return localStorage.getItem(DEMO_STUDENT_KEY) ?? "s1";
}

function demoFindDay(dayId: string) {
  for (const program of DEMO_PROGRAMS) {
    const day = program.days.find((d) => d.id === dayId);
    if (day) return { program, day };
  }
  return null;
}

function demoAttachExercises(s: Session): Session {
  return { ...s, exercises: demoFindDay(s.program_day_id)?.day.exercises ?? [] };
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
    exercises: day?.program_exercises
      ? [...day.program_exercises].sort(
          (a: any, b: any) => a.position - b.position
        )
      : undefined,
    review: one<SessionReview>(row.session_reviews),
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

const SESSION_SELECT =
  "*, session_reviews(*), profiles(full_name), " +
  "program_days!inner(title, program_exercises(*), programs!inner(title, coach_id))";

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
  if (demoMode()) return DEMO_PROGRAMS;
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
  if (demoMode()) return DEMO_PROGRAMS.find((p) => p.id === id) ?? null;
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
  if (demoMode()) return null;
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
  if (demoMode()) return; // builder state stays local in demo
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
 * for the current week (idempotent thanks to the unique index).
 */
export async function assignProgramToStudent(
  programId: string,
  studentId: string
): Promise<{ created: number; error?: string }> {
  if (demoMode())
    return {
      created: 0,
      error: "Demo mode — connect Supabase to assign programs.",
    };
  const sb = createClient();

  const { error: linkErr } = await sb
    .from("programs")
    .update({ student_id: studentId, scope: "individual" })
    .eq("id", programId);
  if (linkErr) return { created: 0, error: linkErr.message };

  const { data: days } = await sb
    .from("program_days")
    .select("id, day_index, is_rest")
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

  const { error } = await sb
    .from("sessions")
    .upsert(rows, {
      onConflict: "program_day_id,student_id,scheduled_date",
      ignoreDuplicates: true,
    });
  if (error) return { created: 0, error: error.message };
  notify();
  return { created: rows.length };
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
  if (demoMode()) return demoSessions().map(demoAttachExercises);
  const sb = createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return [];
  const { data, error } = await sb
    .from("sessions")
    .select(SESSION_SELECT)
    .eq("program_days.programs.coach_id", user.id)
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
    return demoSessions()
      .filter((s) => s.student_id === demoStudentId())
      .map(demoAttachExercises);
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
    return DEMO_PROGRAMS.filter(
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
    return demoSessions()
      .filter(
        (s) => s.shared && s.student_id !== sid && demoIsProgramMate(sid, s)
      )
      .map(demoAttachExercises);
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
