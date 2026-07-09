/**
 * Exercise data adapter.
 *
 * Source: ExerciseDB OSS (bootstrapping-lab/exercisedb-api, AGPL-3.0,
 * self-hosted dataset — no API key, no rate limit), ~1,500 exercises with
 * real animated GIFs (not just start/end photos).
 *   https://github.com/bootstrapping-lab/exercisedb-api
 * GIFs are committed as static files in that repo's `/media` folder, so we
 * hotlink them from raw.githubusercontent.com the same way the previous
 * source (free-exercise-db) was hotlinked. Non-commercial use — fine for
 * ProFit today; revisit if this ever goes commercial.
 *
 * `trainingType` (mobility/strength/coordination/speed/agility/cardio) has
 * no equivalent field in the source data — it's produced by a one-time AI
 * classification pass (see scripts/classify-exercise-types.mjs) and merged
 * in from the static lib/exercise-training-types.json lookup.
 */

import trainingTypes from "./exercise-training-types.json";

export type TrainingType =
  | "mobility"
  | "strength"
  | "coordination"
  | "speed"
  | "agility"
  | "cardio";

export interface ExerciseInfo {
  id: string;
  name: string;
  bodyParts: string[];
  primaryMuscles: string[];
  secondaryMuscles: string[];
  equipment: string[];
  trainingType: TrainingType | null;
  instructions: string[];
  gifUrl: string;
}

const DATA_URL =
  "https://raw.githubusercontent.com/bootstrapping-lab/exercisedb-api/main/src/data/exercises.json";
const MEDIA_BASE =
  "https://raw.githubusercontent.com/bootstrapping-lab/exercisedb-api/main/media/";

type RawExercise = {
  exerciseId: string;
  name: string;
  bodyParts: string[];
  targetMuscles: string[];
  secondaryMuscles: string[];
  equipments: string[];
  instructions: string[];
};

const TYPE_LOOKUP = trainingTypes as Record<string, TrainingType>;

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
          id: e.exerciseId,
          name: e.name,
          bodyParts: e.bodyParts ?? [],
          primaryMuscles: e.targetMuscles ?? [],
          secondaryMuscles: e.secondaryMuscles ?? [],
          equipment: e.equipments ?? [],
          trainingType: TYPE_LOOKUP[e.exerciseId] ?? null,
          instructions: e.instructions ?? [],
          gifUrl: `${MEDIA_BASE}${e.exerciseId}.gif`,
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
  opts: {
    query?: string;
    bodyPart?: string;
    equipment?: string;
    trainingType?: string;
  }
): ExerciseInfo[] {
  const q = opts.query?.trim().toLowerCase();
  return all.filter((e) => {
    if (q && !e.name.toLowerCase().includes(q)) return false;
    if (opts.bodyPart && !e.bodyParts.includes(opts.bodyPart)) return false;
    if (opts.equipment && !e.equipment.includes(opts.equipment)) return false;
    if (opts.trainingType && e.trainingType !== opts.trainingType)
      return false;
    return true;
  });
}

export const BODY_PARTS = [
  "back",
  "cardio",
  "chest",
  "lower arms",
  "lower legs",
  "neck",
  "shoulders",
  "upper arms",
  "upper legs",
  "waist",
];

export const TRAINING_TYPES: TrainingType[] = [
  "mobility",
  "strength",
  "coordination",
  "speed",
  "agility",
  "cardio",
];
