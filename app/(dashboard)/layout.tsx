import { redirect } from "next/navigation";
import Sidebar from "@/components/Sidebar";
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

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar demo={demo} />
      <div className="flex min-w-0 flex-1 flex-col">
        {demo && (
          <div className="border-b border-review/25 bg-review/10 px-6 py-1.5 text-xs text-review">
            Demo mode — set Supabase keys in <code>.env</code> to enable auth
            &amp; persistence. See README.
          </div>
        )}
        <main className="min-h-0 flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
