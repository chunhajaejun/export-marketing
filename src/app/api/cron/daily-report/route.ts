import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  buildDailyReport,
  sendTelegram,
  isInWindowKST,
} from "@/lib/report/daily";
import {
  buildChangeSummary,
  buildMetaCreativeReport,
  buildNaverCampaignReport,
} from "@/lib/report/additional";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function isAuthorized(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  // Cron 외 수동 호출도 허용 (force=1 + admin cookie) — 일단 secret만
  return auth === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const force = req.nextUrl.searchParams.get("force") === "1";
  const preview = req.nextUrl.searchParams.get("preview") === "1";
  const admin = createAdminClient();

  if (!force && !preview && !isInWindowKST()) {
    return NextResponse.json({ skipped: "outside window (09:30–12:00 KST)" });
  }

  const report = await buildDailyReport();
  const [changeBody, metaBody, naverBody] = await Promise.all([
    buildChangeSummary(report.dateIso),
    buildMetaCreativeReport(report.dateIso),
    buildNaverCampaignReport(report.dateIso),
  ]);

  // preview 모드: 그룹 발송/DB 기록 없이 본문만 반환 (배열로 4개)
  if (preview) {
    return NextResponse.json({
      preview: true,
      date: report.dateIso,
      bodies: {
        daily: report.body,
        change: changeBody,
        meta: metaBody,
        naver: naverBody,
      },
    });
  }

  // 이미 발송된 날짜면 스킵
  const { data: existing } = await admin
    .from("daily_report_log")
    .select("report_date, sent_at")
    .eq("report_date", report.dateIso)
    .maybeSingle();
  if (existing && !force) {
    return NextResponse.json({
      skipped: "already sent",
      date: report.dateIso,
      sent_at: existing.sent_at,
    });
  }

  // 발송 조건: 텍스트 입력 경로 + 직접 입력 경로 양쪽 모두 저장된 기록이 있어야 함.
  // (input_source: 'text' / 'direct' / 'both')
  if (!force) {
    const [{ data: sourcesRows }, { data: spendRows }] = await Promise.all([
      admin.from("call_reports").select("input_source").eq("date", report.dateIso),
      admin.from("ad_spend").select("id").eq("date", report.dateIso).limit(1),
    ]);
    const sources = (sourcesRows ?? []).map((r) => r.input_source as string);
    const hasText = sources.some((s) => s === "text" || s === "both");
    const hasDirect = sources.some((s) => s === "direct" || s === "both");
    const hasSpend = (spendRows ?? []).length > 0;
    if (!hasText || !hasDirect || !hasSpend) {
      return NextResponse.json({
        skipped: "awaiting required inputs",
        date: report.dateIso,
        has_text: hasText,
        has_direct: hasDirect,
        has_spend: hasSpend,
      });
    }
  }

  const messageId = await sendTelegram(report.body);
  await sendTelegram(changeBody);
  await sendTelegram(metaBody);
  await sendTelegram(naverBody);

  await admin.from("daily_report_log").upsert(
    {
      report_date: report.dateIso,
      sent_at: new Date().toISOString(),
      message_id: messageId,
      body: report.body,
    },
    { onConflict: "report_date" }
  );

  return NextResponse.json({
    sent: true,
    date: report.dateIso,
    message_id: messageId,
    sent_messages: 4,
  });
}
