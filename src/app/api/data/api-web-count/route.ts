import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadApiWebCounts, webCountFor } from "@/lib/report/inquiry-sources";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const date = req.nextUrl.searchParams.get("date");
  const media = req.nextUrl.searchParams.get("media");
  if (!date || !media)
    return NextResponse.json({ error: "date, media required" }, { status: 400 });

  const admin = createAdminClient();
  const map = await loadApiWebCounts(admin, date, date);
  return NextResponse.json({
    date,
    media,
    api_web_count: webCountFor(map, date, media),
  });
}
