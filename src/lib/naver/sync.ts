import { createAdminClient } from "@/lib/supabase/admin";
import {
  loadNaverAccounts,
  listCampaigns,
  getCampaignDailyStats,
} from "@/lib/naver/client";

function toDateStr(d: Date) {
  return d.toISOString().slice(0, 10);
}

export interface NaverSyncResult {
  success: boolean;
  accounts: Array<{
    account: string;
    campaigns_upserted: number;
    stats_rows: number;
    errors: string[];
  }>;
}

export async function runNaverSync(): Promise<NaverSyncResult> {
  const admin = createAdminClient();
  const accounts = loadNaverAccounts();
  const out: NaverSyncResult["accounts"] = [];

  const until = new Date();
  const since = new Date();
  since.setDate(since.getDate() - 6);
  const sinceStr = toDateStr(since);
  const untilStr = toDateStr(until);

  for (const acc of accounts) {
    const accReport = {
      account: acc.key,
      campaigns_upserted: 0,
      stats_rows: 0,
      errors: [] as string[],
    };

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
        if (error) accReport.errors.push(`upsert ${c.nccCampaignId}: ${error.message}`);
        else accReport.campaigns_upserted += 1;
      }

      const { data: whitelisted } = await admin
        .from("naver_campaigns")
        .select("campaign_id")
        .eq("account_key", acc.key)
        .eq("is_whitelisted", true);

      const ids = (whitelisted ?? []).map((r) => r.campaign_id as string);

      for (const campaignId of ids) {
        try {
          const rows = await getCampaignDailyStats(acc.creds, campaignId, sinceStr, untilStr);
          for (const row of rows) {
            const { error } = await admin.from("naver_ad_stats").upsert(
              {
                campaign_id: row.campaignId,
                date: row.date,
                impressions: row.impCnt,
                clicks: row.clkCnt,
                cost: row.salesAmt,
                conversions: row.ccnt,
                conv_value: row.convAmt,
                ctr: row.ctr ?? null,
                cpc: row.cpc ?? null,
                avg_rank: row.avgRnk ?? null,
                synced_at: new Date().toISOString(),
              },
              { onConflict: "campaign_id,date" }
            );
            if (error)
              accReport.errors.push(`stats ${row.campaignId}/${row.date}: ${error.message}`);
            else accReport.stats_rows += 1;
          }
        } catch (e) {
          accReport.errors.push(
            `stats ${campaignId}: ${e instanceof Error ? e.message : String(e)}`
          );
        }
      }

      if (ids.length > 0) {
        await admin
          .from("naver_campaigns")
          .update({ last_synced_at: new Date().toISOString() })
          .in("campaign_id", ids);
      }
    } catch (err) {
      accReport.errors.push(err instanceof Error ? err.message : String(err));
    }

    out.push(accReport);
  }

  return { success: true, accounts: out };
}
