"use client";

import { useState } from "react";
import type { Program, ProgramDay, ProgramExercise } from "@/lib/types";
import { DAY_LABELS } from "@/lib/types";
import type { ExerciseInfo } from "@/lib/exercise-db";
import ExercisePickerModal from "./ExercisePickerModal";
import ExerciseRow from "./ExerciseRow";
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
        <div className="grid min-h-0 flex-1 auto-rows-auto grid-cols-1 items-start gap-3 overflow-y-auto md:grid-cols-2 xl:grid-cols-7">
          {program.days
            .slice()
            .sort((a, b) => a.day_index - b.day_index)
            .map((day) => (
              <div
                key={day.id}
                className={`flex flex-col rounded-xl border p-3 ${
                  day.is_rest
                    ? "border-border/60 bg-surface/50"
                    : "border-border bg-surface"
                }`}
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-text-faint">
                    {DAY_LABELS[day.day_index] ?? `Day ${day.day_index + 1}`}
                  </span>
                  <div className="inline-flex rounded-lg border border-border p-0.5 text-[11px] font-medium">
                    <button
                      onClick={() => day.is_rest && toggleRest(day.id)}
                      className={`cursor-pointer rounded px-2 py-0.5 transition-colors ${
                        day.is_rest
                          ? "text-text-faint hover:text-text-dim"
                          : "bg-primary/15 text-primary"
                      }`}
                    >
                      Training
                    </button>
                    <button
                      onClick={() => !day.is_rest && toggleRest(day.id)}
                      className={`cursor-pointer rounded px-2 py-0.5 transition-colors ${
                        day.is_rest
                          ? "bg-surface-2 text-text"
                          : "text-text-faint hover:text-text-dim"
                      }`}
                    >
                      Rest
                    </button>
                  </div>
                </div>

                {day.is_rest ? (
                  <div className="py-10 text-center text-sm text-text-faint">
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
                    <div className="space-y-2">
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
