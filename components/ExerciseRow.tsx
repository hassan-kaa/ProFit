"use client";

/**
 * Inline sets/reps/load editor for one exercise occurrence — shared between
 * the program builder (ProgramExercise) and the session edit modal
 * (SessionExercise); both share this field shape structurally.
 */
export interface EditableExercise {
  id: string;
  exercise_name: string;
  sets: number | null;
  reps: string | null;
  load: string | null;
}

export default function ExerciseRow<T extends EditableExercise>({
  ex,
  onChange,
  onRemove,
}: {
  ex: T;
  onChange: (patch: Partial<Pick<T, "sets" | "reps" | "load">>) => void;
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
              onChange({
                sets: e.target.value ? Number(e.target.value) : null,
              } as Partial<Pick<T, "sets" | "reps" | "load">>)
            }
            className="w-full rounded border border-border bg-bg px-1.5 py-1 text-xs outline-none focus:border-primary/60"
          />
        </label>
        <label className="block">
          <span className="text-[10px] uppercase text-text-faint">reps</span>
          <input
            value={ex.reps ?? ""}
            placeholder="8-12"
            onChange={(e) =>
              onChange({ reps: e.target.value || null } as Partial<
                Pick<T, "sets" | "reps" | "load">
              >)
            }
            className="w-full rounded border border-border bg-bg px-1.5 py-1 text-xs outline-none focus:border-primary/60"
          />
        </label>
        <label className="block">
          <span className="text-[10px] uppercase text-load/80">load</span>
          <input
            value={ex.load ?? ""}
            placeholder="kg / %"
            onChange={(e) =>
              onChange({ load: e.target.value || null } as Partial<
                Pick<T, "sets" | "reps" | "load">
              >)
            }
            className="w-full rounded border border-border bg-bg px-1.5 py-1 text-xs text-load outline-none focus:border-load/60"
          />
        </label>
      </div>
    </div>
  );
}
