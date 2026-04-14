import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ProfileForm } from "@/components/profile/profile-form";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("name, phone, organization, email, role, status")
    .eq("id", user.id)
    .single();
  if (!profile) redirect("/dashboard");

  return (
    <main className="min-h-screen bg-[#0f172a]">
      <div className="mx-auto max-w-2xl px-4 py-6">
        <h1 className="mb-4 text-xl font-bold text-[#e2e8f0]">내 정보</h1>
        <ProfileForm
          initial={{
            name: profile.name ?? "",
            phone: profile.phone ?? "",
            organization: profile.organization ?? "",
            email: profile.email ?? "",
            role: profile.role ?? "",
            status: profile.status ?? "",
          }}
        />
      </div>
    </main>
  );
}
