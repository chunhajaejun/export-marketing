import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const today = new Date();
  const dates: string[] = [];
  for (let i = 0; i < 4; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().split("T")[0]);
  }

  const startDate = dates[dates.length - 1];
  const endDate = dates[0];

  const [{ data: calls }, { data: spend }] = await Promise.all([
    admin.from("call_reports").select("*").gte("date", startDate).lte("date", endDate),
    admin.from("ad_spend").select("*").gte("date", startDate).lte("date", endDate),
  ]);

  const result = dates.map((date) => {
    const dayCalls = (calls || []).filter((c: any) => c.date === date);
    const daySpend = (spend || []).filter((s: any) => s.date === date);

    const total_calls = dayCalls.reduce((s: number, c: any) => s + (c.total_count || 0), 0);
    const valid_calls = dayCalls.reduce((s: number, c: any) => s + (c.export_count || 0) + (c.used_car_count || 0) + (c.phone_naver_count || 0), 0);
    const scrap = dayCalls.reduce((s: number, c: any) => s + (c.scrap_count || 0), 0);
    const absence = dayCalls.reduce((s: number, c: any) => s + (c.absence_count || 0), 0);
    const invalid = dayCalls.reduce((s: number, c: any) => s + (c.invalid_count || 0), 0);
    const totalSpend = daySpend.reduce((s: number, sp: any) => s + (sp.amount || 0), 0);

    return {
      date, total_calls, valid_calls, scrap, absence, invalid,
      spend: totalSpend,
      cpa_total: total_calls > 0 ? Math.round(totalSpend / total_calls) : null,
      cpa_valid: valid_calls > 0 ? Math.round(totalSpend / valid_calls) : null,
    };
  });

  return NextResponse.json(result);
}
