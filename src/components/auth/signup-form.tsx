"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatPhoneNumber, isValidPhone } from "@/lib/utils/phone-format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import Link from "next/link";

const EMAIL_DOMAINS = [
  "naver.com",
  "gmail.com",
  "daum.net",
  "kakao.com",
  "hanmail.net",
  "nate.com",
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

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhone(formatPhoneNumber(e.target.value));
  };

  const handleEmailIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^a-zA-Z0-9._\-]/g, "");
    setEmailId(value);
  };

  const handleDomainChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value === "custom") {
      setIsCustomDomain(true);
      setCustomDomain("");
    } else {
      setIsCustomDomain(false);
      setEmailDomain(value);
    }
  };

  const getFullEmail = () => {
    const domain = isCustomDomain ? customDomain : emailDomain;
    return `${emailId}@${domain}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("이름을 입력해주세요.");
      return;
    }

    if (!emailId.trim()) {
      setError("이메일 아이디를 입력해주세요.");
      return;
    }

    if (isCustomDomain && !customDomain.trim()) {
      setError("이메일 도메인을 입력해주세요.");
      return;
    }

    if (!isValidPhone(phone)) {
      setError("전화번호를 올바르게 입력해주세요. (010-0000-0000)");
      return;
    }

    if (password.length < 8) {
      setError("비밀번호는 8자 이상이어야 합니다.");
      return;
    }

    if (password !== passwordConfirm) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }

    setLoading(true);

    const supabase = createClient();
    const email = getFullEmail();

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: name.trim(),
          phone,
          organization: organization.trim() || null,
        },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    router.push("/pending");
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-xl">회원가입</CardTitle>
        <CardDescription>
          (주)지엔에이 수출 마케팅 대시보드
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="name" className="text-sm font-medium">
              이름 <span className="text-destructive">*</span>
            </label>
            <Input
              id="name"
              placeholder="이름"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="emailId" className="text-sm font-medium">
              이메일 <span className="text-destructive">*</span>
            </label>
            <div className="flex items-center gap-1.5">
              <Input
                id="emailId"
                placeholder="아이디"
                value={emailId}
                onChange={handleEmailIdChange}
                className="flex-1"
              />
              <span className="text-muted-foreground">@</span>
              {isCustomDomain ? (
                <Input
                  placeholder="도메인 입력"
                  value={customDomain}
                  onChange={(e) => setCustomDomain(e.target.value)}
                  className="flex-1"
                />
              ) : (
                <select
                  value={emailDomain}
                  onChange={handleDomainChange}
                  className="h-8 flex-1 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
                >
                  {EMAIL_DOMAINS.map((domain) => (
                    <option key={domain} value={domain}>
                      {domain}
                    </option>
                  ))}
                  <option value="custom">직접입력</option>
                </select>
              )}
              {isCustomDomain && (
                <button
                  type="button"
                  onClick={() => {
                    setIsCustomDomain(false);
                    setEmailDomain("naver.com");
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  목록
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="phone" className="text-sm font-medium">
              전화번호 <span className="text-destructive">*</span>
            </label>
            <Input
              id="phone"
              placeholder="010-0000-0000"
              value={phone}
              onChange={handlePhoneChange}
              maxLength={13}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-sm font-medium">
              비밀번호 <span className="text-destructive">*</span>
            </label>
            <Input
              id="password"
              type="password"
              placeholder="8자 이상"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="passwordConfirm" className="text-sm font-medium">
              비밀번호 확인 <span className="text-destructive">*</span>
            </label>
            <Input
              id="passwordConfirm"
              type="password"
              placeholder="비밀번호 재입력"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="organization" className="text-sm font-medium">
              소속 <span className="text-muted-foreground text-xs">(선택)</span>
            </label>
            <Input
              id="organization"
              placeholder="소속"
              value={organization}
              onChange={(e) => setOrganization(e.target.value)}
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "처리 중..." : "회원가입"}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            이미 계정이 있으신가요?{" "}
            <Link href="/login" className="text-primary hover:underline">
              로그인
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
