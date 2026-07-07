"use client";

import { useEffect, useMemo, useState } from "react";
import {
  loadExercises,
  searchExercises,
  MUSCLE_GROUPS,
  type ExerciseInfo,
} from "@/lib/exercise-db";
import ExerciseAnimation from "./ExerciseAnimation";
import { Button, Input, Badge } from "./ui";

export default function ExercisePickerModal({
  onPick,
  onClose,
}: {
  onPick: (e: ExerciseInfo) => void;
  onClose: () => void;
}) {
  const [all, setAll] = useState<ExerciseInfo[] | null>(null);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState("");
  const [muscle, setMuscle] = useState("");

  useEffect(() => {
    loadExercises().then(setAll).catch(() => setError(true));
  }, []);

  const results = useMemo(() => {
    if (!all) return [];
    return searchExercises(all, { query, muscle: muscle || undefined }).slice(0, 30);
  }, [all, query, muscle]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[80vh] w-full max-w-2xl flex-col rounded-xl border border-border bg-surface"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-border p-4">
          <Input
            autoFocus
            placeholder="Search exercises…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <select
            value={muscle}
            onChange={(e) => setMuscle(e.target.value)}
            className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm"
          >
            <option value="">All muscles</option>
            {MUSCLE_GROUPS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <Button variant="ghost" onClick={onClose}>
            ✕
          </Button>
        </div>

        <div className="grid flex-1 grid-cols-2 gap-3 overflow-y-auto p-4 sm:grid-cols-3">
          {error && (
            <p className="col-span-full text-sm text-danger">
              Could not load the exercise database. Check your connection.
            </p>
          )}
          {!all && !error && (
            <p className="col-span-full text-sm text-text-dim">
              Loading exercise library…
            </p>
          )}
          {results.map((e) => (
            <button
              key={e.id}
              onClick={() => onPick(e)}
              className="group overflow-hidden rounded-lg border border-border bg-surface-2 text-left transition-colors hover:border-primary/60"
            >
              <ExerciseAnimation frames={e.frames} alt={e.name} className="h-28 w-full" />
              <div className="p-2">
                <p className="line-clamp-2 text-xs font-medium">{e.name}</p>
                <div className="mt-1">
                  <Badge color="primary">{e.primaryMuscles[0] ?? e.category}</Badge>
                </div>
              </div>
            </button>
          ))}
          {all && results.length === 0 && (
            <p className="col-span-full text-sm text-text-dim">No matches.</p>
          )}
        </div>
      </div>
    </div>
  );
}
