import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  const type = searchParams.get("type") || "calls";

  if (!date) return NextResponse.json({ error: "date required" }, { status: 400 });

  const admin = createAdminClient();

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
