"use client";

import { useState } from "react";
import type { Program, ProgramDay, ProgramExercise } from "@/lib/types";
import { DAY_LABELS } from "@/lib/types";
import type { ExerciseInfo } from "@/lib/exercise-db";
import ExercisePickerModal from "./ExercisePickerModal";
import AiAssistPanel from "./AiAssistPanel";
import { Button, Badge } from "./ui";

/**
 * Weekly program builder — the heart of the coach experience.
 * Local state for the MVP; `onSave` receives the full program to persist
 * (Supabase upsert once configured).
 */
export default function ProgramBuilder({
  initial,
  onSave,
}: {
  initial: Program;
  onSave?: (p: Program) => Promise<void> | void;
}) {
  const [program, setProgram] = useState<Program>(initial);
  const [pickerDay, setPickerDay] = useState<string | null>(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  function update(fn: (p: Program) => Program) {
    setProgram(fn);
    setDirty(true);
  }

  function updateDay(dayId: string, fn: (d: ProgramDay) => ProgramDay) {
    update((p) => ({
      ...p,
      days: p.days.map((d) => (d.id === dayId ? fn(d) : d)),
    }));
  }

  function addExercise(dayId: string, e: ExerciseInfo) {
    updateDay(dayId, (d) => ({
      ...d,
      is_rest: false,
      exercises: [
        ...d.exercises,
        {
          id: `tmp-${crypto.randomUUID()}`,
          program_day_id: dayId,
          position: d.exercises.length,
          exercise_ref: e.id,
          exercise_name: e.name,
          sets: 3,
          reps: "10",
          load: null,
          rest_seconds: 90,
          notes: null,
        },
      ],
    }));
    setPickerDay(null);
  }

  function updateExercise(
    dayId: string,
    exId: string,
    patch: Partial<ProgramExercise>
  ) {
    updateDay(dayId, (d) => ({
      ...d,
      exercises: d.exercises.map((ex) =>
        ex.id === exId ? { ...ex, ...patch } : ex
      ),
    }));
  }

  function removeExercise(dayId: string, exId: string) {
    updateDay(dayId, (d) => ({
      ...d,
      exercises: d.exercises.filter((ex) => ex.id !== exId),
    }));
  }

  function toggleRest(dayId: string) {
    updateDay(dayId, (d) => ({ ...d, is_rest: !d.is_rest }));
  }

  async function save() {
    setSaving(true);
    try {
      await onSave?.(program);
      setDirty(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex h-full min-h-0">
      <div className="flex min-w-0 flex-1 flex-col">
        {/* toolbar */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <input
              value={program.title}
              onChange={(e) =>
                update((p) => ({ ...p, title: e.target.value }))
              }
              className="rounded-lg border border-transparent bg-transparent px-2 py-1 text-xl font-bold outline-none hover:border-border focus:border-primary/60"
            />
            <Badge
              color={
                program.scope === "group"
                  ? "info"
                  : program.scope === "self"
                    ? "load"
                    : "primary"
              }
            >
              {program.scope}
            </Badge>
          </div>
          <div className="flex gap-2">
            <Button variant="ai" onClick={() => setAiOpen((v) => !v)}>
              ✦ AI Assist
            </Button>
            <Button onClick={save} disabled={saving || !dirty}>
              {saving ? "Saving…" : dirty ? "Save" : "Saved"}
            </Button>
          </div>
        </div>

        {/* week grid */}
        <div className="grid min-h-0 flex-1 auto-rows-fr grid-cols-1 gap-3 overflow-y-auto md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
          {program.days
            .slice()
            .sort((a, b) => a.day_index - b.day_index)
            .map((day) => (
              <div
                key={day.id}
                className={`flex min-h-56 flex-col rounded-xl border p-3 ${
                  day.is_rest
                    ? "border-border/60 bg-surface/50"
                    : "border-border bg-surface"
                }`}
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-text-faint">
                    {DAY_LABELS[day.day_index] ?? `Day ${day.day_index + 1}`}
                  </span>
                  <button
                    onClick={() => toggleRest(day.id)}
                    className="cursor-pointer text-xs text-text-faint hover:text-text-dim"
                    title="Toggle rest day"
                  >
                    {day.is_rest ? "make training day" : "rest?"}
                  </button>
                </div>

                {day.is_rest ? (
                  <div className="flex flex-1 items-center justify-center text-sm text-text-faint">
                    Rest day
                  </div>
                ) : (
                  <>
                    <input
                      value={day.title ?? ""}
                      placeholder="Session title"
                      onChange={(e) =>
                        updateDay(day.id, (d) => ({
                          ...d,
                          title: e.target.value,
                        }))
                      }
                      className="mb-2 rounded-md border border-transparent bg-transparent px-1 py-0.5 text-sm font-semibold outline-none hover:border-border focus:border-primary/60"
                    />
                    <div className="flex-1 space-y-2">
                      {day.exercises.map((ex) => (
                        <ExerciseRow
                          key={ex.id}
                          ex={ex}
                          onChange={(patch) =>
                            updateExercise(day.id, ex.id, patch)
                          }
                          onRemove={() => removeExercise(day.id, ex.id)}
                        />
                      ))}
                    </div>
                    <button
                      onClick={() => setPickerDay(day.id)}
                      className="mt-2 w-full cursor-pointer rounded-lg border border-dashed border-border py-1.5 text-xs text-text-dim transition-colors hover:border-primary/50 hover:text-primary"
                    >
                      + Add exercise
                    </button>
                  </>
                )}
              </div>
            ))}
        </div>
      </div>

      {aiOpen && (
        <AiAssistPanel program={program} onClose={() => setAiOpen(false)} />
      )}

      {pickerDay && (
        <ExercisePickerModal
          onPick={(e) => addExercise(pickerDay, e)}
          onClose={() => setPickerDay(null)}
        />
      )}
    </div>
  );
}

function ExerciseRow({
  ex,
  onChange,
  onRemove,
}: {
  ex: ProgramExercise;
  onChange: (patch: Partial<ProgramExercise>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="group rounded-lg border border-border bg-surface-2 p-2">
      <div className="flex items-start justify-between gap-1">
        <p className="line-clamp-2 text-xs font-medium">{ex.exercise_name}</p>
        <button
          onClick={onRemove}
          className="cursor-pointer text-text-faint opacity-0 transition-opacity hover:text-danger group-hover:opacity-100"
        >
          ✕
        </button>
      </div>
      <div className="mt-1.5 grid grid-cols-3 gap-1.5">
        <label className="block">
          <span className="text-[10px] uppercase text-text-faint">sets</span>
          <input
            type="number"
            min={1}
            value={ex.sets ?? ""}
            onChange={(e) =>
              onChange({ sets: e.target.value ? Number(e.target.value) : null })
            }
            className="w-full rounded border border-border bg-bg px-1.5 py-1 text-xs outline-none focus:border-primary/60"
          />
        </label>
        <label className="block">
          <span className="text-[10px] uppercase text-text-faint">reps</span>
          <input
            value={ex.reps ?? ""}
            placeholder="8-12"
            onChange={(e) => onChange({ reps: e.target.value || null })}
            className="w-full rounded border border-border bg-bg px-1.5 py-1 text-xs outline-none focus:border-primary/60"
          />
        </label>
        <label className="block">
          <span className="text-[10px] uppercase text-load/80">load</span>
          <input
            value={ex.load ?? ""}
            placeholder="kg / %"
            onChange={(e) => onChange({ load: e.target.value || null })}
            className="w-full rounded border border-border bg-bg px-1.5 py-1 text-xs text-load outline-none focus:border-load/60"
          />
        </label>
      </div>
    </div>
  );
}
