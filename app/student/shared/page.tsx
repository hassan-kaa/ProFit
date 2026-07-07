"use client";

import { useSharedSessions } from "@/lib/data";
import { DIFFICULTY_LABELS } from "@/lib/types";
import { Badge, Card } from "@/components/ui";

/** Feed of sessions that programmates chose to share. */
export default function SharedSessionsPage() {
  const shared = useSharedSessions();

  return (
    <div>
      <h1 className="mb-1 text-xl font-bold">Shared sessions</h1>
      <p className="mb-4 text-sm text-text-dim">
        Workouts your training partners chose to share.
      </p>

      {shared.length === 0 && (
        <Card>
          <p className="text-sm text-text-dim">
            Nothing shared yet. Sessions your programmates share will show up
            here.
          </p>
        </Card>
      )}

      <div className="space-y-3">
        {shared.map((s) => {
          const exercises = s.exercises ?? [];
          return (
            <Card key={s.id}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-2 text-sm font-bold text-info">
                    {s.student_name?.[0]}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{s.student_name}</p>
                    <p className="text-xs text-text-dim">
                      {s.day_title} · {s.scheduled_date}
                    </p>
                  </div>
                </div>
                <Badge color={s.status === "completed" ? "primary" : "info"}>
                  {s.status}
                </Badge>
              </div>

              {exercises.length > 0 && (
                <ul className="mt-3 space-y-1 border-t border-border pt-3">
                  {exercises.map((ex) => (
                    <li
                      key={ex.id}
                      className="flex justify-between text-xs text-text-dim"
                    >
                      <span className="truncate">{ex.exercise_name}</span>
                      <span className="shrink-0 text-text-faint">
                        {ex.sets ?? "?"}×{ex.reps ?? "?"}
                        {ex.load && (
                          <span className="ml-1 text-load">@ {ex.load}</span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              {s.review && (
                <div className="mt-3 border-t border-border pt-3">
                  <Badge
                    color={
                      s.review.difficulty >= 4
                        ? "danger"
                        : s.review.difficulty <= 2
                          ? "info"
                          : "primary"
                    }
                  >
                    {DIFFICULTY_LABELS[s.review.difficulty]}
                  </Badge>
                  {s.review.comment && (
                    <p className="mt-1.5 text-xs text-text-dim">
                      “{s.review.comment}”
                    </p>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
