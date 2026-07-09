/**
 * Demo data — used automatically while Supabase env vars are not set,
 * so the whole coach UI is explorable out of the box.
 */
import type { Group, Program, Session, SessionExercise } from "./types";

export const DEMO_COACH = {
  id: "demo-coach",
  full_name: "Coach Kaa",
  role: "coach" as const,
};

export const DEMO_STUDENTS = [
  { id: "s1", full_name: "Amine B.", role: "student" as const },
  { id: "s2", full_name: "Yassine T.", role: "student" as const },
  { id: "s3", full_name: "Sara M.", role: "student" as const },
  { id: "s4", full_name: "Omar K.", role: "student" as const },
];

export const DEMO_TODAY = "2026-07-07";

/** group_id → student ids (mirrors group_members table) */
export const DEMO_GROUP_MEMBERS: Record<string, string[]> = {
  g1: ["s2", "s3", "s4"],
  g2: ["s3", "s4"],
};

export const DEMO_GROUPS: Group[] = [
  {
    id: "g1",
    coach_id: DEMO_COACH.id,
    name: "Morning Strength Crew",
    description: "Intermediate group, 3x/week strength focus",
    member_count: 3,
  },
  {
    id: "g2",
    coach_id: DEMO_COACH.id,
    name: "Beginners Conditioning",
    description: "New students, general conditioning",
    member_count: 2,
  },
];

const ex = (
  dayId: string,
  position: number,
  name: string,
  ref: string | null,
  sets: number,
  reps: string,
  load: string | null,
  rest: number
) => ({
  id: `${dayId}-e${position}`,
  program_day_id: dayId,
  position,
  exercise_ref: ref,
  exercise_name: name,
  sets,
  reps,
  load,
  rest_seconds: rest,
  notes: null,
});

