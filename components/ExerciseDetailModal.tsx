"use client";

import { useEffect, useState } from "react";
import { loadExercises, type ExerciseInfo } from "@/lib/exercise-db";
import ExerciseAnimation from "./ExerciseAnimation";
import { Badge } from "./ui";

/** Looks up an exercise by its external ref and shows animation + form cues. */
export default function ExerciseDetailModal({
  exerciseRef,
  fallbackName,
  onClose,
}: {
  exerciseRef: string | null;
  fallbackName: string;
  onClose: () => void;
}) {
  const [exercise, setExercise] = useState<ExerciseInfo | null | undefined>(
    undefined
  );

  useEffect(() => {
    if (!exerciseRef) {
      setExercise(null);
      return;
    }
    loadExercises()
      .then((all) => setExercise(all.find((e) => e.id === exerciseRef) ?? null))
      .catch(() => setExercise(null));
  }, [exerciseRef]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-xl border border-border bg-surface p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <h2 className="text-lg font-bold">
            {exercise?.name ?? fallbackName}
          </h2>
          <button
            onClick={onClose}
            className="cursor-pointer text-text-dim hover:text-text"
          >
            ✕
          </button>
        </div>

        {exercise === undefined && (
          <p className="text-sm text-text-dim">Loading…</p>
        )}
        {exercise === null && (
          <p className="text-sm text-text-dim">
            No form guide available for this exercise.
          </p>
        )}
        {exercise && (
          <>
            <ExerciseAnimation
              frames={exercise.frames}
              alt={exercise.name}
              className="h-64 w-full rounded-lg"
            />
            <div className="mt-3 flex flex-wrap gap-1.5">
              {exercise.primaryMuscles.map((m) => (
                <Badge key={m} color="primary">
                  {m}
                </Badge>
              ))}
              {exercise.equipment && (
                <Badge color="load">{exercise.equipment}</Badge>
              )}
              <Badge color="info">{exercise.level}</Badge>
            </div>
            <ol className="mt-4 list-decimal space-y-1.5 pl-5 text-sm text-text-dim">
              {exercise.instructions.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </>
        )}
      </div>
    </div>
  );
}
