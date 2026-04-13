import type { SupabaseClient } from "@supabase/supabase-js";

// API 자동 집계 가능한 매체
export const API_MEDIA = new Set(["naver_web", "naver_landing", "meta"]);

// 메타 전환 이벤트 후보 — 우선순위 순
// 랜딩연결 광고는 Purchase 이벤트로 "문의"를 추적하고 있어 lead 외에도 purchase 포함
const META_LEAD_ACTION_TYPES = [
  "lead",
  "onsite_conversion.lead_grouped",
  "offsite_conversion.custom.lead",
  "purchase",
  "offsite_conversion.fb_pixel_purchase",
  "offsite_conversion.fb_pixel_lead",
];

function extractMetaLeadCount(
  conversions: Array<{ action_type: string; value: string }> | null | undefined
): number {
  if (!conversions) return 0;
  for (const candidate of META_LEAD_ACTION_TYPES) {
    const hit = conversions.find((a) => a.action_type === candidate);
    if (hit) return Number(hit.value ?? 0);
  }
  return 0;
}

/**
 * (date, media) 키로 API 자동 웹문의 수 반환.
 * - naver_web / naver_landing: whitelisted 캠페인의 naver_ad_stats.conversions 합
 * - meta: meta_ad_stats.conversions → lead 이벤트 합
 * - 그 외: 0
 */
export async function loadApiWebCounts(
  admin: SupabaseClient,
  startDate: string,
  endDate: string
): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  const addTo = (date: string, media: string, n: number) => {
    const key = `${date}|${media}`;
    out.set(key, (out.get(key) ?? 0) + n);
  };

  const [{ data: naverStats }, { data: naverCamps }] = await Promise.all([
    admin
      .from("naver_ad_stats")
      .select("date, conversions, campaign_id")
      .gte("date", startDate)
      .lte("date", endDate),
    admin
      .from("naver_campaigns")
      .select("campaign_id, media_channel")
      .eq("is_whitelisted", true),
  ]);
  const channelMap = new Map<string, "naver_web" | "naver_landing">(
    ((naverCamps ?? []) as Array<{
      campaign_id: string;
      media_channel: "naver_web" | "naver_landing";
    }>).map((r) => [r.campaign_id, r.media_channel])
  );
  for (const r of (naverStats ?? []) as Array<{
    date: string;
    conversions: number | string;
    campaign_id: string;
  }>) {
    const ch = channelMap.get(r.campaign_id);
    if (!ch) continue;
    addTo(r.date, ch, Number(r.conversions ?? 0));
  }

  const { data: metaStats } = await admin
    .from("meta_ad_stats")
    .select("date, conversions")
    .gte("date", startDate)
    .lte("date", endDate);
  for (const r of (metaStats ?? []) as Array<{
    date: string;
    conversions: Array<{ action_type: string; value: string }> | null;
  }>) {
    addTo(r.date, "meta", extractMetaLeadCount(r.conversions));
  }

  return out;
}

export function webCountFor(
  map: Map<string, number>,
  date: string,
  media: string
): number {
  return map.get(`${date}|${media}`) ?? 0;
}

/**
 * 매체별 유효 웹문의 수 계산.
 * 우선순위: manual_web_count(>0) → API 값 → 0
 * manual_web_count가 0이 아니면 override로 간주 (레거시 데이터 / 수기 보정 대응).
 */
export function effectiveWebCount(
  media: string,
  apiWebMap: Map<string, number>,
  date: string,
  manualWebCount: number
): number {
  if (manualWebCount > 0) return manualWebCount;
  if (API_MEDIA.has(media)) return webCountFor(apiWebMap, date, media);
  return 0;
}
