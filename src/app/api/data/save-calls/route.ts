import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { items } = await request.json();
  const admin = createAdminClient();

  for (const item of items) {
    // 신규 모델: 직원은 전화량(phone_count) + 분류(유효수출/매입/폐차, 무효, 부재)만 입력.
    // 총 = phone_count + API 웹문의(동적), 유효+무효+부재 = 총 이 되어야 함.
    const phoneCount = item.phone_count ?? 0;
    const manualWebCount = item.manual_web_count ?? 0;
    const incomingSource: "text" | "direct" =
      item.input_source === "text" ? "text" : "direct";

    // 기존 레코드의 input_source 확인 후 병합
    const { data: existing } = await admin
      .from("call_reports")
      .select("input_source")
      .eq("date", item.date)
      .eq("media", item.media)
      .maybeSingle();
    const currentSource = existing?.input_source as
      | "text"
      | "direct"
      | "both"
      | null
      | undefined;
    let nextSource: "text" | "direct" | "both" = incomingSource;
    if (currentSource === "both") nextSource = "both";
    else if (currentSource && currentSource !== incomingSource) nextSource = "both";
    const exportCount = item.export_count ?? 0;
    const usedCarCount = item.used_car_count ?? 0;
    const scrapCount = item.scrap_count ?? 0;
    const absenceCount = item.absence_count ?? 0;
    const invalidCount = item.invalid_count ?? 0;

    const validTotal = exportCount + usedCarCount + scrapCount;
    const classifiedTotal =
      exportCount + usedCarCount + scrapCount + absenceCount + invalidCount;

    const { error } = await admin.from("call_reports").upsert(
      {
        date: item.date,
        media: item.media,
        phone_count: phoneCount,
        manual_web_count: manualWebCount,
        input_source: nextSource,
        export_count: exportCount,
        used_car_count: usedCarCount,
        scrap_count: scrapCount,
        absence_count: absenceCount,
        invalid_count: invalidCount,
        phone_naver_count: 0,
        valid_total: validTotal,
        total_count: classifiedTotal,
        reporter_id: user.id,
        reported_at: new Date().toISOString(),
      },
      { onConflict: "date,media" }
    );
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
