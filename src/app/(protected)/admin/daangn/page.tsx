import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { DaangnAdminPanel } from "@/components/admin/daangn-admin-panel";

export default async function DaangnAdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!profile) redirect("/dashboard");

  // 최근 14일 통계 (투바이어 매체)
  const since = new Date();
  since.setDate(since.getDate() - 13);
  const { data: stats } = await admin
    .from("daangn_ad_stats")
    .select(
      "date, media_id, media_name, impressions, clicks, cost, conversions, chat_inquiry, phone_inquiry, service_request, ctr, cpc, cpa, source, synced_at"
    )
    .gte("date", since.toISOString().slice(0, 10))
    .order("date", { ascending: false });

  return (
    <main className="min-h-screen bg-[#0f172a]">
      <div className="mx-auto max-w-6xl px-4 py-6">
        <h1 className="mb-4 text-xl font-bold text-[#e2e8f0]">당근 광고 동기화 관리</h1>
        <DaangnAdminPanel initialStats={stats ?? []} />
      </div>
    </main>
  );
}
