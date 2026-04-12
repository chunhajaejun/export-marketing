"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ForgotPasswordForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [email, setEmail] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email.trim()) { setError("이메일을 입력해주세요."); return; }
    setLoading(true);

    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email.trim(),
      { redirectTo: `${window.location.origin}/login` }
    );

    if (resetError) { setError(resetError.message); setLoading(false); return; }
    setSent(true);
    setLoading(false);
  };

  if (sent) {
    return (
      <div className="text-center space-y-4">
        <div className="text-4xl">✉️</div>
        <h2 className="text-lg font-bold text-white">이메일을 확인하세요</h2>
        <p className="text-sm text-[#94a3b8]">
          <span className="text-blue-500">{email}</span>으로
          <br />비밀번호 재설정 링크를 보냈습니다.
        </p>
        <div className="rounded-lg bg-[#0f172a] p-3 text-xs text-[#64748b]">
          이메일이 오지 않나요? 스팸 폴더를 확인해주세요.
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-[#94a3b8] text-center">
        가입한 이메일을 입력하시면<br />비밀번호 재설정 링크를 보내드립니다
      </p>
      <div>
        <label className="text-sm text-[#94a3b8]">이메일</label>
        <Input
          type="email"
          placeholder="email@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 bg-[#0f172a] border-[#334155] text-white"
        />
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <Button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
        {loading ? "발송 중..." : "재설정 링크 보내기"}
      </Button>
    </form>
  );
}
