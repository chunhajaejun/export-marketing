import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { reportId, field, oldValue, newValue } = await request.json();
  const admin = createAdminClient();

  // 현재 레포트 조회
  const { data: report } = await admin.from("call_reports").select("*").eq("id", reportId).single();
  if (!report) return NextResponse.json({ error: "Report not found" }, { status: 404 });

  // absence 감소, 대상 필드 증가
  const updates: Record<string, number> = { absence_count: Math.max(0, report.absence_count - 1) };
  const fieldMap: Record<string, string> = {
    export: "export_count", used_car: "used_car_count",
    scrap: "scrap_count", invalid: "invalid_count",
  };
  const dbField = fieldMap[newValue];
  if (dbField) updates[dbField] = (report[dbField] || 0) + 1;

  const { error: updateError } = await admin.from("call_reports").update(updates).eq("id", reportId);
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  // 이력 기록
  await admin.from("call_report_logs").insert({
    call_report_id: reportId,
    field_changed: "absence → " + newValue,
    old_value: oldValue,
    new_value: newValue,
    changed_by: user.id,
  });

  return NextResponse.json({ success: true });
}
