import { createAdminClient } from "@/lib/supabase/admin";
import {
  loadApiWebCounts,
  webCountFor,
  effectiveWebCount,
  API_MEDIA,
} from "@/lib/report/inquiry-sources";

const MEDIA_LABEL: Record<
  string,
  { icon: string; name: string; hasApi: boolean; hasPhone: boolean }
> = {
  naver_web: { icon: "🟢", name: "네이버 웹", hasApi: true, hasPhone: true },
  naver_landing: {
    icon: "🟢",
    name: "네이버 랜딩",
    hasApi: true,
    hasPhone: true,
  },
  meta: { icon: "🔵", name: "메타", hasApi: true, hasPhone: false },
  google: { icon: "🔴", name: "구글", hasApi: false, hasPhone: false },
  danggeun: { icon: "🟠", name: "당근", hasApi: false, hasPhone: true },
};
const ORDER = ["naver_web", "naver_landing", "meta", "google", "danggeun"];

function fmt(n: number) {
  return n.toLocaleString("ko-KR");
}
function won(n: number) {
  return "₩" + Math.round(n).toLocaleString("ko-KR");
}

function kstYesterday(): { iso: string; label: string } {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 3600 * 1000);
  kst.setUTCDate(kst.getUTCDate() - 1);
  const iso = kst.toISOString().slice(0, 10);
  const day = ["일", "월", "화", "수", "목", "금", "토"][kst.getUTCDay()];
  const label = `${iso} (${day})`;
  return { iso, label };
}

export interface DailyAggregate {
  dateIso: string;
  hasCallData: boolean;
  body: string;
}

