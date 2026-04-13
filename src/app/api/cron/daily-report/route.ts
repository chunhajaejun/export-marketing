import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  buildDailyReport,
  sendTelegram,
  isInWindowKST,
} from "@/lib/report/daily";

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

  // preview 모드: 그룹 발송/DB 기록 없이 본문만 반환
  if (preview) {
    return NextResponse.json({ preview: true, date: report.dateIso, body: report.body });
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

  // 콜 데이터 없으면 발송 안 하고 대기 (단 12:00 근처에서 여전히 없으면 경고 발송)
  if (!report.hasCallData && !force) {
    return NextResponse.json({
      skipped: "no call data yet",
      date: report.dateIso,
    });
  }

  const messageId = await sendTelegram(report.body);

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
  });
}
