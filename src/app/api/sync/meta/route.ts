import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  loadMetaCreds,
  listCampaigns,
  listAdSets,
  listAds,
  getAdInsightsDaily,
} from "@/lib/meta/client";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function toDateStr(d: Date) {
  return d.toISOString().slice(0, 10);
}

function isAuthorized(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return auth === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const creds = loadMetaCreds();
  if (!creds) {
    return NextResponse.json(
      { error: "META credentials not configured" },
      { status: 500 }
    );
  }

  const admin = createAdminClient();
  const errors: string[] = [];
  const report = {
    campaigns: 0,
    adsets: 0,
    ads: 0,
    insights: 0,
  };

  // 최근 7일치
  const until = new Date();
  const since = new Date();
  since.setDate(since.getDate() - 6);
  const sinceStr = toDateStr(since);
  const untilStr = toDateStr(until);

  try {
    const campaigns = await listCampaigns(creds);
    for (const c of campaigns) {
      const { error } = await admin.from("meta_campaigns").upsert(
        {
          campaign_id: c.id,
          account_id: creds.adAccountId,
          name: c.name,
          status: c.status,
          objective: c.objective ?? null,
          adlabels: c.adlabels ?? [],
        },
        { onConflict: "campaign_id" }
      );
      if (error) errors.push(`campaign ${c.id}: ${error.message}`);
      else report.campaigns += 1;
    }

    const adsets = await listAdSets(creds);
    for (const a of adsets) {
      const { error } = await admin.from("meta_adsets").upsert(
        {
          adset_id: a.id,
          campaign_id: a.campaign_id,
          name: a.name,
          status: a.status,
          adlabels: a.adlabels ?? [],
        },
        { onConflict: "adset_id" }
      );
      if (error) errors.push(`adset ${a.id}: ${error.message}`);
      else report.adsets += 1;
    }

    const ads = await listAds(creds);
    for (const ad of ads) {
      const { error } = await admin.from("meta_ads").upsert(
        {
          ad_id: ad.id,
          adset_id: ad.adset_id,
          campaign_id: ad.campaign_id,
          account_id: creds.adAccountId,
          name: ad.name,
          status: ad.status,
          creative_id: ad.creative?.id ?? null,
          thumbnail_url: ad.creative?.thumbnail_url ?? null,
          adlabels: ad.adlabels ?? [],
        },
        { onConflict: "ad_id" }
      );
      if (error) errors.push(`ad ${ad.id}: ${error.message}`);
      else report.ads += 1;
    }

    const insights = await getAdInsightsDaily(creds, sinceStr, untilStr);
    for (const ins of insights) {
      const { error } = await admin.from("meta_ad_stats").upsert(
        {
          ad_id: ins.ad_id,
          campaign_id: ins.campaign_id,
          account_id: ins.account_id,
          date: ins.date_start,
          impressions: Number(ins.impressions ?? 0),
          clicks: Number(ins.clicks ?? 0),
          reach: Number(ins.reach ?? 0),
          spend: Number(ins.spend ?? 0),
          ctr: ins.ctr !== undefined ? Number(ins.ctr) : null,
          cpc: ins.cpc !== undefined ? Number(ins.cpc) : null,
          cpm: ins.cpm !== undefined ? Number(ins.cpm) : null,
          conversions: ins.actions ?? [],
          synced_at: new Date().toISOString(),
        },
        { onConflict: "ad_id,date" }
      );
      if (error) errors.push(`insight ${ins.ad_id}/${ins.date_start}: ${error.message}`);
      else report.insights += 1;
    }
  } catch (e) {
    errors.push(e instanceof Error ? e.message : String(e));
  }

  return NextResponse.json({ success: true, ...report, errors });
}
