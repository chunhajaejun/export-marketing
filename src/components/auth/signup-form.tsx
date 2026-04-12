"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatPhoneNumber, isValidPhone } from "@/lib/utils/phone-format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const EMAIL_DOMAINS = [
  "naver.com", "gmail.com", "daum.net", "kakao.com", "hanmail.net", "nate.com",
];

export function SignupForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [emailId, setEmailId] = useState("");
  const [emailDomain, setEmailDomain] = useState("naver.com");
  const [customDomain, setCustomDomain] = useState("");
  const [isCustomDomain, setIsCustomDomain] = useState(false);
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [organization, setOrganization] = useState("");

  const getFullEmail = () => `${emailId}@${isCustomDomain ? customDomain : emailDomain}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!name.trim()) { setError("이름을 입력해주세요."); return; }
    if (!emailId.trim()) { setError("이메일 아이디를 입력해주세요."); return; }
    if (isCustomDomain && !customDomain.trim()) { setError("이메일 도메인을 입력해주세요."); return; }
    if (!isValidPhone(phone)) { setError("전화번호를 올바르게 입력해주세요. (010-0000-0000)"); return; }
    if (password.length < 8) { setError("비밀번호는 8자 이상이어야 합니다."); return; }
    if (password !== passwordConfirm) { setError("비밀번호가 일치하지 않습니다."); return; }

    setLoading(true);
    const supabase = createClient();
    const { error: signUpError } = await supabase.auth.signUp({
      email: getFullEmail(),
      password,
      options: { data: { name: name.trim(), phone, organization: organization.trim() || null } },
    });
    if (signUpError) { setError(signUpError.message); setLoading(false); return; }
    router.push("/pending");
  };

  const inputStyle = "bg-[#0f172a] border-[#334155] text-white";

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="text-sm text-[#94a3b8]">이름</label>
        <Input placeholder="홍길동" value={name} onChange={(e) => setName(e.target.value)} className={`mt-1 ${inputStyle}`} />
      </div>

      <div>
        <label className="text-sm text-[#94a3b8]">이메일</label>
        <div className="mt-1 flex items-center gap-1">
          <Input
            placeholder="username"
            value={emailId}
            onChange={(e) => setEmailId(e.target.value.replace(/[^a-zA-Z0-9._\-]/g, ""))}
            className={`flex-1 ${inputStyle}`}
          />
          <span className="text-[#94a3b8]">@</span>
          {isCustomDomain ? (
            <>
              <Input
                placeholder="도메인"
                value={customDomain}
                onChange={(e) => setCustomDomain(e.target.value)}
                className={`flex-1 ${inputStyle}`}
              />
              <button type="button" onClick={() => { setIsCustomDomain(false); setEmailDomain("naver.com"); }} className="text-xs text-[#64748b] hover:text-white">목록</button>
            </>
          ) : (
            <select
              value={emailDomain}
              onChange={(e) => {
                if (e.target.value === "custom") { setIsCustomDomain(true); setCustomDomain(""); }
                else setEmailDomain(e.target.value);
              }}
              className="h-9 flex-1 rounded-md border border-[#334155] bg-[#0f172a] px-2 text-sm text-white"
            >
              {EMAIL_DOMAINS.map((d) => <option key={d} value={d}>{d}</option>)}
              <option value="custom">직접입력</option>
            </select>
          )}
        </div>
      </div>

      <div>
        <label className="text-sm text-[#94a3b8]">전화번호</label>
        <Input
          placeholder="010-0000-0000"
          value={phone}
          onChange={(e) => setPhone(formatPhoneNumber(e.target.value))}
          maxLength={13}
          inputMode="numeric"
          className={`mt-1 ${inputStyle}`}
        />
      </div>

      <div>
        <label className="text-sm text-[#94a3b8]">비밀번호</label>
        <Input type="password" placeholder="8자 이상" value={password} onChange={(e) => setPassword(e.target.value)} className={`mt-1 ${inputStyle}`} />
      </div>

      <div>
        <label className="text-sm text-[#94a3b8]">비밀번호 확인</label>
        <Input type="password" placeholder="비밀번호 재입력" value={passwordConfirm} onChange={(e) => setPasswordConfirm(e.target.value)} className={`mt-1 ${inputStyle}`} />
      </div>

      <div>
        <label className="text-sm text-[#94a3b8]">소속</label>
        <Input placeholder="예: (주)지엔에이 마케팅팀" value={organization} onChange={(e) => setOrganization(e.target.value)} className={`mt-1 ${inputStyle}`} />
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <Button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
        {loading ? "가입 중..." : "가입 신청"}
      </Button>
    </form>
  );
}
