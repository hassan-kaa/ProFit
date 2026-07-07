"use client";

import { useMemo, useState } from "react";
import { useMySessions, submitReview, toggleShare, getToday } from "@/lib/data";
import { DIFFICULTY_LABELS, type Session, type SessionReview } from "@/lib/types";
import ReviewModal from "@/components/ReviewModal";
import ExerciseDetailModal from "@/components/ExerciseDetailModal";
import { Badge, Button, Card } from "@/components/ui";

export default function StudentTodayPage() {
  const sessions = useMySessions();
  const today = getToday();

  const todayList = useMemo(
    () => sessions.filter((s) => s.scheduled_date === today),
    [sessions, today]
  );
  const upcoming = sessions.filter((s) => s.scheduled_date > today);
  const past = sessions
    .filter((s) => s.scheduled_date < today)
    .sort((a, b) => b.scheduled_date.localeCompare(a.scheduled_date));

  return (
    <div className="space-y-6">
      <section>
        <h1 className="mb-3 text-xl font-bold">Today</h1>
        {todayList.length === 0 && (
          <Card>
            <p className="text-sm text-text-dim">
              No session scheduled today — enjoy the rest day. 🛋
            </p>
          </Card>
        )}
        <div className="space-y-3">
          {todayList.map((s) => (
            <SessionCard key={s.id} session={s} expanded today={today} />
          ))}
        </div>
      </section>

      {upcoming.length > 0 && (
        <section>
          <h2 className="mb-3 font-semibold text-text-dim">Coming up</h2>
          <div className="space-y-3">
            {upcoming.map((s) => (
              <SessionCard key={s.id} session={s} today={today} />
            ))}
          </div>
        </section>
      )}

      {past.length > 0 && (
        <section>
          <h2 className="mb-3 font-semibold text-text-dim">Previous</h2>
          <div className="space-y-3">
            {past.map((s) => (
              <SessionCard key={s.id} session={s} today={today} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function SessionCard({
  session,
  today,
  expanded = false,
}: {
  session: Session;
  today: string;
  expanded?: boolean;
}) {
  const exercises = session.exercises ?? [];

  const [open, setOpen] = useState(expanded);
  const [done, setDone] = useState<Record<string, number>>({});
  const [reviewing, setReviewing] = useState(false);
  const [detail, setDetail] = useState<{
    ref: string | null;
    name: string;
  } | null>(null);

  const isToday = session.scheduled_date === today;
  const completed = session.status === "completed";
  const totalSets = exercises.reduce((n, e) => n + (e.sets ?? 0), 0);
  const doneSets = Object.values(done).reduce((a, b) => a + b, 0);
  const allDone = totalSets > 0 && doneSets >= totalSets;

  return (
    <Card className={isToday && !completed ? "border-info/50" : ""}>
      <button
        className="flex w-full cursor-pointer items-center justify-between gap-2 text-left"
        onClick={() => setOpen((v) => !v)}
      >
        <div>
          <p className="font-semibold">{session.day_title}</p>
          <p className="text-xs text-text-dim">
            {session.program_title} · {session.scheduled_date}
          </p>
        </div>
        <Badge color={completed ? "primary" : isToday ? "info" : "default"}>
          {completed ? "completed" : session.status}
        </Badge>
      </button>

      {open && (
        <div className="mt-3 space-y-2 border-t border-border pt-3">
          {exercises.map((ex) => {
            const sets = ex.sets ?? 0;
            const d = done[ex.id] ?? 0;
            return (
              <div
                key={ex.id}
                className="rounded-lg border border-border bg-surface-2 p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <button
                    onClick={() =>
                      setDetail({ ref: ex.exercise_ref, name: ex.exercise_name })
                    }
                    className="cursor-pointer text-left text-sm font-medium hover:text-info"
                    title="Show form guide"
                  >
                    {ex.exercise_name} ▸
                  </button>
                  <span className="shrink-0 text-xs text-text-dim">
                    {ex.sets ?? "?"}×{ex.reps ?? "?"}
                    {ex.load && (
                      <span className="ml-1 text-load">@ {ex.load}</span>
                    )}
                  </span>
                </div>
                {!completed && isToday && sets > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {Array.from({ length: sets }, (_, i) => (
                      <button
                        key={i}
                        onClick={() =>
                          setDone((prev) => ({
                            ...prev,
                            [ex.id]: i < d ? i : i + 1,
                          }))
                        }
                        className={`h-7 w-7 cursor-pointer rounded-md border text-xs font-bold transition-colors ${
                          i < d
                            ? "border-primary bg-primary text-primary-ink"
                            : "border-border bg-bg text-text-faint hover:border-primary/50"
                        }`}
                        title={`Set ${i + 1}`}
                      >
                        {i + 1}
                      </button>
                    ))}
                    {ex.rest_seconds && (
                      <span className="ml-1 self-center text-[11px] text-text-faint">
                        rest {ex.rest_seconds}s
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {!completed && isToday && (
            <Button
              className="w-full"
              variant={allDone ? "primary" : "ghost"}
              onClick={() => setReviewing(true)}
            >
              {allDone
                ? "Finish session ✓"
                : `Finish session (${doneSets}/${totalSets} sets)`}
            </Button>
          )}

          {completed && (
            <div className="flex items-center justify-between rounded-lg border border-border bg-surface-2 px-3 py-2">
              <div className="text-xs">
                {session.review ? (
                  <>
                    <Badge
                      color={
                        session.review.difficulty >= 4
                          ? "danger"
                          : session.review.difficulty <= 2
                            ? "info"
                            : "primary"
                      }
                    >
                      {DIFFICULTY_LABELS[session.review.difficulty]}
                    </Badge>
                    {session.review.comment && (
                      <p className="mt-1 text-text-dim">
                        “{session.review.comment}”
                      </p>
                    )}
                  </>
                ) : (
                  <button
                    onClick={() => setReviewing(true)}
                    className="cursor-pointer text-review hover:underline"
                  >
                    Leave a review for your coach
                  </button>
                )}
              </div>
              <label className="flex cursor-pointer items-center gap-1.5 text-xs text-text-dim">
                <input
                  type="checkbox"
                  checked={session.shared}
                  onChange={() => toggleShare(session.id, !session.shared)}
                  className="accent-info"
                />
                Share with group
              </label>
            </div>
          )}
        </div>
      )}

      {reviewing && (
        <ReviewModal
          sessionTitle={session.day_title ?? "Session"}
          onClose={() => setReviewing(false)}
          onSubmit={(review) => {
            submitReview(
              session.id,
              review as Pick<SessionReview, "difficulty" | "adapted" | "comment">
            );
            setReviewing(false);
          }}
        />
      )}

      {detail && (
        <ExerciseDetailModal
          exerciseRef={detail.ref}
          fallbackName={detail.name}
          onClose={() => setDetail(null)}
        />
      )}
    </Card>
  );
}
