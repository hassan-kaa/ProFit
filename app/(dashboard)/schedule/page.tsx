"use client";

import { Card, Badge, PageHeader } from "@/components/ui";
import { useCoachSessions, weekDates, getToday } from "@/lib/data";
import { DAY_LABELS } from "@/lib/types";

/** Week view of all scheduled/completed sessions across students. */
export default function SchedulePage() {
  const sessions = useCoachSessions();
  const today = getToday();
  const week = weekDates(today);

  return (
    <>
      <PageHeader
        title="Schedule"
        subtitle="This week across all students and groups"
      />

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-7">
        {week.map((date, i) => {
          const daySessions = sessions.filter(
            (s) => s.scheduled_date === date
          );
          const isToday = date === today;
          return (
            <Card
              key={date}
              className={`min-h-40 ${isToday ? "border-primary/50" : ""}`}
            >
              <div className="mb-2 flex items-center justify-between">
                <span
                  className={`text-xs font-bold uppercase tracking-wider ${
                    isToday ? "text-primary" : "text-text-faint"
                  }`}
                >
                  {DAY_LABELS[i]}
                </span>
                <span className="text-xs text-text-faint">
                  {date.slice(8)}/{date.slice(5, 7)}
                </span>
              </div>
              <div className="space-y-1.5">
                {daySessions.length === 0 && (
                  <p className="text-xs text-text-faint">—</p>
                )}
                {daySessions.map((s) => (
                  <div
                    key={s.id}
                    className="rounded-lg border border-border bg-surface-2 p-2"
                  >
                    <p className="text-xs font-medium">{s.student_name}</p>
                    <p className="line-clamp-1 text-[11px] text-text-dim">
                      {s.day_title}
                    </p>
                    <div className="mt-1">
                      <Badge
                        color={s.status === "completed" ? "primary" : "info"}
                      >
                        {s.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          );
        })}
      </div>
    </>
  );
}
