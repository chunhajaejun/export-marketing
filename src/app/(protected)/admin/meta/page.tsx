import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { MetaAdminPanel } from "@/components/admin/meta-admin-panel";

export default async function MetaAdminPage() {
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
    .from("meta_ad_accounts")
    .select("*")
    .order("account_id");
  const { data: ads } = await admin
    .from("meta_ads")
    .select("*")
    .order("name")
    .limit(200);
  const { data: campaigns } = await admin
    .from("meta_campaigns")
    .select("campaign_id, name, status, adlabels");

  const since = new Date();
  since.setDate(since.getDate() - 7);
  const { data: adStats } = await admin
    .from("meta_ad_stats")
    .select("ad_id, date, impressions, clicks, spend, ctr, cpc")
    .gte("date", since.toISOString().slice(0, 10))
    .order("date", { ascending: false });

  return (
    <main className="min-h-screen bg-[#0f172a]">
      <div className="mx-auto max-w-6xl px-4 py-6">
        <h1 className="mb-4 text-xl font-bold text-[#e2e8f0]">메타 광고 동기화 관리</h1>
        <MetaAdminPanel
          accounts={accounts ?? []}
          ads={ads ?? []}
          campaigns={campaigns ?? []}
          latestStats={adStats ?? []}
        />
      </div>
    </main>
  );
}
