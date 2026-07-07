"use client";

import { useState } from "react";
import { useMyPrograms } from "@/lib/data";
import { DAY_LABELS } from "@/lib/types";
import ExerciseDetailModal from "@/components/ExerciseDetailModal";
import { Badge, Card } from "@/components/ui";

/** Read-only week view of the programs the student is enrolled in. */
export default function StudentProgramPage() {
  const programs = useMyPrograms();
  const [detail, setDetail] = useState<{
    ref: string | null;
    name: string;
  } | null>(null);

  if (programs.length === 0) {
    return (
      <Card>
        <p className="text-sm text-text-dim">
          You&apos;re not enrolled in a program yet — your coach will assign
          one.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      {programs.map((p) => (
        <section key={p.id}>
          <div className="mb-3 flex items-center gap-2">
            <h1 className="text-lg font-bold">{p.title}</h1>
            <Badge color={p.scope === "group" ? "info" : "primary"}>
              {p.scope === "group" ? "group program" : "personal"}
            </Badge>
          </div>
          {p.description && (
            <p className="mb-3 text-sm text-text-dim">{p.description}</p>
          )}

          <div className="space-y-2">
            {[...p.days]
              .sort((a, b) => a.day_index - b.day_index)
              .map((day) => (
                <Card
                  key={day.id}
                  className={day.is_rest ? "opacity-50" : ""}
                >
                  <div className="flex items-baseline gap-3">
                    <span className="w-9 shrink-0 text-xs font-bold uppercase tracking-wider text-text-faint">
                      {DAY_LABELS[day.day_index]}
                    </span>
                    {day.is_rest ? (
                      <span className="text-sm text-text-faint">Rest</span>
                    ) : (
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold">{day.title}</p>
                        {day.notes && (
                          <p className="mt-0.5 text-xs italic text-text-faint">
                            {day.notes}
                          </p>
                        )}
                        <ul className="mt-2 space-y-1">
                          {day.exercises.map((ex) => (
                            <li
                              key={ex.id}
                              className="flex items-center justify-between gap-2 text-xs"
                            >
                              <button
                                onClick={() =>
                                  setDetail({
                                    ref: ex.exercise_ref,
                                    name: ex.exercise_name,
                                  })
                                }
                                className="cursor-pointer truncate text-left text-text-dim hover:text-info"
                              >
                                {ex.exercise_name} ▸
                              </button>
                              <span className="shrink-0 text-text-faint">
                                {ex.sets ?? "?"}×{ex.reps ?? "?"}
                                {ex.load && (
                                  <span className="ml-1 text-load">
                                    @ {ex.load}
                                  </span>
                                )}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </Card>
              ))}
          </div>
        </section>
      ))}

      {detail && (
        <ExerciseDetailModal
          exerciseRef={detail.ref}
          fallbackName={detail.name}
          onClose={() => setDetail(null)}
        />
      )}
    </div>
  );
}
