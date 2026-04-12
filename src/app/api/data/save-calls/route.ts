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
    const total = (item.export_count || 0) + (item.used_car_count || 0) + (item.scrap_count || 0) +
      (item.absence_count || 0) + (item.invalid_count || 0) + (item.phone_naver_count || 0);
    const validTotal = (item.export_count || 0) + (item.used_car_count || 0) + (item.phone_naver_count || 0);

    const { error } = await admin.from("call_reports").upsert(
      {
        date: item.date, media: item.media,
        export_count: item.export_count || 0,
        used_car_count: item.used_car_count || 0,
        scrap_count: item.scrap_count || 0,
        absence_count: item.absence_count || 0,
        invalid_count: item.invalid_count || 0,
        phone_naver_count: item.phone_naver_count || 0,
        valid_total: validTotal,
        total_count: total,
        reporter_id: user.id,
        reported_at: new Date().toISOString(),
      },
      { onConflict: "date,media" }
    );
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
