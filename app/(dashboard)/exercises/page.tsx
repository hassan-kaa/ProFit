"use client";

import { useEffect, useMemo, useState } from "react";
import {
  loadExercises,
  searchExercises,
  BODY_PARTS,
  TRAINING_TYPES,
  type ExerciseInfo,
} from "@/lib/exercise-db";
import ExerciseAnimation from "@/components/ExerciseAnimation";
import { Badge, Input, PageHeader, Card } from "@/components/ui";

export default function ExercisesPage() {
  const [all, setAll] = useState<ExerciseInfo[] | null>(null);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState("");
  const [bodyPart, setBodyPart] = useState("");
  const [trainingType, setTrainingType] = useState("");
  const [selected, setSelected] = useState<ExerciseInfo | null>(null);

  useEffect(() => {
    loadExercises().then(setAll).catch(() => setError(true));
  }, []);

  const results = useMemo(() => {
    if (!all) return [];
    return searchExercises(all, {
      query,
      bodyPart: bodyPart || undefined,
      trainingType: trainingType || undefined,
    }).slice(0, 60);
  }, [all, query, bodyPart, trainingType]);

  return (
    <>
      <PageHeader
        title="Exercise Library"
        subtitle={
          all
            ? `${all.length} exercises with animated form guides (ExerciseDB)`
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
          value={bodyPart}
          onChange={(e) => setBodyPart(e.target.value)}
          className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm"
        >
          <option value="">All body parts</option>
          {BODY_PARTS.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
        <select
          value={trainingType}
          onChange={(e) => setTrainingType(e.target.value)}
          className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm"
        >
          <option value="">All types</option>
          {TRAINING_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
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
            <ExerciseAnimation gifUrl={e.gifUrl} alt={e.name} className="h-36 w-full" />
            <div className="p-3">
              <p className="line-clamp-2 text-sm font-medium">{e.name}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                <Badge color="primary">
                  {e.primaryMuscles[0] ?? e.trainingType ?? "exercise"}
                </Badge>
                {e.equipment[0] && <Badge>{e.equipment[0]}</Badge>}
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
                className="-m-1.5 cursor-pointer p-1.5 text-text-dim hover:text-text"
              >
                ✕
              </button>
            </div>
            <ExerciseAnimation
              gifUrl={selected.gifUrl}
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
              {selected.equipment.map((eq) => (
                <Badge key={eq} color="load">
                  {eq}
                </Badge>
              ))}
              {selected.trainingType && (
                <Badge color="info">{selected.trainingType}</Badge>
              )}
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
