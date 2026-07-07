import { redirect } from "next/navigation";
import StudentShell from "@/components/StudentShell";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

/** Student area — server-side role guard. */
export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const demo = !isSupabaseConfigured();

  if (!demo) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login/student");
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (profile?.role !== "student") redirect("/dashboard");
  }

  return <StudentShell demo={demo}>{children}</StudentShell>;
}
