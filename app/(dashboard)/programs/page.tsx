"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Card, Badge, PageHeader, Button } from "@/components/ui";
import { usePrograms, createProgram, demoMode } from "@/lib/data";

export default function ProgramsPage() {
  const programs = usePrograms();
  const router = useRouter();
  const [creating, setCreating] = useState(false);

  async function onCreate() {
    if (demoMode()) {
      alert("Demo mode — connect Supabase to create programs.");
      return;
    }
    setCreating(true);
    try {
      const id = await createProgram();
      if (id) router.push(`/programs/${id}`);
    } finally {
      setCreating(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Programs"
        subtitle="Individual, group and personal training programs"
        actions={
          <Button onClick={onCreate} disabled={creating}>
            {creating ? "Creating…" : "+ New program"}
          </Button>
        }
      />

      {programs.length === 0 && (
        <Card>
          <p className="text-sm text-text-dim">
            No programs yet — create your first one.
          </p>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {programs.map((p) => {
          const trainingDays = p.days.filter((d) => !d.is_rest).length;
          const totalExercises = p.days.reduce(
            (n, d) => n + d.exercises.length,
            0
          );
          return (
            <Link key={p.id} href={`/programs/${p.id}`}>
              <Card className="h-full transition-colors hover:border-primary/50">
                <div className="mb-3 flex items-center justify-between">
                  <Badge
                    color={
                      p.scope === "group"
                        ? "info"
                        : p.scope === "self"
                          ? "load"
                          : "primary"
                    }
                  >
                    {p.scope}
                  </Badge>
                  {p.is_active && <Badge color="primary">active</Badge>}
                </div>
                <p className="text-lg font-semibold">{p.title}</p>
                <p className="mt-1 line-clamp-2 text-sm text-text-dim">
                  {p.description}
                </p>
                <div className="mt-4 flex gap-4 text-xs text-text-faint">
                  <span>{trainingDays} training days / week</span>
                  <span>{totalExercises} exercises</span>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </>
  );
}
