import { redirect } from "next/navigation";
import DashboardShell from "@/components/DashboardShell";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

/** Coach area — server-side role guard. */
export default async function DashboardLayout({
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
    if (!user) redirect("/login");
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (profile?.role !== "coach") redirect("/student");
  }

  return <DashboardShell demo={demo}>{children}</DashboardShell>;
}
