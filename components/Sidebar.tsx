"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useProfile, signOut } from "@/lib/data";
import Logo from "./Logo";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: "▦" },
  { href: "/programs", label: "Programs", icon: "🗓" },
  { href: "/schedule", label: "Schedule", icon: "◷" },
  { href: "/exercises", label: "Exercise Library", icon: "🏋" },
  { href: "/students", label: "Students & Groups", icon: "👥" },
];

export default function Sidebar({ demo = false }: { demo?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const profile = useProfile();
  const name = demo ? "Coach (demo)" : (profile?.full_name ?? "Coach");

  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col border-r border-border bg-surface">
      <div className="px-5 py-5">
        <Logo heightClass="h-10" />
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {NAV.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? "bg-primary/10 text-primary"
                  : "text-text-dim hover:bg-surface-2 hover:text-text"
              }`}
            >
              <span className="w-5 text-center">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-4">
        {demo && (
          <Link
            href="/student"
            className="mb-3 flex items-center justify-center gap-2 rounded-lg border border-info/30 bg-info/5 px-3 py-2 text-xs font-medium text-info transition-colors hover:bg-info/10"
          >
            ⇄ Student view
          </Link>
        )}
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-2 text-sm font-bold text-primary">
              {name[0]?.toUpperCase() ?? "C"}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{name}</p>
              <p className="truncate text-xs text-text-faint">coach</p>
            </div>
          </div>
          {!demo && (
            <button
              onClick={async () => {
                await signOut();
                router.push("/login");
              }}
              title="Sign out"
              className="cursor-pointer rounded-lg border border-border px-2 py-1.5 text-xs text-text-dim transition-colors hover:border-danger/40 hover:text-danger"
            >
              ⎋
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
