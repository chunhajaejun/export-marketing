import { createAdminClient } from "@/lib/supabase/admin";
import {
  loadMetaCreds,
  listCampaigns,
  listAdSets,
  listAds,
  getAdInsightsDaily,
} from "@/lib/meta/client";

function toDateStr(d: Date) {
  return d.toISOString().slice(0, 10);
}

export interface MetaSyncResult {
  success: boolean;
  campaigns: number;
  adsets: number;
  ads: number;
  insights: number;
  errors: string[];
}

export async function runMetaSync(): Promise<MetaSyncResult> {
  const creds = loadMetaCreds();
  if (!creds) {
    return {
      success: false,
      campaigns: 0,
      adsets: 0,
      ads: 0,
      insights: 0,
      errors: ["META credentials not configured"],
    };
  }

  const admin = createAdminClient();
  const errors: string[] = [];
  let nCamp = 0, nAdset = 0, nAd = 0, nInsight = 0;

  const until = new Date();
  const since = new Date();
  since.setDate(since.getDate() - 6);

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
      else nCamp += 1;
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
      else nAdset += 1;
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
      else nAd += 1;
    }

    const insights = await getAdInsightsDaily(creds, toDateStr(since), toDateStr(until));
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
      else nInsight += 1;
    }
  } catch (e) {
    errors.push(e instanceof Error ? e.message : String(e));
  }

  return {
    success: true,
    campaigns: nCamp,
    adsets: nAdset,
    ads: nAd,
    insights: nInsight,
    errors,
  };
}
