import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { SignOutButton } from "./signout-button";

export default async function PendingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // service_role로 프로필 조회 (RLS 우회)
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("status, email")
    .eq("id", user.id)
    .single();

  if (profile?.status === "approved") redirect("/dashboard");

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0f172a] px-4">
      <div className="w-full max-w-sm rounded-xl border border-[#334155] bg-[#1e293b] p-8 text-center">
        <div className="text-4xl mb-4">⏳</div>
        <h1 className="text-lg font-bold text-white mb-2">승인 대기 중</h1>
        <p className="text-sm text-[#94a3b8] mb-4">
          가입 신청이 완료되었습니다.<br />관리자 승인 후 이용 가능합니다.
        </p>
        <div className="rounded-lg bg-[#0f172a] p-3 mb-4">
          <p className="text-xs text-[#64748b]">가입 이메일</p>
          <p className="text-sm font-bold text-blue-500">{profile?.email || user.email}</p>
        </div>
        <SignOutButton />
      </div>
    </div>
  );
}
