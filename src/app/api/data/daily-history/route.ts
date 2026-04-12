import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const type = searchParams.get("type") || "calls";

  const admin = createAdminClient();

  // 범위 조회 (startDate ~ endDate)
  if (startDate && endDate) {
    if (type === "calls") {
      const { data } = await admin.from("call_reports").select("*").gte("date", startDate).lte("date", endDate).order("date", { ascending: false });
      return NextResponse.json(data || []);
    } else {
      const [{ data: spend }, { data: calls }] = await Promise.all([
        admin.from("ad_spend").select("*").gte("date", startDate).lte("date", endDate),
        admin.from("call_reports").select("date, media, total_count, valid_total").gte("date", startDate).lte("date", endDate),
      ]);
      return NextResponse.json({ spend: spend || [], calls: calls || [] });
    }
  }

  // 단일 날짜 조회
  if (!date) return NextResponse.json({ error: "date or startDate/endDate required" }, { status: 400 });

  if (type === "calls") {
    const { data } = await admin.from("call_reports").select("*").eq("date", date);
    return NextResponse.json(data || []);
  } else {
    const [{ data: spend }, { data: calls }] = await Promise.all([
      admin.from("ad_spend").select("*").eq("date", date),
      admin.from("call_reports").select("date, media, total_count, valid_total").eq("date", date),
    ]);
    return NextResponse.json({ spend: spend || [], calls: calls || [] });
  }
}
