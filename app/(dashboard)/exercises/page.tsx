"use client";

import { useEffect, useMemo, useState } from "react";
import {
  loadExercises,
  searchExercises,
  MUSCLE_GROUPS,
  type ExerciseInfo,
} from "@/lib/exercise-db";
import ExerciseAnimation from "@/components/ExerciseAnimation";
import { Badge, Input, PageHeader, Card } from "@/components/ui";

const LEVELS = ["beginner", "intermediate", "expert"];

export default function ExercisesPage() {
  const [all, setAll] = useState<ExerciseInfo[] | null>(null);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState("");
  const [muscle, setMuscle] = useState("");
  const [level, setLevel] = useState("");
  const [selected, setSelected] = useState<ExerciseInfo | null>(null);

  useEffect(() => {
    loadExercises().then(setAll).catch(() => setError(true));
  }, []);

  const results = useMemo(() => {
    if (!all) return [];
    return searchExercises(all, {
      query,
      muscle: muscle || undefined,
      level: level || undefined,
    }).slice(0, 60);
  }, [all, query, muscle, level]);

  return (
    <>
      <PageHeader
        title="Exercise Library"
        subtitle={
          all
            ? `${all.length} exercises with animated form guides (free-exercise-db)`
            : "Loading library…"
        }
      />

      <div className="mb-5 flex flex-wrap gap-2">
        <Input
          placeholder="Search exercises…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="max-w-xs"
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
        <select
          value={level}
          onChange={(e) => setLevel(e.target.value)}
          className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm"
        >
          <option value="">All levels</option>
          {LEVELS.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <Card>
          <p className="text-sm text-danger">
            Could not load the exercise database (network required on first
            load).
          </p>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        {results.map((e) => (
          <button
            key={e.id}
            onClick={() => setSelected(e)}
            className="group overflow-hidden rounded-xl border border-border bg-surface text-left transition-colors hover:border-primary/60"
          >
            <ExerciseAnimation frames={e.frames} alt={e.name} className="h-36 w-full" />
            <div className="p-3">
              <p className="line-clamp-2 text-sm font-medium">{e.name}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                <Badge color="primary">{e.primaryMuscles[0] ?? e.category}</Badge>
                {e.equipment && <Badge>{e.equipment}</Badge>}
              </div>
            </div>
          </button>
        ))}
      </div>

      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-xl border border-border bg-surface p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <h2 className="text-lg font-bold">{selected.name}</h2>
              <button
                onClick={() => setSelected(null)}
                className="cursor-pointer text-text-dim hover:text-text"
              >
                ✕
              </button>
            </div>
            <ExerciseAnimation
              frames={selected.frames}
              alt={selected.name}
              className="h-64 w-full rounded-lg"
            />
            <div className="mt-3 flex flex-wrap gap-1.5">
              {selected.primaryMuscles.map((m) => (
                <Badge key={m} color="primary">
                  {m}
                </Badge>
              ))}
              {selected.secondaryMuscles.map((m) => (
                <Badge key={m}>{m}</Badge>
              ))}
              {selected.equipment && (
                <Badge color="load">{selected.equipment}</Badge>
              )}
              <Badge color="info">{selected.level}</Badge>
            </div>
            <ol className="mt-4 list-decimal space-y-1.5 pl-5 text-sm text-text-dim">
              {selected.instructions.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </>
  );
}
