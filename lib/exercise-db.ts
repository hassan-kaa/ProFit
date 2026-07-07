/**
 * Exercise data adapter.
 *
 * Default source: free-exercise-db (public domain, no API key, ~870 exercises)
 *   https://github.com/yuhonas/free-exercise-db
 * Each exercise ships two photos (start/end position) which we cross-fade
 * to get a simple 2-frame animation.
 *
 * Swap-in later: ExerciseDB (https://exercisedb.dev) for real GIFs — only
 * this file needs to change, the rest of the app consumes `ExerciseInfo`.
 */

export interface ExerciseInfo {
  id: string;
  name: string;
  level: "beginner" | "intermediate" | "expert" | string;
  equipment: string | null;
  category: string;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  instructions: string[];
  /** ordered animation frames (absolute URLs) */
  frames: string[];
}

const DATA_URL =
  "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json";
const IMAGE_BASE =
  "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/";

type RawExercise = {
  id: string;
  name: string;
  level: string;
  equipment: string | null;
  category: string;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  instructions: string[];
  images: string[];
};

let cache: ExerciseInfo[] | null = null;
let inflight: Promise<ExerciseInfo[]> | null = null;

export async function loadExercises(): Promise<ExerciseInfo[]> {
  if (cache) return cache;
  if (!inflight) {
    inflight = fetch(DATA_URL)
      .then((r) => {
        if (!r.ok) throw new Error(`exercise db fetch failed: ${r.status}`);
        return r.json() as Promise<RawExercise[]>;
      })
      .then((raw) => {
        cache = raw.map((e) => ({
          id: e.id,
          name: e.name,
          level: e.level,
          equipment: e.equipment,
          category: e.category,
          primaryMuscles: e.primaryMuscles ?? [],
          secondaryMuscles: e.secondaryMuscles ?? [],
          instructions: e.instructions ?? [],
          frames: (e.images ?? []).map((img) => IMAGE_BASE + img),
        }));
        return cache;
      })
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

export function searchExercises(
  all: ExerciseInfo[],
  opts: { query?: string; muscle?: string; equipment?: string; level?: string }
): ExerciseInfo[] {
  const q = opts.query?.trim().toLowerCase();
  return all.filter((e) => {
    if (q && !e.name.toLowerCase().includes(q)) return false;
    if (opts.muscle && !e.primaryMuscles.includes(opts.muscle)) return false;
    if (opts.equipment && e.equipment !== opts.equipment) return false;
    if (opts.level && e.level !== opts.level) return false;
    return true;
  });
}

export const MUSCLE_GROUPS = [
  "abdominals",
  "biceps",
  "calves",
  "chest",
  "forearms",
  "glutes",
  "hamstrings",
  "lats",
  "lower back",
  "middle back",
  "quadriceps",
  "shoulders",
  "triceps",
];
