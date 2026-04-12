import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { UserRole } from "@/lib/types";

const VALID_ROLES: UserRole[] = [
  "call_reporter",
  "spend_reporter",
  "viewer",
  "admin",
];

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data: me } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (me?.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const role = body.role as UserRole;
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  const organization =
    typeof body.organization === "string" ? body.organization.trim() : "";

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return NextResponse.json({ error: "유효한 이메일을 입력해주세요." }, { status: 400 });
  if (!password || password.length < 8)
    return NextResponse.json({ error: "비밀번호는 8자 이상이어야 합니다." }, { status: 400 });
  if (!name)
    return NextResponse.json({ error: "이름을 입력해주세요." }, { status: 400 });
  if (!VALID_ROLES.includes(role))
    return NextResponse.json({ error: "유효하지 않은 역할입니다." }, { status: 400 });

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name, phone, organization },
  });
  if (createErr || !created.user)
    return NextResponse.json(
      { error: createErr?.message || "계정 생성 실패" },
      { status: 500 }
    );

  const { error: updateErr } = await admin
    .from("profiles")
    .update({ name, phone, organization: organization || null, role, status: "approved" })
    .eq("id", created.user.id);
  if (updateErr) {
    await admin.auth.admin.deleteUser(created.user.id);
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("*")
    .eq("id", created.user.id)
    .single();

  return NextResponse.json({ success: true, profile });
}