export async function buildDailyReport(): Promise<DailyAggregate> {
  const admin = createAdminClient();
  const { iso: dateIso, label: dateLabel } = kstYesterday();

  // 7일 평균용 시작일 (어제 포함 7일: 어제, -1, ... , -6)
  const weekAgo = new Date(dateIso);
  weekAgo.setDate(weekAgo.getDate() - 6);
  const weekAgoIso = weekAgo.toISOString().slice(0, 10);

  const [
    { data: callsToday },
    { data: callsWeek },
    { data: spendToday },
    { data: naverStatsSpend },
    { data: naverCamps },
    { data: metaStatsSpend },
  ] = await Promise.all([
    admin.from("call_reports").select("*").eq("date", dateIso),
    admin
      .from("call_reports")
      .select("date, total_count")
      .gte("date", weekAgoIso)
      .lte("date", dateIso),
    admin.from("ad_spend").select("*").eq("date", dateIso),
    admin
      .from("naver_ad_stats")
      .select("date, cost, clicks, campaign_id")
      .eq("date", dateIso),
    admin
      .from("naver_campaigns")
      .select("campaign_id, media_channel")
      .eq("is_whitelisted", true),
    admin.from("meta_ad_stats").select("date, spend, clicks").eq("date", dateIso),
  ]);

  const callRows = (callsToday ?? []) as Array<{
    media: string;
    phone_count: number;
    manual_web_count: number;
    export_count: number | null;
    used_car_count: number | null;
    scrap_count: number;
    absence_count: number;
    invalid_count: number;
  }>;
  const hasCallData = callRows.length > 0;

  // API 웹문의 수 (naver ccnt + meta lead)
  const apiWebMap = await loadApiWebCounts(admin, dateIso, dateIso);

  // 매체별 버킷
  type Bucket = {
    phone: number;
    web: number;
    clicks: number; // 광고 클릭 수
    total: number;
    validExport: number;
    validUsedCar: number;
    validScrap: number;
    valid: number;
    invalid: number;
    absence: number;
    spend: number;
  };
  const bucket = new Map<string, Bucket>();
  const get = (media: string): Bucket => {
    let b = bucket.get(media);
    if (!b) {
      b = {
        phone: 0,
        web: 0,
        clicks: 0,
        total: 0,
        validExport: 0,
        validUsedCar: 0,
        validScrap: 0,
        valid: 0,
        invalid: 0,
        absence: 0,
        spend: 0,
      };
      bucket.set(media, b);
    }
    return b;
  };

  for (const c of callRows) {
    const b = get(c.media);
    b.phone += c.phone_count ?? 0;
    b.web += effectiveWebCount(c.media, apiWebMap, dateIso, c.manual_web_count ?? 0);
    b.validExport += c.export_count ?? 0;
    b.validUsedCar += c.used_car_count ?? 0;
    b.validScrap += c.scrap_count;
    b.valid += (c.export_count ?? 0) + (c.used_car_count ?? 0) + c.scrap_count;
    b.invalid += c.invalid_count;
    b.absence += c.absence_count;
  }

  // call_reports 행이 없는 매체라도 API만 존재할 수 있음 — meta, naver_* 채우기
  for (const media of ORDER) {
    if (API_MEDIA.has(media)) {
      const b = get(media);
      const api = webCountFor(apiWebMap, dateIso, media);
      if (!callRows.some((c) => c.media === media)) {
        b.web = api;
      }
    }
  }

  // total 재계산: 기본 phone+web, 단 분류 합이 더 크면 레거시 데이터로 간주하고 분류 합을 채택
  for (const b of bucket.values()) {
    const classified = b.valid + b.invalid + b.absence;
    const newModel = b.phone + b.web;
    b.total = Math.max(newModel, classified);
  }

  // 수동 광고비
  for (const s of (spendToday ?? []) as Array<{ media: string; amount: number }>) {
    get(s.media).spend += Number(s.amount);
  }

  // 네이버 자동 광고비 + 클릭수 (매체채널별)
  const naverChannelMap = new Map<string, "naver_web" | "naver_landing">(
    ((naverCamps ?? []) as Array<{
      campaign_id: string;
      media_channel: "naver_web" | "naver_landing";
    }>).map((r) => [r.campaign_id, r.media_channel])
  );
  const naverAutoSpend = new Map<string, number>();
  const naverAutoClicks = new Map<string, number>();
  for (const r of (naverStatsSpend ?? []) as Array<{
    campaign_id: string;
    cost: number | string;
    clicks: number | string;
  }>) {
    const ch = naverChannelMap.get(r.campaign_id);
    if (!ch) continue;
    naverAutoSpend.set(ch, (naverAutoSpend.get(ch) ?? 0) + Number(r.cost ?? 0));
    naverAutoClicks.set(ch, (naverAutoClicks.get(ch) ?? 0) + Number(r.clicks ?? 0));
  }
  for (const [ch, amt] of naverAutoSpend) {
    const b = get(ch);
    b.spend = amt; // API 자동값 우선
    b.clicks = naverAutoClicks.get(ch) ?? 0;
  }

  // 메타 자동 광고비 + 클릭수
  const metaRows = (metaStatsSpend ?? []) as Array<{
    spend: number | string;
    clicks: number | string;
  }>;
  const metaAuto = { spend: 0, clicks: 0 };
  for (const r of metaRows) {
    metaAuto.spend += Number(r.spend ?? 0);
    metaAuto.clicks += Number(r.clicks ?? 0);
  }
  if (metaAuto.spend > 0 || metaAuto.clicks > 0) {
    const b = get("meta");
    b.spend = metaAuto.spend;
    b.clicks = metaAuto.clicks;
  }

  // 총계
  let totCalls = 0,
    totValid = 0,
    totExport = 0,
    totUsedCar = 0,
    totScrap = 0,
    totAbsence = 0,
    totInvalid = 0,
    totSpend = 0;
  for (const b of bucket.values()) {
    totCalls += b.total;
    totValid += b.valid;
    totExport += b.validExport;
    totUsedCar += b.validUsedCar;
    totScrap += b.validScrap;
    totAbsence += b.absence;
    totInvalid += b.invalid;
    totSpend += b.spend;
  }
  const cpaAll = totCalls > 0 ? Math.round(totSpend / totCalls) : 0;
  const cpaValid = totValid > 0 ? Math.round(totSpend / totValid) : 0;

  // 7일 평균 문의량 (어제 포함)
  const weekByDate = new Map<string, number>();
  for (const r of (callsWeek ?? []) as Array<{ date: string; total_count: number }>) {
    weekByDate.set(r.date, (weekByDate.get(r.date) ?? 0) + (r.total_count ?? 0));
  }
  const weekAvgCalls =
    weekByDate.size > 0
      ? Math.round(
          Array.from(weekByDate.values()).reduce((s, v) => s + v, 0) /
            weekByDate.size
        )
      : 0;

  // 본문
  const lines: string[] = [];
  lines.push("━━━━━━━━━━━━━━━━");
  lines.push("📊 GNA 수출마케팅 일일 리포트");
  lines.push(`📅 ${dateLabel}`);
  lines.push("━━━━━━━━━━━━━━━━");
  lines.push("");
  lines.push("📞  문의량");
  lines.push("");
  lines.push(
    `  총 ${fmt(totCalls)}건${weekAvgCalls > 0 ? ` (지난 7일 평균 ${fmt(weekAvgCalls)}건)` : ""}`
  );
  lines.push("");
  lines.push(`  ✅ 유효 ${fmt(totValid)}건`);
  lines.push(`     ├ 수출 ${fmt(totExport)}`);
  lines.push(`     ├ 매입 ${fmt(totUsedCar)}`);
  lines.push(`     └ 폐차 ${fmt(totScrap)}`);
  lines.push("");
  lines.push(`  ⏸ 부재 ${fmt(totAbsence)}건 (미정)`);
  lines.push(`  ❌ 무효 ${fmt(totInvalid)}건`);
  lines.push("");
  lines.push("━━━━━━━━━━━━━━━━");
  lines.push("");
  lines.push("💰  지출 · 단가");
  lines.push("");
  lines.push(`  총 소진액    ${won(totSpend)}`);
  lines.push(
    `  전체 단가    ${totCalls > 0 ? won(cpaAll) : "-"}  (${fmt(totCalls)}건)`
  );
  lines.push(
    `  유효 단가    ${totValid > 0 ? won(cpaValid) : "-"}  (${fmt(totValid)}건)  ⭐`
  );
  lines.push("");
  lines.push("━━━━━━━━━━━━━━━━");
  lines.push("");
  lines.push("📈  매체별 실적");
  lines.push("");

  for (const media of ORDER) {
    const b = bucket.get(media);
    if (!b) continue;
    if (b.total === 0 && b.spend === 0 && b.clicks === 0) continue;
    const meta = MEDIA_LABEL[media];
    lines.push(`${meta.icon} ${meta.name}`);
    // 클릭수 (API 매체만)
    if (meta.hasApi) {
      lines.push(`   클릭수 ${fmt(b.clicks)}`);
    }
    // 문의 상세
    if (meta.hasPhone) {
      lines.push(`   전화 ${fmt(b.phone)} · 웹문의 ${fmt(b.web)}`);
    } else {
      lines.push(`   웹문의 ${fmt(b.web)}`);
    }
    lines.push(`   총 문의 ${fmt(b.total)}`);
    lines.push(
      `   유효 ${fmt(b.valid)} (수출 ${fmt(b.validExport)} / 매입 ${fmt(b.validUsedCar)} / 폐차 ${fmt(b.validScrap)})`
    );
    if (b.invalid + b.absence > 0) {
      lines.push(`   무효 ${fmt(b.invalid)} · 부재 ${fmt(b.absence)}`);
    }
    lines.push(`   소진 ${won(b.spend)}`);
    const cpaV = b.valid > 0 ? Math.round(b.spend / b.valid) : 0;
    lines.push(`   유효 단가 ${b.valid > 0 ? won(cpaV) : "-"}`);
    if (meta.hasApi && b.clicks > 0 && b.total > 0) {
      const rate = (b.total / b.clicks) * 100;
      lines.push(`   클릭→문의 전환율 ${rate.toFixed(1)}%`);
    }
    lines.push("");
  }

  lines.push("━━━━━━━━━━━━━━━━");
  lines.push("🔗 export-marketing.vercel.app");

  return {
    dateIso,
    hasCallData,
    body: lines.join("\n"),
  };
}

export async function sendTelegram(body: string): Promise<number | null> {
  const token = process.env.TELEGRAM_REPORT_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_REPORT_CHAT_ID;
  if (!token || !chatId) throw new Error("TELEGRAM_REPORT_* 환경변수 미설정");
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text: body }),
  });
  const data = (await res.json()) as {
    ok: boolean;
    result?: { message_id: number };
    description?: string;
  };
  if (!data.ok) throw new Error(`Telegram sendMessage 실패: ${data.description}`);
  return data.result?.message_id ?? null;
}

export function isInWindowKST(): boolean {
  const now = new Date();
  const kstMinutes = (now.getUTCHours() + 9) * 60 + now.getUTCMinutes();
  return kstMinutes >= 9 * 60 + 30 && kstMinutes < 12 * 60;
}
