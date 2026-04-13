import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadNaverAccounts, listCampaigns, getStats } from "@/lib/naver/client";

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

  const admin = createAdminClient();
  const accounts = loadNaverAccounts();
  const result: Record<string, unknown> = { accounts: [] };

  // 최근 7일치 동기화 (당일 집계는 계속 갱신되므로 재수집 필요)
  const until = new Date();
  const since = new Date();
  since.setDate(since.getDate() - 6);
  const untilStr = toDateStr(until);
  const sinceStr = toDateStr(since);

  for (const acc of accounts) {
    const accReport: {
      account: string;
      campaigns_upserted: number;
      stats_rows: number;
      errors: string[];
    } = {
      account: acc.key,
      campaigns_upserted: 0,
      stats_rows: 0,
      errors: [],
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
      if (ids.length === 0) {
        result.accounts = [...(result.accounts as unknown[]), accReport];
        continue;
      }

      const batchSize = 30;
      for (let i = 0; i < ids.length; i += batchSize) {
        const batch = ids.slice(i, i + batchSize);
        const rows = await getStats(acc.creds, batch, sinceStr, untilStr);
        for (const row of rows) {
          // row.id 는 캠페인 ID, 반환 스키마에 따라 date 필드 포함 — 응답 구조가 다를 수 있어 raw 필드로 안전 처리
          const anyRow = row as unknown as Record<string, unknown>;
          const date =
            (anyRow.date as string) ||
            (anyRow.statDt as string) ||
            untilStr;
          const impressions = Number(anyRow.impCnt ?? 0);
          const clicks = Number(anyRow.clkCnt ?? 0);
          const cost = Number(anyRow.salesAmt ?? 0);
          const conversions = Number(anyRow.ccnt ?? 0);
          const convValue = Number(anyRow.convAmt ?? 0);

          const { error } = await admin.from("naver_ad_stats").upsert(
            {
              campaign_id: row.id,
              date,
              impressions,
              clicks,
              cost,
              conversions,
              conv_value: convValue,
              ctr: row.ctr ?? null,
              cpc: row.cpc ?? null,
              avg_rank: row.avgRnk ?? null,
              synced_at: new Date().toISOString(),
            },
            { onConflict: "campaign_id,date" }
          );
          if (error) accReport.errors.push(`stats ${row.id}/${date}: ${error.message}`);
          else accReport.stats_rows += 1;
        }
      }

      await admin
        .from("naver_campaigns")
        .update({ last_synced_at: new Date().toISOString() })
        .in("campaign_id", ids);
    } catch (err) {
      accReport.errors.push(err instanceof Error ? err.message : String(err));
    }

    result.accounts = [...(result.accounts as unknown[]), accReport];
  }

  return NextResponse.json({ success: true, ...result });
}
