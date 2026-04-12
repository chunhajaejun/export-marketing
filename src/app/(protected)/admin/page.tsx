import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { UserTable } from "@/components/admin/user-table";
import type { Profile } from "@/lib/types";

export default async function AdminPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    redirect("/dashboard");
  }

  const { data: users } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <main className="min-h-screen bg-[#0f172a]">
      <div className="mx-auto max-w-7xl px-4 py-6">
        <h1 className="mb-4 text-xl font-bold text-[#e2e8f0]">사용자 관리</h1>
        <UserTable initialUsers={(users as Profile[]) || []} />
      </div>
    </main>
  );
}
