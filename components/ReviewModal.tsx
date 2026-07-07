"use client";

import { useState } from "react";
import { DIFFICULTY_LABELS, type SessionReview } from "@/lib/types";
import { Button } from "./ui";

/**
 * Post-session review: "was this session adapted to your level?"
 * difficulty 1 (way too easy) … 5 (way too hard), 3 = well adapted.
 */
export default function ReviewModal({
  sessionTitle,
  onSubmit,
  onClose,
}: {
  sessionTitle: string;
  onSubmit: (
    review: Pick<SessionReview, "difficulty" | "adapted" | "comment">
  ) => void;
  onClose: () => void;
}) {
  const [difficulty, setDifficulty] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [comment, setComment] = useState("");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl border border-border bg-surface p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold">Session complete 💪</h2>
        <p className="mt-1 text-sm text-text-dim">
          How was “{sessionTitle}” for your level?
        </p>

        <div className="mt-4 space-y-1.5">
          {([1, 2, 3, 4, 5] as const).map((d) => {
            const active = difficulty === d;
            const color =
              d === 3
                ? "border-primary/50 bg-primary/10 text-primary"
                : d >= 4
                  ? "border-danger/50 bg-danger/10 text-danger"
                  : "border-info/50 bg-info/10 text-info";
            return (
              <button
                key={d}
                onClick={() => setDifficulty(d)}
                className={`flex w-full cursor-pointer items-center justify-between rounded-lg border px-3 py-2 text-sm transition-colors ${
                  active ? color : "border-border bg-surface-2 text-text-dim hover:border-border-strong"
                }`}
              >
                {DIFFICULTY_LABELS[d]}
                {active && <span>✓</span>}
              </button>
            );
          })}
        </div>

        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Anything your coach should know? (optional)"
          rows={3}
          className="mt-4 w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none placeholder:text-text-faint focus:border-review/60"
        />

        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Skip
          </Button>
          <Button
            onClick={() =>
              onSubmit({
                difficulty,
                adapted: difficulty === 3,
                comment: comment.trim() || null,
              })
            }
          >
            Send to coach
          </Button>
        </div>
      </div>
    </div>
  );
}
