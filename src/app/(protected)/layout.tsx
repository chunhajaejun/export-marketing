import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NavBar } from "@/components/nav-bar";
import type { UserRole } from "@/lib/types";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("status, role, name")
    .eq("id", user.id)
    .single();

  if (!profile || profile.status !== "approved") {
    redirect("/pending");
  }

  return (
    <>
      <NavBar
        userName={profile.name || user.email || "사용자"}
        userRole={profile.role as UserRole}
      />
      {children}
    </>
  );
}
