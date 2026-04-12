"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function LoginForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [saveEmail, setSaveEmail] = useState(false);
  const [savePassword, setSavePassword] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("savedEmail");
    const savedPw = localStorage.getItem("savedPassword");
    if (saved) { setEmail(saved); setSaveEmail(true); }
    if (savedPw) { setPassword(atob(savedPw)); setSavePassword(true); }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("이메일과 비밀번호를 입력해주세요.");
      return;
    }

    // 아이디/비밀번호 저장 처리
    if (saveEmail) localStorage.setItem("savedEmail", email.trim());
    else localStorage.removeItem("savedEmail");

    if (savePassword) localStorage.setItem("savedPassword", btoa(password));
    else localStorage.removeItem("savedPassword");

    setLoading(true);
    const supabase = createClient();

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (signInError) {
      setError("이메일 또는 비밀번호가 올바르지 않습니다.");
      setLoading(false);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      setError("로그인에 실패했습니다.");
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("status")
      .eq("id", user.id)
      .single();

    if (!profile || profile.status !== "approved") {
      router.push("/pending");
    } else {
      router.push("/dashboard");
    }
  };

  const inputStyle = "bg-[#0f172a] border-[#334155] text-white";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm text-[#94a3b8]">이메일</label>
        <Input
          type="email"
          placeholder="email@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          className={`mt-1 ${inputStyle}`}
        />
      </div>
      <div>
        <label className="text-sm text-[#94a3b8]">비밀번호</label>
        <Input
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          className={`mt-1 ${inputStyle}`}
        />
      </div>

      <div className="flex gap-4">
        <label className="flex items-center gap-1.5 text-sm text-[#94a3b8] cursor-pointer">
          <input
            type="checkbox"
            checked={saveEmail}
            onChange={(e) => setSaveEmail(e.target.checked)}
            className="rounded border-[#334155] bg-[#0f172a] accent-blue-600"
          />
          아이디 저장
        </label>
        <label className="flex items-center gap-1.5 text-sm text-[#94a3b8] cursor-pointer">
          <input
            type="checkbox"
            checked={savePassword}
            onChange={(e) => setSavePassword(e.target.checked)}
            className="rounded border-[#334155] bg-[#0f172a] accent-blue-600"
          />
          비밀번호 저장
        </label>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}
      <Button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
        {loading ? "로그인 중..." : "로그인"}
      </Button>
    </form>
  );
}
