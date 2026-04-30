import { createAdminClient } from "@/lib/supabase/admin";
import {
  loadDaangnCreds,
  getAdPerformance,
  DAANGN_TARGET_MEDIA_ID,
} from "@/lib/daangn/client";

function toDateStr(d: Date) {
  return d.toISOString().slice(0, 10);
}

export interface DaangnSyncResult {
  success: boolean;
  rows_upserted: number;
  errors: string[];
}

export async function runDaangnSync(): Promise<DaangnSyncResult> {
  const creds = loadDaangnCreds();
  if (!creds) {
    return {
      success: false,
      rows_upserted: 0,
      errors: ["DAANGN_API_KEY 미설정"],
    };
  }

  const errors: string[] = [];
  let rowsUpserted = 0;

  // 최근 7일 데이터 조회
  const until = new Date();
  const since = new Date();
  since.setDate(since.getDate() - 6);

  try {
    const rows = await getAdPerformance(creds, toDateStr(since), toDateStr(until));
    const admin = createAdminClient();

    // 투바이어(795) 매체만 사용
    const filtered = rows.filter((r) => r.media_id === DAANGN_TARGET_MEDIA_ID);

    for (const row of filtered) {
      const breakdown = row.conversion_breakdown ?? {};
      const { error } = await admin.from("daangn_ad_stats").upsert(
        {
          date: row.date,
          media_id: row.media_id,
          media_name: row.media_name,
          campaign_id: row.campaign_id,
          impressions: row.impressions ?? 0,
          clicks: row.clicks ?? 0,
          cost: row.cost ?? 0,
          conversions: row.conversions ?? 0,
          chat_inquiry: Number(breakdown.chat_inquiry ?? 0),
          phone_inquiry: Number(breakdown.phone_inquiry ?? 0),
          service_request: Number(breakdown.service_request ?? 0),
          ctr: row.ctr ?? null,
          cpc: row.cpc ?? null,
          cpa: row.cpa ?? null,
          source: row.source,
          synced_at: new Date().toISOString(),
        },
        { onConflict: "date,media_id" }
      );
      if (error) {
        errors.push(`${row.date}/${row.media_id}: ${error.message}`);
      } else {
        rowsUpserted += 1;
      }
    }
  } catch (e) {
    errors.push(e instanceof Error ? e.message : String(e));
  }

  return { success: errors.length === 0, rows_upserted: rowsUpserted, errors };
}
