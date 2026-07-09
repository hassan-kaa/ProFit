"use client";

import { useState } from "react";
import { Badge, PageHeader } from "@/components/ui";
import { useCoachSessions, weekDates, getToday } from "@/lib/data";
import { DAY_LABELS, type Session } from "@/lib/types";
import SessionEditModal from "@/components/SessionEditModal";

type DisplayStatus = "completed" | "missed" | "scheduled" | "skipped";

/** "missed" isn't a stored status — it's a scheduled session whose date has
 *  already passed without being completed. */
function displayStatus(s: Session, today: string): DisplayStatus {
  if (s.status === "scheduled" && s.scheduled_date < today) return "missed";
  return s.status;
}

const STATUS_DOT: Record<DisplayStatus, string> = {
  completed: "bg-primary",
  scheduled: "bg-info",
  missed: "bg-danger",
  skipped: "bg-text-faint",
};

const STATUS_BADGE_COLOR: Record<DisplayStatus, "primary" | "info" | "danger" | "default"> = {
  completed: "primary",
  scheduled: "info",
  missed: "danger",
  skipped: "default",
};

/** Week view of all scheduled/completed sessions across students. */
export default function SchedulePage() {
  const sessions = useCoachSessions();
  const today = getToday();
  const week = weekDates(today);
  const [editing, setEditing] = useState<Session | null>(null);

  return (
    <div className="flex flex-col lg:h-full">
      <PageHeader
        title="Schedule"
        subtitle="This week across all students and groups — click a session for details"
      />

      <div className="min-h-0 lg:flex-1 lg:overflow-x-auto lg:pb-1">
        <div className="grid grid-cols-1 gap-4 lg:h-full lg:min-w-[1160px] lg:grid-cols-7">
          {week.map((date, i) => {
            const daySessions = sessions.filter(
              (s) => s.scheduled_date === date
            );
            const isToday = date === today;
            return (
              <div
                key={date}
                className={`flex flex-col rounded-2xl border p-4 ${
                  isToday
                    ? "border-primary/50 bg-primary/5"
                    : "border-border bg-surface"
                }`}
              >
                <div className="mb-4 flex items-baseline justify-between">
                  <span
                    className={`text-sm font-bold uppercase tracking-wider ${
                      isToday ? "text-primary" : "text-text-dim"
                    }`}
                  >
                    {DAY_LABELS[i]}
                  </span>
                  <span
                    className={`text-xs ${
                      isToday ? "text-primary" : "text-text-faint"
                    }`}
                  >
                    {date.slice(8)}/{date.slice(5, 7)}
                  </span>
                </div>

                <div className="min-h-0 space-y-2 lg:flex-1 lg:overflow-y-auto">
                  {daySessions.length === 0 && (
                    <p className="pt-10 text-center text-xs text-text-faint">
                      No sessions
                    </p>
                  )}
                  {daySessions.map((s) => {
                    const ds = displayStatus(s, today);
                    return (
                      <button
                        key={s.id}
                        onClick={() => setEditing(s)}
                        className="w-full cursor-pointer rounded-xl border border-border bg-surface-2 p-3 text-left transition-colors hover:border-primary/50"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`h-1.5 w-1.5 shrink-0 rounded-full ${STATUS_DOT[ds]}`}
                          />
                          <p className="truncate text-sm font-medium">
                            {s.student_name}
                          </p>
                        </div>
                        <p className="mt-1 line-clamp-1 text-xs text-text-dim">
                          {s.day_title}
                        </p>
                        <div className="mt-2">
                          <Badge color={STATUS_BADGE_COLOR[ds]}>{ds}</Badge>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {editing && (
        <SessionEditModal session={editing} onClose={() => setEditing(null)} />
      )}
    </div>
  );
}
