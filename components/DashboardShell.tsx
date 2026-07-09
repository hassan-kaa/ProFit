"use client";

import { useState, type ReactNode } from "react";
import Sidebar from "./Sidebar";
import Logo from "./Logo";

/**
 * Coach shell: static sidebar at lg+, off-canvas drawer (hamburger + backdrop)
 * below lg. Holds the open/closed state that the server layout can't.
 */
export default function DashboardShell({
  demo,
  children,
}: {
  demo: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar demo={demo} open={open} onClose={() => setOpen(false)} />

      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
        />
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-3 border-b border-border px-4 py-3 lg:hidden">
          <button
            onClick={() => setOpen(true)}
            className="cursor-pointer rounded-lg p-1.5 text-text-dim hover:text-text"
            title="Open menu"
          >
            ☰
          </button>
          <Logo heightClass="h-7" />
        </div>

        {demo && (
          <div className="border-b border-review/25 bg-review/10 px-4 py-1.5 text-xs text-review lg:px-6">
            Demo mode — set Supabase keys in <code>.env</code> to enable auth
            &amp; persistence. See README.
          </div>
        )}
        <main className="min-h-0 flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