export const DEMO_PROGRAMS: Program[] = [
  {
    id: "p1",
    coach_id: DEMO_COACH.id,
    title: "Hypertrophy Block — Amine",
    description: "4-day upper/lower split, week 2 of 6",
    scope: "individual",
    group_id: null,
    student_id: "s1",
    cadence: "weekly",
    start_date: "2026-06-29",
    is_active: true,
    days: [
      {
        id: "p1d0",
        program_id: "p1",
        day_index: 0,
        title: "Upper — Push",
        notes: "Focus on controlled eccentrics",
        is_rest: false,
        exercises: [
          ex("p1d0", 0, "Barbell Bench Press - Medium Grip", "EIeI8Vf", 4, "8-10", "70kg", 120),
          ex("p1d0", 1, "Incline Dumbbell Press", "ns0SIbU", 3, "10-12", "24kg", 90),
          ex("p1d0", 2, "Side Lateral Raise", "DsgkuIt", 3, "12-15", "10kg", 60),
          ex("p1d0", 3, "Triceps Pushdown", "gAwDzB3", 3, "12", "35kg", 60),
        ],
      },
      {
        id: "p1d1",
        program_id: "p1",
        day_index: 1,
        title: "Lower — Squat",
        notes: null,
        is_rest: false,
        exercises: [
          ex("p1d1", 0, "Barbell Squat", "qXTaZnJ", 4, "6-8", "100kg", 180),
          ex("p1d1", 1, "Romanian Deadlift", "wQ2c4XD", 3, "8-10", "80kg", 120),
          ex("p1d1", 2, "Standing Calf Raises", "8ozhUIZ", 4, "15", "BW+20kg", 60),
        ],
      },
      { id: "p1d2", program_id: "p1", day_index: 2, title: "Rest", notes: null, is_rest: true, exercises: [] },
      {
        id: "p1d3",
        program_id: "p1",
        day_index: 3,
        title: "Upper — Pull",
        notes: null,
        is_rest: false,
        exercises: [
          ex("p1d3", 0, "Pullups", "lBDjFxJ", 4, "AMRAP", "BW", 120),
          ex("p1d3", 1, "Bent Over Barbell Row", "eZyBC3j", 4, "8-10", "60kg", 120),
          ex("p1d3", 2, "Barbell Curl", "25GPyDY", 3, "10-12", "30kg", 60),
        ],
      },
      {
        id: "p1d4",
        program_id: "p1",
        day_index: 4,
        title: "Lower — Hinge",
        notes: null,
        is_rest: false,
        exercises: [
          ex("p1d4", 0, "Barbell Deadlift", "ila4NZS", 3, "5", "120kg", 240),
          ex("p1d4", 1, "Barbell Lunge", "t8iSghb", 3, "10/leg", "40kg", 90),
        ],
      },
      { id: "p1d5", program_id: "p1", day_index: 5, title: "Rest", notes: null, is_rest: true, exercises: [] },
      { id: "p1d6", program_id: "p1", day_index: 6, title: "Rest", notes: null, is_rest: true, exercises: [] },
    ],
  },
  {
    id: "p2",
    coach_id: DEMO_COACH.id,
    title: "Group — Morning Strength Crew",
    description: "Shared 3-day full body program",
    scope: "group",
    group_id: "g1",
    student_id: null,
    cadence: "weekly",
    start_date: "2026-07-06",
    is_active: true,
    days: [
      {
        id: "p2d0",
        program_id: "p2",
        day_index: 0,
        title: "Full Body A",
        notes: null,
        is_rest: false,
        exercises: [
          ex("p2d0", 0, "Barbell Squat", "qXTaZnJ", 3, "8", "scaled/level", 150),
          ex("p2d0", 1, "Pushups", "I4hDWkc", 3, "12-20", "BW", 60),
          ex("p2d0", 2, "Plank", "CosupLu", 3, "45s", "BW", 45),
        ],
      },
      { id: "p2d1", program_id: "p2", day_index: 1, title: "Rest", notes: null, is_rest: true, exercises: [] },
      {
        id: "p2d2",
        program_id: "p2",
        day_index: 2,
        title: "Full Body B",
        notes: null,
        is_rest: false,
        exercises: [
          ex("p2d2", 0, "Barbell Deadlift", "ila4NZS", 3, "6", "scaled/level", 180),
          ex("p2d2", 1, "Pullups", "lBDjFxJ", 3, "AMRAP", "BW", 90),
        ],
      },
      { id: "p2d3", program_id: "p2", day_index: 3, title: "Rest", notes: null, is_rest: true, exercises: [] },
      {
        id: "p2d4",
        program_id: "p2",
        day_index: 4,
        title: "Full Body C",
        notes: null,
        is_rest: false,
        exercises: [
          ex("p2d4", 0, "Dumbbell Bench Press", "SpYC0Kp", 3, "10", "scaled/level", 90),
          ex("p2d4", 1, "Bent Over Barbell Row", "eZyBC3j", 3, "10", "scaled/level", 90),
        ],
      },
      { id: "p2d5", program_id: "p2", day_index: 5, title: "Rest", notes: null, is_rest: true, exercises: [] },
      { id: "p2d6", program_id: "p2", day_index: 6, title: "Rest", notes: null, is_rest: true, exercises: [] },
    ],
  },
  {
    id: "p3",
    coach_id: DEMO_COACH.id,
    title: "My Own Training",
    description: "Coach self-programming — strength maintenance",
    scope: "self",
    group_id: null,
    student_id: null,
    cadence: "weekly",
    start_date: "2026-07-06",
    is_active: true,
    days: [
      {
        id: "p3d0",
        program_id: "p3",
        day_index: 0,
        title: "Heavy Day",
        notes: null,
        is_rest: false,
        exercises: [
          ex("p3d0", 0, "Barbell Squat", "qXTaZnJ", 5, "5", "140kg", 240),
          ex("p3d0", 1, "Barbell Bench Press - Medium Grip", "EIeI8Vf", 5, "5", "100kg", 240),
        ],
      },
      { id: "p3d1", program_id: "p3", day_index: 1, title: "Rest", notes: null, is_rest: true, exercises: [] },
      { id: "p3d2", program_id: "p3", day_index: 2, title: "Rest", notes: null, is_rest: true, exercises: [] },
      { id: "p3d3", program_id: "p3", day_index: 3, title: "Rest", notes: null, is_rest: true, exercises: [] },
      { id: "p3d4", program_id: "p3", day_index: 4, title: "Rest", notes: null, is_rest: true, exercises: [] },
      { id: "p3d5", program_id: "p3", day_index: 5, title: "Rest", notes: null, is_rest: true, exercises: [] },
      { id: "p3d6", program_id: "p3", day_index: 6, title: "Rest", notes: null, is_rest: true, exercises: [] },
    ],
  },
];

