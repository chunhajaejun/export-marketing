import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NaverAdminPanel } from "@/components/admin/naver-admin-panel";

export default async function NaverAdminPage() {
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
  if (!profile || profile.role !== "admin") redirect("/dashboard");

  const { data: accounts } = await admin
    .from("naver_accounts")
    .select("*")
    .order("account_key");
  const { data: campaigns } = await admin
    .from("naver_campaigns")
    .select("*")
    .order("account_key")
    .order("name");

  const since = new Date();
  since.setDate(since.getDate() - 7);
  const { data: stats } = await admin
    .from("naver_ad_stats")
    .select("campaign_id, date, impressions, clicks, cost, ctr, cpc, conversions")
    .gte("date", since.toISOString().slice(0, 10))
    .order("date", { ascending: false });

  return (
    <main className="min-h-screen bg-[#0f172a]">
      <div className="mx-auto max-w-6xl px-4 py-6">
        <h1 className="mb-4 text-xl font-bold text-[#e2e8f0]">네이버 광고 동기화 관리</h1>
        <NaverAdminPanel
          initialAccounts={accounts ?? []}
          initialCampaigns={campaigns ?? []}
          latestStats={stats ?? []}
        />
      </div>
    </main>
  );
}
