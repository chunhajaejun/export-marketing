import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TabContainer } from "@/components/input/tab-container";
import type { UserRole } from "@/lib/types";

const ALLOWED_ROLES: UserRole[] = ["call_reporter", "spend_reporter", "admin"];

export default async function InputPage() {
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

  if (!profile || !ALLOWED_ROLES.includes(profile.role as UserRole)) {
    redirect("/");
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-6">
        <h1 className="mb-4 text-xl font-bold">데이터 입력</h1>
        <TabContainer userRole={profile.role as UserRole} />
      </div>
    </main>
  );
}
