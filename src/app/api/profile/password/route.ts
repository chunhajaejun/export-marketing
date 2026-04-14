import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const currentPassword =
    typeof body.current_password === "string" ? body.current_password : "";
  const newPassword =
    typeof body.new_password === "string" ? body.new_password : "";

  if (!currentPassword)
    return NextResponse.json({ error: "현재 비밀번호를 입력하세요." }, { status: 400 });
  if (!newPassword || newPassword.length < 8)
    return NextResponse.json({ error: "새 비밀번호는 8자 이상이어야 합니다." }, { status: 400 });

  // 현재 비밀번호 검증 — re-authenticate
  const { error: signInErr } = await supabase.auth.signInWithPassword({
    email: user.email!,
    password: currentPassword,
  });
  if (signInErr)
    return NextResponse.json(
      { error: "현재 비밀번호가 일치하지 않습니다." },
      { status: 400 }
    );

  const { error: updateErr } = await supabase.auth.updateUser({
    password: newPassword,
  });
  if (updateErr)
    return NextResponse.json({ error: updateErr.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
