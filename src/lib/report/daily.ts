import { createAdminClient } from "@/lib/supabase/admin";

const MEDIA_LABEL: Record<string, { icon: string; name: string; hasApi: boolean }> = {
  naver_web: { icon: "🟢", name: "네이버 웹", hasApi: true },
  naver_landing: { icon: "🟢", name: "네이버 랜딩", hasApi: true },
  meta: { icon: "🔵", name: "메타", hasApi: true },
  google: { icon: "🔴", name: "구글", hasApi: false },
  danggeun: { icon: "🟠", name: "당근", hasApi: false },
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

  // 7일 평균용 시작일
  const weekAgo = new Date(dateIso);
  weekAgo.setDate(weekAgo.getDate() - 6);
  const weekAgoIso = weekAgo.toISOString().slice(0, 10);

  const [
    { data: callsToday },
    { data: callsWeek },
    { data: spendToday },
    { data: naverStats },
    { data: naverWhite },
    { data: metaStats },
  ] = await Promise.all([
    admin.from("call_reports").select("*").eq("date", dateIso),
    admin
      .from("call_reports")
      .select("date, total_count, valid_total, export_count, used_car_count, scrap_count")
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
    total_count: number;
    export_count: number | null;
    used_car_count: number | null;
    scrap_count: number;
    absence_count: number;
    invalid_count: number;
    phone_naver_count: number;
  }>;

  const hasCallData = callRows.length > 0;

  // 매체별 집계
  type Bucket = {
    calls: number;
    validCalls: number; // 수출+매입+폐차
    exportCnt: number;
    usedCarCnt: number;
    scrapCnt: number;
    absenceCnt: number;
    invalidCnt: number;
    spend: number;
    inflow: number; // API 클릭 수
    hasApi: boolean;
  };
  const bucket = new Map<string, Bucket>();
  function get(media: string): Bucket {
    let b = bucket.get(media);
    if (!b) {
      b = {
        calls: 0,
        validCalls: 0,
        exportCnt: 0,
        usedCarCnt: 0,
        scrapCnt: 0,
        absenceCnt: 0,
        invalidCnt: 0,
        spend: 0,
        inflow: 0,
        hasApi: MEDIA_LABEL[media]?.hasApi ?? false,
      };
      bucket.set(media, b);
    }
    return b;
  }

  for (const c of callRows) {
    const b = get(c.media);
    b.calls += c.total_count;
    b.exportCnt += c.export_count ?? 0;
    b.usedCarCnt += c.used_car_count ?? 0;
    b.scrapCnt += c.scrap_count;
    b.absenceCnt += c.absence_count;
    b.invalidCnt += c.invalid_count;
    b.validCalls += (c.export_count ?? 0) + (c.used_car_count ?? 0) + c.scrap_count;
  }

  // 수동 광고비
  for (const s of (spendToday ?? []) as Array<{ media: string; amount: number }>) {
    get(s.media).spend += Number(s.amount);
  }

  // 네이버 자동 (매체채널별 합산, 자동이 있으면 수동 대체)
  const naverChannelMap = new Map<string, "naver_web" | "naver_landing">(
    ((naverWhite ?? []) as Array<{
      campaign_id: string;
      media_channel: "naver_web" | "naver_landing";
    }>).map((r) => [r.campaign_id, r.media_channel])
  );
  const naverAutoSpend = new Map<string, number>();
  const naverAutoClicks = new Map<string, number>();
  for (const r of (naverStats ?? []) as Array<{
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
    b.spend = amt; // 자동값 우선
    b.inflow = naverAutoClicks.get(ch) ?? 0;
  }

  // 메타 자동
  const metaRows = (metaStats ?? []) as Array<{
    spend: number | string;
    clicks: number | string;
  }>;
  const metaAutoSpend: { spend: number; clicks: number } = { spend: 0, clicks: 0 };
  for (const r of metaRows) {
    metaAutoSpend.spend += Number(r.spend ?? 0);
    metaAutoSpend.clicks += Number(r.clicks ?? 0);
  }
  if (metaAutoSpend.spend > 0 || metaAutoSpend.clicks > 0) {
    const b = get("meta");
    b.spend = metaAutoSpend.spend;
    b.inflow = metaAutoSpend.clicks;
  }

  // 총계
  let totalCalls = 0;
  let totalValid = 0;
  let totalExport = 0;
  let totalUsedCar = 0;
  let totalScrap = 0;
  let totalAbsence = 0;
  let totalInvalid = 0;
  let totalSpend = 0;
  for (const b of bucket.values()) {
    totalCalls += b.calls;
    totalValid += b.validCalls;
    totalExport += b.exportCnt;
    totalUsedCar += b.usedCarCnt;
    totalScrap += b.scrapCnt;
    totalAbsence += b.absenceCnt;
    totalInvalid += b.invalidCnt;
    totalSpend += b.spend;
  }

  const cpaAll = totalCalls > 0 ? Math.round(totalSpend / totalCalls) : 0;
  const cpaValid = totalValid > 0 ? Math.round(totalSpend / totalValid) : 0;

  // 7일 평균 (어제 포함)
  const weekRows = (callsWeek ?? []) as Array<{
    date: string;
    total_count: number;
    export_count: number | null;
    used_car_count: number | null;
    scrap_count: number;
  }>;
  const weekByDate = new Map<
    string,
    { calls: number; validCalls: number }
  >();
  for (const r of weekRows) {
    const cur = weekByDate.get(r.date) ?? { calls: 0, validCalls: 0 };
    cur.calls += r.total_count;
    cur.validCalls +=
      (r.export_count ?? 0) + (r.used_car_count ?? 0) + r.scrap_count;
    weekByDate.set(r.date, cur);
  }
  const weekCallsAvg =
    weekByDate.size > 0
      ? Math.round(
          Array.from(weekByDate.values()).reduce((s, v) => s + v.calls, 0) /
            weekByDate.size
        )
      : 0;

  // 본문 조립
  const lines: string[] = [];
  lines.push("━━━━━━━━━━━━━━━━");
  lines.push("📊 GNA 수출마케팅 일일 리포트");
  lines.push(`📅 ${dateLabel}`);
  lines.push("━━━━━━━━━━━━━━━━");
  lines.push("");
  lines.push("📞  콜량");
  lines.push("");
  const callsCmp = weekCallsAvg > 0 ? ` (7일 평균 ${weekCallsAvg})` : "";
  lines.push(`  총 ${fmt(totalCalls)}건${callsCmp}`);
  lines.push("");
  lines.push(`  ✅ 유효 ${fmt(totalValid)}건`);
  lines.push(`     ├ 수출 ${fmt(totalExport)}`);
  lines.push(`     ├ 매입 ${fmt(totalUsedCar)}`);
  lines.push(`     └ 폐차 ${fmt(totalScrap)}`);
  lines.push("");
  lines.push(`  ⏸ 부재 ${fmt(totalAbsence)}건 (미정)`);
  lines.push(`  ❌ 무효 ${fmt(totalInvalid)}건`);
  lines.push("");
  lines.push("━━━━━━━━━━━━━━━━");
  lines.push("");
  lines.push("💰  지출 · 단가");
  lines.push("");
  lines.push(`  총 소진액    ${won(totalSpend)}`);
  lines.push(`  전체 단가    ${totalCalls > 0 ? won(cpaAll) : "-"}`);
  lines.push(`  유효 단가    ${totalValid > 0 ? won(cpaValid) : "-"}  ⭐`);
  lines.push("");
  lines.push("━━━━━━━━━━━━━━━━");
  lines.push("");
  lines.push("📈  매체별 실적");
  lines.push("");

  for (const media of ORDER) {
    const b = bucket.get(media);
    if (!b) continue;
    if (b.calls === 0 && b.spend === 0 && b.inflow === 0) continue;
    const meta = MEDIA_LABEL[media];
    lines.push(`${meta.icon} ${meta.name}`);
    if (b.hasApi) {
      lines.push(`   유입 ${fmt(b.inflow)} · 전화 ${fmt(b.calls)}`);
    } else {
      lines.push(`   전화 ${fmt(b.calls)}`);
    }
    lines.push(
      `   유효전화 ${fmt(b.validCalls)} (수출 ${fmt(b.exportCnt)} / 매입 ${fmt(b.usedCarCnt)} / 폐차 ${fmt(b.scrapCnt)})`
    );
    lines.push(`   소진 ${won(b.spend)}`);
    const cpaV = b.validCalls > 0 ? Math.round(b.spend / b.validCalls) : 0;
    lines.push(`   유효전화 단가 ${b.validCalls > 0 ? won(cpaV) : "-"}`);
    if (b.hasApi && b.inflow > 0) {
      const rate = (b.calls / b.inflow) * 100;
      lines.push(`   방문→전화 전환율 ${rate.toFixed(1)}%`);
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
  const kstMinutes =
    (now.getUTCHours() + 9) * 60 + now.getUTCMinutes();
  // 09:30 ~ 12:00 KST = 570 ~ 720
  return kstMinutes >= 9 * 60 + 30 && kstMinutes < 12 * 60;
}
