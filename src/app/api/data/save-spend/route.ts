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
    const { error } = await admin.from("ad_spend").upsert(
      { date: item.date, media: item.media, amount: item.amount, reporter_id: user.id },
      { onConflict: "date,media" }
    );
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
