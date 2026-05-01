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

  // 발송 조건: call_reports 1건 이상 + (ad_spend 수기 OR API 자동 광고비) 중 하나라도 있어야 함
  if (!force) {
    const [
      { data: callRows },
      { data: spendRows },
      { data: naverRows },
      { data: metaRows },
      { data: daangnRows },
    ] = await Promise.all([
      admin.from("call_reports").select("id").eq("date", report.dateIso).limit(1),
      admin.from("ad_spend").select("id").eq("date", report.dateIso).limit(1),
      admin.from("naver_ad_stats").select("date").eq("date", report.dateIso).limit(1),
      admin.from("meta_ad_stats").select("date").eq("date", report.dateIso).limit(1),
      admin.from("daangn_ad_stats").select("date").eq("date", report.dateIso).limit(1),
    ]);
    const hasCall = (callRows ?? []).length > 0;
    const hasManualSpend = (spendRows ?? []).length > 0;
    const hasAutoSpend =
      (naverRows ?? []).length > 0 ||
      (metaRows ?? []).length > 0 ||
      (daangnRows ?? []).length > 0;
    const hasSpend = hasManualSpend || hasAutoSpend;
    if (!hasCall || !hasSpend) {
      return NextResponse.json({
        skipped: "awaiting inputs",
        date: report.dateIso,
        has_call: hasCall,
        has_manual_spend: hasManualSpend,
        has_auto_spend: hasAutoSpend,
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
