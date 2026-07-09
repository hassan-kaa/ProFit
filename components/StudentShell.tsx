"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCurrentStudent, useProfile, signOut } from "@/lib/data";
import { DEMO_STUDENTS } from "@/lib/demo-data";
import Logo from "./Logo";

const TABS = [
  { href: "/student", label: "Today" },
  { href: "/student/program", label: "My Program" },
  { href: "/student/shared", label: "Shared" },
];

/**
 * Student shell — top-nav, mobile-first (students train with a phone in hand).
 * Accent color: info/sky, to visually distinguish from the coach area.
 */
export default function StudentShell({
  demo,
  children,
}: {
  demo: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { studentId, setStudentId } = useCurrentStudent();
  const profile = useProfile();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-border bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <Logo heightClass="h-8" />
          <div className="flex items-center gap-2">
            {demo ? (
              <>
                {/* demo-only: impersonate a student */}
                <select
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  className="rounded-lg border border-border bg-surface-2 px-2 py-1.5 text-xs"
                  title="Demo: switch student"
                >
                  {DEMO_STUDENTS.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.full_name}
                    </option>
                  ))}
                </select>
                <Link
                  href="/dashboard"
                  className="rounded-lg border border-border px-2.5 py-1.5 text-xs text-text-dim transition-colors hover:border-primary/50 hover:text-primary"
                >
                  Coach view
                </Link>
              </>
            ) : (
              <>
                <span className="max-w-32 truncate text-xs text-text-dim">
                  {profile?.full_name}
                </span>
                <button
                  onClick={async () => {
                    await signOut();
                    router.push("/login/student");
                  }}
                  className="cursor-pointer rounded-lg border border-border px-2.5 py-1.5 text-xs text-text-dim transition-colors hover:border-danger/40 hover:text-danger"
                >
                  Sign out
                </button>
              </>
            )}
          </div>
        </div>
        <nav className="mx-auto flex max-w-3xl gap-1 px-4">
          {TABS.map((t) => {
            const active = pathname === t.href;
            return (
              <Link
                key={t.href}
                href={t.href}
                className={`border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "border-info text-info"
                    : "border-transparent text-text-dim hover:text-text"
                }`}
              >
                {t.label}
              </Link>
            );
          })}
        </nav>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 p-4">{children}</main>
    </div>
  );
}
