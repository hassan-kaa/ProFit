"use client";

import { useState } from "react";
import { Card, Badge, PageHeader, Button, Input } from "@/components/ui";
import {
  useEnrolledStudents,
  useGroups,
  useCoachSessions,
  usePrograms,
  enrollStudentByEmail,
  assignProgramToStudent,
} from "@/lib/data";
import { DIFFICULTY_LABELS, type EnrolledStudent } from "@/lib/types";

export default function StudentsPage() {
  const students = useEnrolledStudents();
  const groups = useGroups();
  const sessions = useCoachSessions();
  const [enrolling, setEnrolling] = useState(false);
  const [assigning, setAssigning] = useState<EnrolledStudent | null>(null);

  return (
    <>
      <PageHeader
        title="Students & Groups"
        subtitle="Enroll students by email, then assign them a program"
        actions={
          <>
            <Button variant="ghost">+ New group</Button>
            <Button onClick={() => setEnrolling(true)}>+ Enroll student</Button>
          </>
        }
      />

      <h2 className="mb-3 font-semibold">Groups</h2>
      <div className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {groups.length === 0 && (
          <Card>
            <p className="text-sm text-text-dim">No groups yet.</p>
          </Card>
        )}
        {groups.map((g) => (
          <Card key={g.id} className="transition-colors hover:border-info/50">
            <div className="mb-2 flex items-center justify-between">
              <Badge color="info">group</Badge>
              {g.member_count != null && (
                <span className="text-xs text-text-faint">
                  {g.member_count} members
                </span>
              )}
            </div>
            <p className="font-semibold">{g.name}</p>
            <p className="mt-1 text-sm text-text-dim">{g.description}</p>
          </Card>
        ))}
      </div>

      <h2 className="mb-3 font-semibold">Students</h2>
      {students.length === 0 && (
        <Card>
          <p className="text-sm text-text-dim">
            No students enrolled yet. Ask your students to sign up on the
            student login page, then enroll them here with their email.
          </p>
        </Card>
      )}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {students.map((s) => {
          const lastReview = sessions.find(
            (x) => x.student_id === s.id && x.review
          )?.review;
          return (
            <Card key={s.id}>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-2 font-bold text-primary">
                  {s.full_name?.[0] ?? "?"}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-medium">{s.full_name}</p>
                  <p className="text-xs text-text-faint">{s.status}</p>
                </div>
              </div>

              {lastReview && (
                <div className="mt-3 border-t border-border pt-3">
                  <p className="mb-1 text-xs text-text-faint">
                    Last session feedback
                  </p>
                  <Badge
                    color={
                      lastReview.difficulty >= 4
                        ? "danger"
                        : lastReview.difficulty <= 2
                          ? "info"
                          : "primary"
                    }
                  >
                    {DIFFICULTY_LABELS[lastReview.difficulty]}
                  </Badge>
                </div>
              )}

              <Button
                variant="ghost"
                className="mt-3 w-full"
                onClick={() => setAssigning(s)}
              >
                Assign program
              </Button>
            </Card>
          );
        })}
      </div>

      {enrolling && <EnrollModal onClose={() => setEnrolling(false)} />}
      {assigning && (
        <AssignModal
          student={assigning}
          onClose={() => setAssigning(null)}
        />
      )}
    </>
  );
}

/* ---- enroll by email ---- */

function EnrollModal({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function enroll(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await enrollStudentByEmail(email);
    setBusy(false);
    if (res.error) setResult(res.error);
    else {
      setResult(`✓ ${res.full_name ?? email} enrolled.`);
      setEmail("");
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-xl border border-border bg-surface p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold">Enroll a student</h2>
        <p className="mt-1 text-sm text-text-dim">
          The student must have already signed up on the student login page.
        </p>
        <form onSubmit={enroll} className="mt-4 space-y-3">
          <Input
            type="email"
            placeholder="student@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
          />
          {result && (
            <p
              className={`text-xs ${
                result.startsWith("✓") ? "text-primary" : "text-danger"
              }`}
            >
              {result}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" type="button" onClick={onClose}>
              Close
            </Button>
            <Button type="submit" disabled={busy || !email.trim()}>
              {busy ? "…" : "Enroll"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ---- assign a program ---- */

function AssignModal({
  student,
  onClose,
}: {
  student: EnrolledStudent;
  onClose: () => void;
}) {
  const programs = usePrograms();
  const [busy, setBusy] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const candidates = programs.filter((p) => p.scope !== "group");

  async function assign(programId: string) {
    setBusy(programId);
    const res = await assignProgramToStudent(programId, student.id);
    setBusy(null);
    if (res.error) setResult(res.error);
    else
      setResult(
        `✓ Assigned — ${res.created} session${res.created === 1 ? "" : "s"} created for this week.`
      );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl border border-border bg-surface p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold">
          Assign a program to {student.full_name}
        </h2>
        <p className="mt-1 text-sm text-text-dim">
          Assigning links the program and creates this week&apos;s sessions
          for each training day.
        </p>

        <div className="mt-4 max-h-72 space-y-2 overflow-y-auto">
          {candidates.length === 0 && (
            <p className="text-sm text-text-dim">
              No individual programs yet — create one on the Programs page.
            </p>
          )}
          {candidates.map((p) => {
            const trainingDays = p.days.filter((d) => !d.is_rest).length;
            const alreadyTheirs = p.student_id === student.id;
            return (
              <button
                key={p.id}
                disabled={busy !== null}
                onClick={() => assign(p.id)}
                className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-left transition-colors hover:border-primary/50 disabled:opacity-50"
              >
                <div>
                  <p className="text-sm font-medium">{p.title}</p>
                  <p className="text-xs text-text-dim">
                    {trainingDays} training days / week
                  </p>
                </div>
                {alreadyTheirs ? (
                  <Badge color="primary">assigned</Badge>
                ) : busy === p.id ? (
                  <span className="text-xs text-text-dim">…</span>
                ) : (
                  <span className="text-xs text-primary">assign →</span>
                )}
              </button>
            );
          })}
        </div>

        {result && (
          <p
            className={`mt-3 text-xs ${
              result.startsWith("✓") ? "text-primary" : "text-danger"
            }`}
          >
            {result}
          </p>
        )}

        <div className="mt-4 flex justify-end">
          <Button variant="ghost" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}
