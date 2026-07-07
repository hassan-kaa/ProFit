"use client";

import Link from "next/link";
import { Card, Badge, PageHeader } from "@/components/ui";
import { usePrograms, useCoachSessions, useGroups, getToday } from "@/lib/data";
import { DIFFICULTY_LABELS } from "@/lib/types";

export default function DashboardPage() {
  const programs = usePrograms();
  const sessions = useCoachSessions();
  const groups = useGroups();
  const today = getToday();

  const todaySessions = sessions.filter((s) => s.scheduled_date === today);
  const recentReviews = sessions.filter((s) => s.review);
  const flagged = recentReviews.filter(
    (s) => s.review && (s.review.difficulty >= 4 || s.review.difficulty <= 2)
  );

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="Your coaching overview for today"
      />

      {/* stat cards */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Active programs" value={programs.filter((p) => p.is_active).length} accent="text-primary" />
        <Stat label="Sessions today" value={todaySessions.length} accent="text-info" />
        <Stat label="Groups" value={groups.length} accent="text-load" />
        <Stat label="Reviews to check" value={flagged.length} accent="text-review" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* today's sessions */}
        <Card>
          <h2 className="mb-3 font-semibold">Today&apos;s sessions</h2>
          <div className="space-y-2">
            {todaySessions.length === 0 && (
              <p className="text-sm text-text-dim">Nothing scheduled today.</p>
            )}
            {todaySessions.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between rounded-lg border border-border bg-surface-2 px-3 py-2.5"
              >
                <div>
                  <p className="text-sm font-medium">{s.student_name}</p>
                  <p className="text-xs text-text-dim">
                    {s.day_title} · {s.program_title}
                  </p>
                </div>
                <Badge color={s.status === "completed" ? "primary" : "info"}>
                  {s.status}
                </Badge>
              </div>
            ))}
          </div>
        </Card>

        {/* latest student feedback */}
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Latest session reviews</h2>
            <Badge color="review">student feedback</Badge>
          </div>
          <div className="space-y-2">
            {recentReviews.map((s) => {
              const r = s.review!;
              const hard = r.difficulty >= 4;
              const easy = r.difficulty <= 2;
              return (
                <div
                  key={s.id}
                  className="rounded-lg border border-border bg-surface-2 px-3 py-2.5"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{s.student_name}</p>
                    <Badge color={hard ? "danger" : easy ? "info" : "primary"}>
                      {DIFFICULTY_LABELS[r.difficulty]}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-text-dim">
                    {s.day_title} — “{r.comment}”
                  </p>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* programs */}
      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">Active programs</h2>
          <Link href="/programs" className="text-sm text-primary hover:underline">
            View all →
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {programs.map((p) => (
            <Link key={p.id} href={`/programs/${p.id}`}>
              <Card className="h-full transition-colors hover:border-primary/50">
                <div className="mb-2 flex items-center justify-between">
                  <Badge
                    color={p.scope === "group" ? "info" : p.scope === "self" ? "load" : "primary"}
                  >
                    {p.scope}
                  </Badge>
                  <span className="text-xs text-text-faint">{p.cadence}</span>
                </div>
                <p className="font-semibold">{p.title}</p>
                <p className="mt-1 line-clamp-2 text-sm text-text-dim">
                  {p.description}
                </p>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: string;
}) {
  return (
    <Card>
      <p className={`text-3xl font-bold ${accent}`}>{value}</p>
      <p className="mt-1 text-sm text-text-dim">{label}</p>
    </Card>
  );
}
