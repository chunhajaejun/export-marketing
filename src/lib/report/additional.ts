import { createAdminClient } from "@/lib/supabase/admin";
import { loadApiWebCounts, effectiveWebCount } from "@/lib/report/inquiry-sources";

function fmt(n: number) {
  return n.toLocaleString("ko-KR");
}
function won(n: number) {
  return "₩" + Math.round(n).toLocaleString("ko-KR");
}
function pct(n: number, digits = 1) {
  return n.toFixed(digits) + "%";
}

function formatLabel(dateIso: string): string {
  const d = new Date(dateIso + "T00:00:00Z");
  const day = ["일", "월", "화", "수", "목", "금", "토"][d.getUTCDay()];
  return `${dateIso} (${day})`;
}

function prevDayIso(dateIso: string): string {
  const d = new Date(dateIso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

function deltaArrow(cur: number, prev: number): { sign: string; pct: string } {
  if (prev === 0) return { sign: cur > 0 ? "▲" : "─", pct: cur > 0 ? "신규" : "-" };
  const diff = ((cur - prev) / prev) * 100;
  if (Math.abs(diff) < 0.5) return { sign: "─", pct: "±0%" };
  const sign = diff > 0 ? "▲" : "▼";
  return { sign, pct: `${diff > 0 ? "+" : ""}${diff.toFixed(1)}%` };
}

interface DayAggregate {
  totCalls: number;
  totValid: number;
  totSpend: number;
  cpaValid: number;
}

async function aggregateForDate(
  admin: ReturnType<typeof createAdminClient>,
  dateIso: string
): Promise<DayAggregate> {
  const [
    { data: calls },
    { data: spendRows },
    { data: naverSpend },
    { data: naverCamps },
    { data: metaSpend },
  ] = await Promise.all([
    admin.from("call_reports").select("*").eq("date", dateIso),
    admin.from("ad_spend").select("amount, media").eq("date", dateIso),
    admin
      .from("naver_ad_stats")
      .select("cost, campaign_id")
      .eq("date", dateIso),
    admin
      .from("naver_campaigns")
      .select("campaign_id, media_channel")
      .eq("is_whitelisted", true),
    admin.from("meta_ad_stats").select("spend").eq("date", dateIso),
  ]);

  const apiWebMap = await loadApiWebCounts(admin, dateIso, dateIso);

  let totCalls = 0;
  let totValid = 0;
  for (const c of (calls ?? []) as Array<{
    media: string;
    phone_count: number;
    manual_web_count: number;
    export_count: number | null;
    used_car_count: number | null;
    scrap_count: number;
    absence_count: number;
    invalid_count: number;
  }>) {
    const phone = c.phone_count ?? 0;
    const web = effectiveWebCount(
      c.media,
      apiWebMap,
      dateIso,
      c.manual_web_count ?? 0
    );
    const newTotal = phone + web;
    const classified =
      (c.export_count ?? 0) +
      (c.used_car_count ?? 0) +
      c.scrap_count +
      c.absence_count +
      c.invalid_count;
    totCalls += Math.max(newTotal, classified);
    totValid +=
      (c.export_count ?? 0) + (c.used_car_count ?? 0) + c.scrap_count;
  }

  // 수동 광고비
  let totSpend = 0;
  const manualSpendByMedia = new Map<string, number>();
  for (const s of (spendRows ?? []) as Array<{ media: string; amount: number }>) {
    manualSpendByMedia.set(s.media, (manualSpendByMedia.get(s.media) ?? 0) + Number(s.amount));
  }
  // 네이버 자동 (API 우선)
  const channelMap = new Map<string, "naver_web" | "naver_landing">(
    ((naverCamps ?? []) as Array<{
      campaign_id: string;
      media_channel: "naver_web" | "naver_landing";
    }>).map((r) => [r.campaign_id, r.media_channel])
  );
  const naverAuto = new Map<string, number>();
  for (const r of (naverSpend ?? []) as Array<{
    campaign_id: string;
    cost: number | string;
  }>) {
    const ch = channelMap.get(r.campaign_id);
    if (!ch) continue;
    naverAuto.set(ch, (naverAuto.get(ch) ?? 0) + Number(r.cost ?? 0));
  }
  for (const [ch, amt] of naverAuto) {
    manualSpendByMedia.set(ch, amt); // 자동 우선 (수동 덮어씀)
  }
  // 메타 자동
  let metaSpendTotal = 0;
  for (const r of (metaSpend ?? []) as Array<{ spend: number | string }>) {
    metaSpendTotal += Number(r.spend ?? 0);
  }
  if (metaSpendTotal > 0) manualSpendByMedia.set("meta", metaSpendTotal);

  for (const amt of manualSpendByMedia.values()) totSpend += amt;

  const cpaValid = totValid > 0 ? Math.round(totSpend / totValid) : 0;
  return { totCalls, totValid, totSpend, cpaValid };
}

export async function buildChangeSummary(dateIso: string): Promise<string> {
  const admin = createAdminClient();
  const prev = prevDayIso(dateIso);
  const [cur, pre] = await Promise.all([
    aggregateForDate(admin, dateIso),
    aggregateForDate(admin, prev),
  ]);

  const callsD = deltaArrow(cur.totCalls, pre.totCalls);
  const validD = deltaArrow(cur.totValid, pre.totValid);
  const spendD = deltaArrow(cur.totSpend, pre.totSpend);
  const cpaD = deltaArrow(cur.cpaValid, pre.cpaValid);

  const curValidRate =
    cur.totCalls > 0 ? (cur.totValid / cur.totCalls) * 100 : 0;
  const preValidRate =
    pre.totCalls > 0 ? (pre.totValid / pre.totCalls) * 100 : 0;
  const vrD = deltaArrow(curValidRate, preValidRate);

  const cpaAlert = cpaD.sign === "▲"; // 단가는 오르면 악화

  const lines: string[] = [];
  lines.push("━━━━━━━━━━━━━━━━");
  lines.push("📈 (주)투바이어 변화 요약");
  lines.push(`📅 ${formatLabel(dateIso)}`);
  lines.push("━━━━━━━━━━━━━━━━");
  lines.push("");
  lines.push("📊 전일 대비");
  lines.push("");
  lines.push(`  총 문의   ${fmt(cur.totCalls)}건  ${callsD.sign} ${callsD.pct}`);
  lines.push(`  유효     ${fmt(cur.totValid)}건  ${validD.sign} ${validD.pct}`);
  lines.push(`  소진     ${won(cur.totSpend)}  ${spendD.sign} ${spendD.pct}`);
  lines.push(
    `  유효 단가 ${cur.cpaValid > 0 ? won(cur.cpaValid) : "-"}  ${cpaD.sign} ${cpaD.pct}${cpaAlert ? " ⚠️ 악화" : ""}`
  );
  lines.push("");
  lines.push("✅ 유효율");
  lines.push(
    `  ${pct(curValidRate)} (유효 ${fmt(cur.totValid)} / 총 ${fmt(cur.totCalls)})`
  );
  if (pre.totCalls > 0) {
    lines.push(`  전일 ${pct(preValidRate)} → ${vrD.sign} ${vrD.pct === "±0%" ? "동일" : vrD.pct}`);
  }
  lines.push("");
  lines.push("━━━━━━━━━━━━━━━━");
  return lines.join("\n");
}

interface MetaAdRow {
  ad_id: string;
  name: string;
  impressions: number;
  clicks: number;
  spend: number;
  leads: number;
}

const META_LEAD_TYPES = [
  "lead",
  "onsite_conversion.lead_grouped",
  "offsite_conversion.custom.lead",
  "purchase",
  "offsite_conversion.fb_pixel_purchase",
  "offsite_conversion.fb_pixel_lead",
];

function leadsFromConversions(
  conversions: Array<{ action_type: string; value: string }> | null
): number {
  if (!conversions) return 0;
  for (const t of META_LEAD_TYPES) {
    const hit = conversions.find((a) => a.action_type === t);
    if (hit) return Number(hit.value ?? 0);
  }
  return 0;
}

export async function buildMetaCreativeReport(dateIso: string): Promise<string> {
  const admin = createAdminClient();
  const [{ data: stats }, { data: ads }] = await Promise.all([
    admin
      .from("meta_ad_stats")
      .select("ad_id, impressions, clicks, spend, conversions")
      .eq("date", dateIso),
    admin.from("meta_ads").select("ad_id, name, status"),
  ]);

  const nameMap = new Map<string, string>();
  for (const a of (ads ?? []) as Array<{ ad_id: string; name: string; status: string | null }>) {
    nameMap.set(a.ad_id, a.name);
  }

  const rows: MetaAdRow[] = [];
  for (const s of (stats ?? []) as Array<{
    ad_id: string;
    impressions: number | string;
    clicks: number | string;
    spend: number | string;
    conversions: Array<{ action_type: string; value: string }> | null;
  }>) {
    const imp = Number(s.impressions ?? 0);
    const clk = Number(s.clicks ?? 0);
    const sp = Number(s.spend ?? 0);
    const lead = leadsFromConversions(s.conversions);
    if (imp === 0 && clk === 0 && sp === 0 && lead === 0) continue;
    rows.push({
      ad_id: s.ad_id,
      name: nameMap.get(s.ad_id) ?? s.ad_id,
      impressions: imp,
      clicks: clk,
      spend: sp,
      leads: lead,
    });
  }

  // 평균 리드단가 (리드>0인 광고만 기준)
  const withLead = rows.filter((r) => r.leads > 0);
  const avgCostPerLead =
    withLead.length > 0
      ? withLead.reduce((s, r) => s + r.spend / r.leads, 0) / withLead.length
      : 0;

  rows.sort((a, b) => {
    // 리드>0 먼저 (리드단가 오름차순), 이후 리드=0 (소진 내림차순)
    const aLead = a.leads > 0 ? 1 : 0;
    const bLead = b.leads > 0 ? 1 : 0;
    if (aLead !== bLead) return bLead - aLead;
    if (aLead) {
      return a.spend / a.leads - b.spend / b.leads;
    }
    return b.spend - a.spend;
  });

  const lines: string[] = [];
  lines.push("━━━━━━━━━━━━━━━━");
  lines.push("🔵 메타 소재별 성과");
  lines.push(`📅 ${formatLabel(dateIso)}`);
  lines.push("━━━━━━━━━━━━━━━━");
  lines.push("");

  if (rows.length === 0) {
    lines.push("  (집행 데이터 없음)");
    lines.push("");
    lines.push("━━━━━━━━━━━━━━━━");
    return lines.join("\n");
  }

  rows.forEach((r, idx) => {
    const ctr = r.impressions > 0 ? (r.clicks / r.impressions) * 100 : 0;
    const cvr = r.clicks > 0 ? (r.leads / r.clicks) * 100 : 0;
    const cpl = r.leads > 0 ? Math.round(r.spend / r.leads) : 0;

    let verdict: string;
    let icon: string;
    if (r.leads === 0) {
      icon = idx === rows.length - 1 ? "🚫" : "⚠️";
      verdict = r.spend > avgCostPerLead ? "❌ 교체 강력 권장" : "⚠️ 모니터링";
    } else if (avgCostPerLead > 0 && cpl > avgCostPerLead * 1.5) {
      icon = "🥉";
      verdict = "⚠️ 개선/교체 검토";
    } else if (avgCostPerLead > 0 && cpl <= avgCostPerLead) {
      icon = "🥇";
      verdict = "✅ 유지";
    } else {
      icon = "🥈";
      verdict = "✓ 양호";
    }

    lines.push(`${icon} ${r.name}`);
    lines.push(`   노출 ${fmt(r.impressions)} · 클릭 ${fmt(r.clicks)}`);
    lines.push(`   CTR ${pct(ctr, 2)}  (노출→클릭)`);
    lines.push(`   리드 ${fmt(r.leads)}`);
    lines.push(`   CVR ${r.clicks > 0 ? pct(cvr, 1) : "-"}  (클릭→리드)`);
    lines.push(
      `   리드단가 ${r.leads > 0 ? won(cpl) : "-"} · 소진 ${won(r.spend)}`
    );
    lines.push(`   → ${verdict}`);
    lines.push("");
  });

  lines.push("판정 기준:");
  lines.push("  · 리드단가 ≤ 평균 → 유지");
  lines.push("  · 평균 × 1.5배 초과 → 교체 검토");
  lines.push("  · 리드 0 → 교체 강력 권장");
  lines.push("━━━━━━━━━━━━━━━━");
  return lines.join("\n");
}

export async function buildNaverCampaignReport(dateIso: string): Promise<string> {
  const admin = createAdminClient();
  const [{ data: stats }, { data: camps }] = await Promise.all([
    admin
      .from("naver_ad_stats")
      .select("campaign_id, impressions, clicks, cost, conversions, ctr, cpc, avg_rank")
      .eq("date", dateIso),
    admin
      .from("naver_campaigns")
      .select("campaign_id, name, is_whitelisted, media_channel")
      .eq("is_whitelisted", true),
  ]);

  const whitelistMap = new Map<string, { name: string; channel: string }>();
  for (const c of (camps ?? []) as Array<{
    campaign_id: string;
    name: string;
    media_channel: string;
  }>) {
    whitelistMap.set(c.campaign_id, { name: c.name, channel: c.media_channel });
  }

  const rows = ((stats ?? []) as Array<{
    campaign_id: string;
    impressions: number | string;
    clicks: number | string;
    cost: number | string;
    conversions: number | string;
    ctr: number | string | null;
    avg_rank: number | string | null;
  }>)
    .filter((r) => whitelistMap.has(r.campaign_id))
    .map((r) => {
      const info = whitelistMap.get(r.campaign_id)!;
      return {
        name: info.name,
        channel: info.channel,
        impressions: Number(r.impressions ?? 0),
        clicks: Number(r.clicks ?? 0),
        cost: Number(r.cost ?? 0),
        conv: Number(r.conversions ?? 0),
        ctr: r.ctr !== null ? Number(r.ctr) : null,
        avgRank: r.avg_rank !== null ? Number(r.avg_rank) : null,
      };
    });

  const withConv = rows.filter((r) => r.conv > 0);
  const avgCostPerConv =
    withConv.length > 0
      ? withConv.reduce((s, r) => s + r.cost / r.conv, 0) / withConv.length
      : 0;

  rows.sort((a, b) => {
    const aOk = a.conv > 0 ? 1 : 0;
    const bOk = b.conv > 0 ? 1 : 0;
    if (aOk !== bOk) return bOk - aOk;
    if (aOk) return a.cost / a.conv - b.cost / b.conv;
    return b.cost - a.cost;
  });

  const lines: string[] = [];
  lines.push("━━━━━━━━━━━━━━━━");
  lines.push("🟢 네이버 캠페인별 성과");
  lines.push(`📅 ${formatLabel(dateIso)}`);
  lines.push("━━━━━━━━━━━━━━━━");
  lines.push("");

  if (rows.length === 0) {
    lines.push("  (집행 데이터 없음)");
    lines.push("");
    lines.push("━━━━━━━━━━━━━━━━");
    return lines.join("\n");
  }

  rows.forEach((r, idx) => {
    const cvr = r.clicks > 0 ? (r.conv / r.clicks) * 100 : 0;
    const costPerConv = r.conv > 0 ? Math.round(r.cost / r.conv) : 0;

    let verdict: string;
    let icon: string;
    if (r.conv === 0 && r.cost > 0) {
      icon = idx === rows.length - 1 ? "🚫" : "⚠️";
      verdict = r.cost > avgCostPerConv ? "❌ 일시정지/입찰↓ 검토" : "⚠️ 모니터링";
    } else if (avgCostPerConv > 0 && costPerConv > avgCostPerConv * 1.5) {
      icon = "🥉";
      verdict = "⚠️ 입찰가 조정 검토";
    } else if (avgCostPerConv > 0 && costPerConv <= avgCostPerConv) {
      icon = "🥇";
      verdict = "✅ 유지 (필요시 입찰 ↑)";
    } else if (r.conv > 0) {
      icon = "🥈";
      verdict = "✓ 양호";
    } else {
      icon = "─";
      verdict = "집행 없음";
    }

    lines.push(`${icon} ${r.name}`);
    lines.push(`   노출 ${fmt(r.impressions)} · 클릭 ${fmt(r.clicks)}`);
    lines.push(`   CTR ${r.ctr !== null ? pct(r.ctr, 2) : "-"}`);
    lines.push(`   웹문의 ${fmt(r.conv)}`);
    lines.push(`   CVR ${r.clicks > 0 ? pct(cvr, 1) : "-"}  (클릭→문의)`);
    lines.push(
      `   문의단가 ${r.conv > 0 ? won(costPerConv) : "-"} · 소진 ${won(r.cost)}${r.avgRank !== null ? ` · 평균순위 ${r.avgRank.toFixed(1)}` : ""}`
    );
    lines.push(`   → ${verdict}`);
    lines.push("");
  });

  lines.push("판정 기준:");
  lines.push("  · 문의단가 ≤ 평균 → 유지");
  lines.push("  · 평균 × 1.5배 초과 → 입찰 조정 검토");
  lines.push("  · 집행 있는데 문의 0 → 일시정지/입찰↓ 검토");
  lines.push("━━━━━━━━━━━━━━━━");
  return lines.join("\n");
}
