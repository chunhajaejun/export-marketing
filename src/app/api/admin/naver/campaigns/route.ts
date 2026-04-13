import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadNaverAccounts, listCampaigns } from "@/lib/naver/client";

export const dynamic = "force-dynamic";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin")
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  return { admin };
}

// 전체 캠페인 목록 + 화이트리스트 상태 조회. refresh=1이면 네이버 API 호출로 최신 목록 동기화.
export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const { admin } = auth;

  const refresh = req.nextUrl.searchParams.get("refresh") === "1";
  const errors: string[] = [];

  if (refresh) {
    const accounts = loadNaverAccounts();
    for (const acc of accounts) {
      try {
        const campaigns = await listCampaigns(acc.creds);
        for (const c of campaigns) {
          const { error } = await admin.from("naver_campaigns").upsert(
            {
              campaign_id: c.nccCampaignId,
              account_key: acc.key,
              name: c.name,
              campaign_tp: c.campaignTp,
              status: c.status,
            },
            { onConflict: "campaign_id", ignoreDuplicates: false }
          );
          if (error) errors.push(`${c.nccCampaignId}: ${error.message}`);
        }
      } catch (e) {
        errors.push(`${acc.key}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  }

  const { data: accounts } = await admin
    .from("naver_accounts")
    .select("*")
    .order("account_key");
  const { data: campaigns } = await admin
    .from("naver_campaigns")
    .select("*")
    .order("account_key")
    .order("name");

  return NextResponse.json({ accounts, campaigns, errors });
}

// 화이트리스트 토글
export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const { admin } = auth;

  const body = await req.json();
  const campaignId = typeof body.campaignId === "string" ? body.campaignId : "";
  if (!campaignId)
    return NextResponse.json({ error: "campaignId required" }, { status: 400 });

  const patch: Record<string, unknown> = {};
  if (typeof body.isWhitelisted === "boolean") patch.is_whitelisted = body.isWhitelisted;
  if (body.mediaChannel === "naver_web" || body.mediaChannel === "naver_landing")
    patch.media_channel = body.mediaChannel;
  if (Object.keys(patch).length === 0)
    return NextResponse.json({ error: "no update fields" }, { status: 400 });

  const { error } = await admin
    .from("naver_campaigns")
    .update(patch)
    .eq("campaign_id", campaignId);
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
