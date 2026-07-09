"use client";

import { useState } from "react";
import type { Session, SessionExercise } from "@/lib/types";
import type { ExerciseInfo } from "@/lib/exercise-db";
import { rescheduleSession, updateSessionExercises } from "@/lib/data";
import ExercisePickerModal from "./ExercisePickerModal";
import ExerciseRow from "./ExerciseRow";
import { Button } from "./ui";

/**
 * Edits a single session occurrence — reschedule its date and/or swap its
 * exercises — without touching the underlying program day.
 */
export default function SessionEditModal({
  session,
  onClose,
}: {
  session: Session;
  onClose: () => void;
}) {
  const [date, setDate] = useState(session.scheduled_date);
  const [exercises, setExercises] = useState<SessionExercise[]>(
    session.exercises ?? []
  );
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addExercise(e: ExerciseInfo) {
    setExercises((prev) => [
      ...prev,
      {
        id: `tmp-${crypto.randomUUID()}`,
        session_id: session.id,
        position: prev.length,
        exercise_ref: e.id,
        exercise_name: e.name,
        sets: 3,
        reps: "10",
        load: null,
        rest_seconds: 90,
        notes: null,
      },
    ]);
    setPickerOpen(false);
  }

  function updateExercise(id: string, patch: Partial<SessionExercise>) {
    setExercises((prev) =>
      prev.map((ex) => (ex.id === id ? { ...ex, ...patch } : ex))
    );
  }

  function removeExercise(id: string) {
    setExercises((prev) => prev.filter((ex) => ex.id !== id));
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      if (date !== session.scheduled_date) {
        const res = await rescheduleSession(session.id, date);
        if (res.error) {
          setError(res.error);
          setSaving(false);
          return;
        }
      }
      await updateSessionExercises(session.id, exercises);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-xl border border-border bg-surface p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold">
          {session.day_title ?? "Session"}
        </h2>
        <p className="mt-1 text-sm text-text-dim">
          {session.student_name} — editing this occurrence only, the
          program day is unaffected.
        </p>

        <label className="mt-4 block">
          <span className="text-xs uppercase text-text-faint">Date</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-primary/60"
          />
        </label>

        <div className="mt-4 flex-1 space-y-2 overflow-y-auto">
          {exercises.map((ex) => (
            <ExerciseRow
              key={ex.id}
              ex={ex}
              onChange={(patch) => updateExercise(ex.id, patch)}
              onRemove={() => removeExercise(ex.id)}
            />
          ))}
          <button
            onClick={() => setPickerOpen(true)}
            className="w-full cursor-pointer rounded-lg border border-dashed border-border py-1.5 text-xs text-text-dim transition-colors hover:border-primary/50 hover:text-primary"
          >
            + Add exercise
          </button>
        </div>

        {error && <p className="mt-3 text-xs text-danger">{error}</p>}

        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>

      {pickerOpen && (
        <ExercisePickerModal onPick={addExercise} onClose={() => setPickerOpen(false)} />
      )}
    </div>
  );
}
