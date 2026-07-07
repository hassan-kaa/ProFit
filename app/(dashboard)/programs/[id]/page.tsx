"use client";

import { use } from "react";
import Link from "next/link";
import ProgramBuilder from "@/components/ProgramBuilder";
import { useProgram, saveProgram } from "@/lib/data";

export default function ProgramDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { program, loading } = useProgram(id);

  if (loading) {
    return <div className="text-text-dim">Loading program…</div>;
  }

  if (!program) {
    return (
      <div className="text-text-dim">
        Program not found.{" "}
        <Link href="/programs" className="text-primary hover:underline">
          Back to programs
        </Link>
      </div>
    );
  }

  return (
    <div className="h-full">
      <ProgramBuilder initial={program} onSave={saveProgram} />
    </div>
  );
}
