"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { Button, Input, Card } from "@/components/ui";

/** Coach login/signup. Students use /login/student. */
export default function CoachLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const configured = isSupabaseConfigured();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!configured) {
      router.push("/dashboard");
      return;
    }
    setLoading(true);
    setError(null);
    const supabase = createClient();

    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { role: "coach", full_name: fullName } },
      });
      setLoading(false);
      if (error) return setError(error.message);
      router.push("/dashboard");
      return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      setLoading(false);
      return setError(error.message);
    }
    // route by role — students who land here get sent to their app
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .single();
    setLoading(false);
    router.push(profile?.role === "student" ? "/student" : "/dashboard");
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm p-6">
        <div className="mb-1 flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary font-black text-primary-ink">
            K
          </span>
          <span className="text-xl font-bold">
            Kamil<span className="text-primary">Fit</span>
          </span>
        </div>
        <p className="mb-6 text-sm text-text-dim">Coach area</p>

        {!configured && (
          <p className="mb-4 rounded-lg border border-review/25 bg-review/10 p-3 text-xs text-review">
            Supabase is not configured — continue in demo mode.
          </p>
        )}

        <form onSubmit={submit} className="space-y-3">
          {mode === "signup" && configured && (
            <Input
              placeholder="Full name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          )}
          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required={configured}
          />
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required={configured}
          />
          {error && <p className="text-xs text-danger">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {!configured
              ? "Enter demo"
              : loading
                ? "…"
                : mode === "signin"
                  ? "Sign in"
                  : "Create coach account"}
          </Button>
        </form>

        {configured && (
          <button
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="mt-4 w-full cursor-pointer text-center text-xs text-text-dim hover:text-text"
          >
            {mode === "signin"
              ? "No account? Sign up as a coach"
              : "Already have an account? Sign in"}
          </button>
        )}

        <div className="mt-5 border-t border-border pt-4 text-center">
          <Link
            href="/login/student"
            className="text-xs text-info hover:underline"
          >
            I&apos;m a student → student login
          </Link>
        </div>
      </Card>
    </div>
  );
}