/** session exercise snapshot — taken once at session-generation time */
const sx = (
  sessionId: string,
  position: number,
  name: string,
  ref: string | null,
  sets: number,
  reps: string,
  load: string | null,
  rest: number
): SessionExercise => ({
  id: `${sessionId}-e${position}`,
  session_id: sessionId,
  position,
  exercise_ref: ref,
  exercise_name: name,
  sets,
  reps,
  load,
  rest_seconds: rest,
  notes: null,
});

export const DEMO_SESSIONS: Session[] = [
  {
    id: "sess1",
    program_day_id: "p1d0",
    student_id: "s1",
    scheduled_date: "2026-07-06",
    status: "completed",
    shared: true,
    student_name: "Amine B.",
    day_title: "Upper — Push",
    program_title: "Hypertrophy Block — Amine",
    exercises: [
      sx("sess1", 0, "Barbell Bench Press - Medium Grip", "EIeI8Vf", 4, "8-10", "70kg", 120),
      sx("sess1", 1, "Incline Dumbbell Press", "ns0SIbU", 3, "10-12", "24kg", 90),
      sx("sess1", 2, "Side Lateral Raise", "DsgkuIt", 3, "12-15", "10kg", 60),
      sx("sess1", 3, "Triceps Pushdown", "gAwDzB3", 3, "12", "35kg", 60),
    ],
    review: {
      id: "r1",
      session_id: "sess1",
      student_id: "s1",
      difficulty: 4,
      adapted: true,
      comment: "Last set of bench was a grinder, rest felt right.",
      created_at: "2026-07-06T19:20:00Z",
    },
  },
  {
    id: "sess2",
    program_day_id: "p2d0",
    student_id: "s2",
    scheduled_date: "2026-07-06",
    status: "completed",
    shared: false,
    student_name: "Yassine T.",
    day_title: "Full Body A",
    program_title: "Group — Morning Strength Crew",
    exercises: [
      sx("sess2", 0, "Barbell Squat", "qXTaZnJ", 3, "8", "scaled/level", 150),
      sx("sess2", 1, "Pushups", "I4hDWkc", 3, "12-20", "BW", 60),
      sx("sess2", 2, "Plank", "CosupLu", 3, "45s", "BW", 45),
    ],
    review: {
      id: "r2",
      session_id: "sess2",
      student_id: "s2",
      difficulty: 2,
      adapted: false,
      comment: "Could have gone heavier on squats.",
      created_at: "2026-07-06T10:05:00Z",
    },
  },
  {
    id: "sess3",
    program_day_id: "p2d0",
    student_id: "s3",
    scheduled_date: "2026-07-06",
    status: "completed",
    shared: true,
    student_name: "Sara M.",
    day_title: "Full Body A",
    program_title: "Group — Morning Strength Crew",
    exercises: [
      sx("sess3", 0, "Barbell Squat", "qXTaZnJ", 3, "8", "scaled/level", 150),
      sx("sess3", 1, "Pushups", "I4hDWkc", 3, "12-20", "BW", 60),
      sx("sess3", 2, "Plank", "CosupLu", 3, "45s", "BW", 45),
    ],
    review: {
      id: "r3",
      session_id: "sess3",
      student_id: "s3",
      difficulty: 3,
      adapted: true,
      comment: "Perfect pacing today.",
      created_at: "2026-07-06T10:30:00Z",
    },
  },
  {
    id: "sess4",
    program_day_id: "p1d1",
    student_id: "s1",
    scheduled_date: "2026-07-07",
    status: "scheduled",
    shared: false,
    student_name: "Amine B.",
    day_title: "Lower — Squat",
    program_title: "Hypertrophy Block — Amine",
    exercises: [
      sx("sess4", 0, "Barbell Squat", "qXTaZnJ", 4, "6-8", "100kg", 180),
      sx("sess4", 1, "Romanian Deadlift", "wQ2c4XD", 3, "8-10", "80kg", 120),
      sx("sess4", 2, "Standing Calf Raises", "8ozhUIZ", 4, "15", "BW+20kg", 60),
    ],
    review: null,
  },
  {
    id: "sess5",
    program_day_id: "p2d2",
    student_id: "s4",
    scheduled_date: "2026-07-08",
    status: "scheduled",
    shared: false,
    student_name: "Omar K.",
    day_title: "Full Body B",
    program_title: "Group — Morning Strength Crew",
    exercises: [
      sx("sess5", 0, "Barbell Deadlift", "ila4NZS", 3, "6", "scaled/level", 180),
      sx("sess5", 1, "Pullups", "lBDjFxJ", 3, "AMRAP", "BW", 90),
    ],
    review: null,
  },
];
