# 수출 마케팅 대시보드 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** GNA 수출 마케팅 광고 성과를 매체별로 분석하는 대시보드를 구축한다 (Next.js + Supabase + Vercel).

**Architecture:** Supabase를 BaaS로 사용하여 PostgreSQL DB, Auth, RLS를 처리하고, Next.js App Router에서 Server Components + Client Components 혼합으로 UI를 구성한다. 텍스트 파싱은 클라이언트 사이드 유틸리티로 구현한다.

**Tech Stack:** Next.js 14 (App Router), Tailwind CSS, shadcn/ui, Recharts, Supabase (PostgreSQL + Auth + RLS), Vercel

---

## 파일 구조

```
src/
├── app/
│   ├── layout.tsx                    # 루트 레이아웃 (Supabase provider)
│   ├── page.tsx                      # / → /dashboard 리다이렉트
│   ├── (auth)/
│   │   ├── login/page.tsx            # 로그인
│   │   ├── signup/page.tsx           # 회원가입
│   │   ├── forgot-password/page.tsx  # 비밀번호 찾기
│   │   └── pending/page.tsx          # 승인 대기
│   ├── (protected)/
│   │   ├── layout.tsx                # 인증+승인 체크 레이아웃
│   │   ├── dashboard/page.tsx        # 대시보드 메인
│   │   ├── input/page.tsx            # 데이터 입력 (문의관리/광고비관리)
│   │   └── admin/page.tsx            # 사용자 관리
├── components/
│   ├── ui/                           # shadcn/ui 컴포넌트
│   ├── auth/
│   │   ├── login-form.tsx
│   │   ├── signup-form.tsx
│   │   └── forgot-password-form.tsx
│   ├── dashboard/
│   │   ├── filter-bar.tsx            # 필터 (프리셋 + 날짜 범위 + 매체)
│   │   ├── daily-table.tsx           # 일별 합산 테이블
│   │   ├── media-table.tsx           # 매체별 테이블
│   │   ├── call-trend-chart.tsx      # 일별 콜량 추이 바 차트
│   │   ├── media-pie-chart.tsx       # 매체별 비중 파이 차트
│   │   ├── daily-swipe-card.tsx      # 모바일 일별 스와이프 카드
│   │   └── media-swipe-card.tsx      # 모바일 매체별 스와이프 카드
│   ├── input/
│   │   ├── tab-container.tsx         # 문의관리/광고비관리 탭
│   │   ├── call-text-input.tsx       # 콜량 텍스트 입력
│   │   ├── call-direct-input.tsx     # 콜량 직접 입력
│   │   ├── spend-text-input.tsx      # 소진액 텍스트 입력
│   │   ├── spend-direct-input.tsx    # 소진액 직접 입력
│   │   ├── daily-history.tsx         # 우측 이력 테이블
│   │   └── absence-manager.tsx       # 부재 처리
│   └── admin/
│       └── user-table.tsx            # 사용자 관리 테이블
├── lib/
│   ├── supabase/
│   │   ├── client.ts                 # 브라우저용 Supabase 클라이언트
│   │   ├── server.ts                 # 서버용 Supabase 클라이언트
│   │   └── middleware.ts             # 인증 미들웨어 헬퍼
│   ├── parsers/
│   │   ├── call-report-parser.ts     # 콜량 보고 텍스트 파싱
│   │   └── spend-report-parser.ts    # 소진액 보고 텍스트 파싱
│   ├── utils/
│   │   ├── phone-format.ts           # 전화번호 자동 포맷
│   │   ├── currency-format.ts        # 금액 포맷 (₩1,234,567)
│   │   └── date-utils.ts             # 날짜 유틸 + 보고 시간 자동 추정
│   └── types.ts                      # 전역 타입 정의
├── middleware.ts                      # Next.js 미들웨어 (인증 리다이렉트)
supabase/
├── migrations/
│   ├── 001_profiles.sql              # 사용자 프로필 + 역할
│   ├── 002_call_reports.sql          # 콜량 보고 데이터
│   ├── 003_ad_spend.sql              # 광고비 소진액
│   └── 004_rls_policies.sql          # RLS 정책
```

---

### Task 1: 프로젝트 초기 설정

**Files:**
- Create: `package.json` (재설정), `tsconfig.json`, `tailwind.config.ts`, `postcss.config.js`
- Create: `src/app/layout.tsx`, `src/app/page.tsx`
- Create: `.env.local.example`

- [ ] **Step 1: Next.js 프로젝트 생성**

```bash
cd /Users/hajaejun/Desktop/export-marketing
# 기존 package.json 백업 후 새로 생성
mv package.json package.json.bak
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --no-git
```

선택지:
- TypeScript: Yes
- ESLint: Yes
- Tailwind CSS: Yes
- src/ directory: Yes
- App Router: Yes
- import alias: @/*

- [ ] **Step 2: 필수 패키지 설치**

```bash
npm install @supabase/supabase-js @supabase/ssr
npm install recharts
npm install date-fns
npx shadcn@latest init
```

shadcn init 설정:
- Style: Default
- Base color: Slate
- CSS variables: Yes

- [ ] **Step 3: shadcn/ui 컴포넌트 추가**

```bash
npx shadcn@latest add button input select tabs table card badge dropdown-menu toast
```

- [ ] **Step 4: 환경 변수 예시 파일 생성**

Create `.env.local.example`:

```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

- [ ] **Step 5: Supabase 클라이언트 설정**

Create `src/lib/supabase/client.ts`:

```typescript
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

Create `src/lib/supabase/server.ts`:

```typescript
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );
}
```

- [ ] **Step 6: 전역 타입 정의**

Create `src/lib/types.ts`:

```typescript
export type UserRole = "call_reporter" | "spend_reporter" | "viewer" | "admin";
export type ApprovalStatus = "pending" | "approved" | "rejected";
export type CallCategory = "export" | "used_car" | "scrap" | "absence" | "invalid" | "phone_naver";
export type MediaChannel = "naver_web" | "naver_landing" | "danggeun" | "meta" | "google";

export interface Profile {
  id: string;
  email: string;
  name: string;
  phone: string;
  organization: string | null;
  role: UserRole;
  status: ApprovalStatus;
  created_at: string;
}

export interface CallReport {
  id: string;
  date: string; // YYYY-MM-DD
  media: MediaChannel;
  export_count: number | null;
  used_car_count: number | null;
  valid_total: number | null; // 미분리 과거 데이터용
  scrap_count: number;
  absence_count: number;
  invalid_count: number;
  phone_naver_count: number;
  total_count: number;
  reported_at: string; // 보고 시점
  reporter_id: string;
  created_at: string;
}

export interface CallReportLog {
  id: string;
  call_report_id: string;
  field_changed: string;
  old_value: string;
  new_value: string;
  changed_by: string;
  changed_at: string;
}

export interface AdSpend {
  id: string;
  date: string;
  media: MediaChannel;
  amount: number;
  reporter_id: string;
  created_at: string;
}

export interface DailySummary {
  date: string;
  total_calls: number;
  valid_calls: number;
  export_count: number;
  used_car_count: number;
  scrap_count: number;
  absence_count: number;
  invalid_count: number;
  phone_naver_count: number;
  total_spend: number;
  cpa_total: number | null;
  cpa_valid: number | null;
  last_reported_at: string | null;
}

export interface ParsedCallReport {
  date: string;
  media: MediaChannel;
  export_count: number;
  used_car_count: number;
  scrap_count: number;
  absence_count: number;
  invalid_count: number;
  phone_count: number;
  channels: { phone: number; kakao: number; sms: number };
}

export interface ParsedAdSpend {
  date: string;
  media: MediaChannel;
  amount: number;
}
```

- [ ] **Step 7: 개발 서버 동작 확인**

```bash
npm run dev
```

브라우저에서 http://localhost:3000 접속하여 Next.js 기본 페이지 확인.

- [ ] **Step 8: 커밋**

```bash
git add -A
git commit -m "chore: Next.js + Supabase + shadcn/ui 프로젝트 초기 설정"
```

---

### Task 2: Supabase DB 스키마

**Files:**
- Create: `supabase/migrations/001_profiles.sql`
- Create: `supabase/migrations/002_call_reports.sql`
- Create: `supabase/migrations/003_ad_spend.sql`
- Create: `supabase/migrations/004_rls_policies.sql`

참고: 이 SQL은 Supabase 대시보드의 SQL Editor에서 실행한다.

- [ ] **Step 1: profiles 테이블**

Create `supabase/migrations/001_profiles.sql`:

```sql
-- 사용자 프로필 (Supabase Auth와 연동)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  organization TEXT,
  role TEXT NOT NULL DEFAULT 'viewer'
    CHECK (role IN ('call_reporter', 'spend_reporter', 'viewer', 'admin')),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 회원가입 시 자동으로 profile 생성하는 트리거
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, name, phone, organization)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    NEW.raw_user_meta_data->>'organization'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- updated_at 자동 갱신
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

- [ ] **Step 2: call_reports 테이블 + 변경 이력**

Create `supabase/migrations/002_call_reports.sql`:

```sql
-- 콜량 보고 (일별 × 매체별)
CREATE TABLE call_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  media TEXT NOT NULL
    CHECK (media IN ('naver_web', 'naver_landing', 'danggeun', 'meta', 'google')),
  export_count INT,          -- 수출가능
  used_car_count INT,        -- 중고매입
  valid_total INT,           -- 유효 합계 (미분리 과거 데이터용)
  scrap_count INT NOT NULL DEFAULT 0,    -- 폐차
  absence_count INT NOT NULL DEFAULT 0,  -- 부재
  invalid_count INT NOT NULL DEFAULT 0,  -- 무효
  phone_naver_count INT NOT NULL DEFAULT 0, -- 전화(네이버웹 추정)
  total_count INT NOT NULL DEFAULT 0,
  reported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reporter_id UUID REFERENCES profiles(id) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(date, media) -- 날짜+매체 조합 유니크
);

CREATE TRIGGER call_reports_updated_at
  BEFORE UPDATE ON call_reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 변경 이력 (부재 상태 변경 등)
CREATE TABLE call_report_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  call_report_id UUID REFERENCES call_reports(id) ON DELETE CASCADE NOT NULL,
  field_changed TEXT NOT NULL,
  old_value TEXT NOT NULL,
  new_value TEXT NOT NULL,
  changed_by UUID REFERENCES profiles(id) NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

- [ ] **Step 3: ad_spend 테이블**

Create `supabase/migrations/003_ad_spend.sql`:

```sql
-- 광고비 소진액 (일별 × 매체별)
CREATE TABLE ad_spend (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  media TEXT NOT NULL
    CHECK (media IN ('naver_web', 'naver_landing', 'danggeun', 'meta', 'google')),
  amount INT NOT NULL DEFAULT 0, -- 원 단위
  reporter_id UUID REFERENCES profiles(id) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(date, media)
);

CREATE TRIGGER ad_spend_updated_at
  BEFORE UPDATE ON ad_spend
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

- [ ] **Step 4: RLS 정책**

Create `supabase/migrations/004_rls_policies.sql`:

```sql
-- RLS 활성화
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_report_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_spend ENABLE ROW LEVEL SECURITY;

-- profiles: 승인된 유저는 모든 프로필 조회 가능, 자신만 수정
CREATE POLICY "approved users can view profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.status = 'approved'
    )
  );

CREATE POLICY "users can view own profile"
  ON profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "admins can update profiles"
  ON profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin' AND p.status = 'approved'
    )
  );

-- call_reports: 승인된 유저는 조회, 콜량보고자+관리자만 입력/수정
CREATE POLICY "approved users can view call_reports"
  ON call_reports FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.status = 'approved'
    )
  );

CREATE POLICY "call reporters can insert"
  ON call_reports FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.status = 'approved'
        AND p.role IN ('call_reporter', 'admin')
    )
  );

CREATE POLICY "call reporters can update"
  ON call_reports FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.status = 'approved'
        AND p.role IN ('call_reporter', 'admin')
    )
  );

-- call_report_logs: 승인된 유저 조회, 콜량보고자+관리자 입력
CREATE POLICY "approved users can view logs"
  ON call_report_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.status = 'approved'
    )
  );

CREATE POLICY "reporters can insert logs"
  ON call_report_logs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.status = 'approved'
        AND p.role IN ('call_reporter', 'admin')
    )
  );

-- ad_spend: 승인된 유저 조회, 소진액보고자+관리자 입력/수정
CREATE POLICY "approved users can view ad_spend"
  ON ad_spend FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.status = 'approved'
    )
  );

CREATE POLICY "spend reporters can insert"
  ON ad_spend FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.status = 'approved'
        AND p.role IN ('spend_reporter', 'admin')
    )
  );

CREATE POLICY "spend reporters can update"
  ON ad_spend FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.status = 'approved'
        AND p.role IN ('spend_reporter', 'admin')
    )
  );
```

- [ ] **Step 5: Supabase 대시보드에서 SQL 실행**

Supabase 프로젝트 생성 후:
1. SQL Editor에서 001 → 002 → 003 → 004 순서로 실행
2. `.env.local` 파일에 Supabase URL과 anon key 입력
3. Authentication > Settings에서 비밀번호 찾기 이메일 템플릿 확인

- [ ] **Step 6: 커밋**

```bash
git add supabase/
git commit -m "feat: Supabase DB 스키마 — profiles, call_reports, ad_spend, RLS"
```

---

### Task 3: 인증 시스템

**Files:**
- Create: `src/middleware.ts`
- Create: `src/app/(auth)/login/page.tsx`
- Create: `src/app/(auth)/signup/page.tsx`
- Create: `src/app/(auth)/forgot-password/page.tsx`
- Create: `src/app/(auth)/pending/page.tsx`
- Create: `src/components/auth/login-form.tsx`
- Create: `src/components/auth/signup-form.tsx`
- Create: `src/components/auth/forgot-password-form.tsx`
- Create: `src/lib/utils/phone-format.ts`

- [ ] **Step 1: 전화번호 포맷 유틸 작성**

Create `src/lib/utils/phone-format.ts`:

```typescript
export function formatPhoneNumber(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);

  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

export function isValidPhone(phone: string): boolean {
  return /^010-\d{4}-\d{4}$/.test(phone);
}
```

- [ ] **Step 2: 회원가입 폼 컴포넌트**

Create `src/components/auth/signup-form.tsx`:

```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatPhoneNumber } from "@/lib/utils/phone-format";

const EMAIL_DOMAINS = [
  "naver.com",
  "gmail.com",
  "daum.net",
  "kakao.com",
  "hanmail.net",
  "nate.com",
] as const;

export function SignupForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [emailId, setEmailId] = useState("");
  const [domain, setDomain] = useState("naver.com");
  const [customDomain, setCustomDomain] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [organization, setOrganization] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isCustomDomain = domain === "custom";
  const fullEmail = `${emailId}@${isCustomDomain ? customDomain : domain}`;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }
    if (password.length < 8) {
      setError("비밀번호는 8자 이상이어야 합니다.");
      return;
    }
    if (!/^[a-zA-Z0-9._-]+$/.test(emailId)) {
      setError("이메일 아이디는 영문, 숫자만 입력 가능합니다.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: signUpError } = await supabase.auth.signUp({
      email: fullEmail,
      password,
      options: {
        data: { name, phone, organization: organization || null },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    router.push("/pending");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm text-muted-foreground">이름</label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="홍길동" required />
      </div>

      <div>
        <label className="text-sm text-muted-foreground">이메일 <span className="text-xs text-muted-foreground">(영문만 입력)</span></label>
        <div className="flex items-center gap-1">
          <Input
            value={emailId}
            onChange={(e) => setEmailId(e.target.value.replace(/[^a-zA-Z0-9._-]/g, ""))}
            placeholder="username"
            className="flex-1"
            required
          />
          <span className="text-muted-foreground">@</span>
          <select
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            className="h-9 rounded-md border bg-background px-2 text-sm"
          >
            {EMAIL_DOMAINS.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
            <option value="custom">직접입력</option>
          </select>
        </div>
        {isCustomDomain && (
          <Input
            value={customDomain}
            onChange={(e) => setCustomDomain(e.target.value)}
            placeholder="example.com"
            className="mt-2"
            required
          />
        )}
      </div>

      <div>
        <label className="text-sm text-muted-foreground">전화번호 <span className="text-xs text-muted-foreground">(숫자만 → 자동 포맷)</span></label>
        <Input
          value={phone}
          onChange={(e) => setPhone(formatPhoneNumber(e.target.value))}
          placeholder="010-0000-0000"
          inputMode="numeric"
          required
        />
      </div>

      <div>
        <label className="text-sm text-muted-foreground">비밀번호</label>
        <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="8자 이상" required />
      </div>

      <div>
        <label className="text-sm text-muted-foreground">비밀번호 확인</label>
        <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="비밀번호 재입력" required />
      </div>

      <div>
        <label className="text-sm text-muted-foreground">소속 (선택)</label>
        <Input value={organization} onChange={(e) => setOrganization(e.target.value)} placeholder="예: GNA마케팅팀" />
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "가입 중..." : "가입 신청"}
      </Button>
    </form>
  );
}
```

- [ ] **Step 3: 로그인 폼 컴포넌트**

Create `src/components/auth/login-form.tsx`:

```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError("이메일 또는 비밀번호가 올바르지 않습니다.");
      setLoading(false);
      return;
    }

    // 승인 상태 확인
    const { data: profile } = await supabase
      .from("profiles")
      .select("status")
      .single();

    if (profile?.status !== "approved") {
      router.push("/pending");
    } else {
      router.push("/dashboard");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm text-muted-foreground">이메일</label>
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@example.com" required />
      </div>
      <div>
        <label className="text-sm text-muted-foreground">비밀번호</label>
        <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "로그인 중..." : "로그인"}
      </Button>
    </form>
  );
}
```

- [ ] **Step 4: 비밀번호 찾기 폼**

Create `src/components/auth/forgot-password-form.tsx`:

```typescript
"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email,
      { redirectTo: `${window.location.origin}/login` }
    );

    if (resetError) {
      setError(resetError.message);
      setLoading(false);
      return;
    }

    setSent(true);
    setLoading(false);
  }

  if (sent) {
    return (
      <div className="text-center space-y-4">
        <div className="text-4xl">✉️</div>
        <h2 className="text-lg font-bold">이메일을 확인하세요</h2>
        <p className="text-sm text-muted-foreground">
          <span className="text-blue-500">{email}</span>으로
          <br />비밀번호 재설정 링크를 보냈습니다.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-muted-foreground text-center">
        가입한 이메일을 입력하시면
        <br />비밀번호 재설정 링크를 보내드립니다
      </p>
      <div>
        <label className="text-sm text-muted-foreground">이메일</label>
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@example.com" required />
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "발송 중..." : "재설정 링크 보내기"}
      </Button>
    </form>
  );
}
```

- [ ] **Step 5: 인증 페이지 (로그인/회원가입/비번찾기/승인대기)**

Create `src/app/(auth)/login/page.tsx`:

```typescript
import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-sm rounded-xl border bg-card p-8">
        <div className="text-center mb-6">
          <h1 className="text-xl font-bold">GNA 수출 마케팅</h1>
          <p className="text-sm text-muted-foreground">광고 성과 분석 대시보드</p>
        </div>
        <LoginForm />
        <div className="flex justify-between mt-4 text-sm">
          <Link href="/signup" className="text-blue-500 hover:underline">회원가입</Link>
          <Link href="/forgot-password" className="text-muted-foreground hover:underline">비밀번호 찾기</Link>
        </div>
      </div>
    </div>
  );
}
```

Create `src/app/(auth)/signup/page.tsx`:

```typescript
import Link from "next/link";
import { SignupForm } from "@/components/auth/signup-form";

export default function SignupPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-sm rounded-xl border bg-card p-8">
        <div className="text-center mb-6">
          <h1 className="text-xl font-bold">회원가입</h1>
          <p className="text-sm text-muted-foreground">관리자 승인 후 이용 가능합니다</p>
        </div>
        <SignupForm />
        <p className="text-center mt-4 text-sm text-muted-foreground">
          이미 계정이 있으신가요? <Link href="/login" className="text-blue-500 hover:underline">로그인</Link>
        </p>
      </div>
    </div>
  );
}
```

Create `src/app/(auth)/forgot-password/page.tsx`:

```typescript
import Link from "next/link";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-sm rounded-xl border bg-card p-8">
        <div className="text-center mb-6">
          <h1 className="text-xl font-bold">비밀번호 찾기</h1>
        </div>
        <ForgotPasswordForm />
        <p className="text-center mt-4">
          <Link href="/login" className="text-sm text-muted-foreground hover:underline">← 로그인으로 돌아가기</Link>
        </p>
      </div>
    </div>
  );
}
```

Create `src/app/(auth)/pending/page.tsx`:

```typescript
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function PendingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("status, email")
    .eq("id", user.id)
    .single();

  if (profile?.status === "approved") redirect("/dashboard");

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-sm rounded-xl border bg-card p-8 text-center">
        <div className="text-4xl mb-4">⏳</div>
        <h1 className="text-lg font-bold mb-2">승인 대기 중</h1>
        <p className="text-sm text-muted-foreground mb-4">
          가입 신청이 완료되었습니다.<br />관리자 승인 후 이용 가능합니다.
        </p>
        <div className="rounded-lg bg-muted p-3 mb-4">
          <p className="text-xs text-muted-foreground">가입 이메일</p>
          <p className="text-sm font-bold text-blue-500">{profile?.email}</p>
        </div>
        <form action="/api/auth/signout" method="POST">
          <button type="submit" className="text-sm text-muted-foreground hover:underline">
            로그아웃
          </button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Next.js 미들웨어 (인증 리다이렉트)**

Create `src/middleware.ts`:

```typescript
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const PUBLIC_PATHS = ["/login", "/signup", "/forgot-password"];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.some((p) => path.startsWith(p));

  // 미인증 → 로그인으로
  if (!user && !isPublic) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // 인증됨 + 공개 페이지 접근 → 대시보드로
  if (user && isPublic) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/).*)"],
};
```

- [ ] **Step 7: protected 레이아웃 (승인 체크)**

Create `src/app/(protected)/layout.tsx`:

```typescript
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("status, role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.status !== "approved") redirect("/pending");

  return <>{children}</>;
}
```

- [ ] **Step 8: 로그아웃 API 라우트**

Create `src/app/api/auth/signout/route.ts`:

```typescript
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function POST() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
```

- [ ] **Step 9: 루트 페이지 리다이렉트**

Modify `src/app/page.tsx`:

```typescript
import { redirect } from "next/navigation";

export default function Home() {
  redirect("/dashboard");
}
```

- [ ] **Step 10: 브라우저에서 회원가입 → 로그인 → 승인대기 플로우 확인**

1. /signup 에서 회원가입
2. /login 에서 로그인
3. 자동으로 /pending 으로 리다이렉트 확인
4. Supabase 대시보드에서 profiles 테이블의 status를 'approved'로 변경
5. 다시 로그인 → /dashboard 로 이동 확인

- [ ] **Step 11: 커밋**

```bash
git add src/ supabase/
git commit -m "feat: 인증 시스템 — 회원가입/로그인/비번찾기/승인대기/미들웨어"
```

---

### Task 4: 유틸리티 (텍스트 파싱 + 날짜 + 금액)

**Files:**
- Create: `src/lib/parsers/call-report-parser.ts`
- Create: `src/lib/parsers/spend-report-parser.ts`
- Create: `src/lib/utils/date-utils.ts`
- Create: `src/lib/utils/currency-format.ts`

- [ ] **Step 1: 날짜 유틸 + 보고 시간 자동 추정**

Create `src/lib/utils/date-utils.ts`:

```typescript
import { format, subDays, startOfDay } from "date-fns";
import { ko } from "date-fns/locale";

export type ReportMode = "morning" | "evening" | "none";

export function getReportMode(): ReportMode {
  const hour = new Date().getHours();
  if (hour >= 8 && hour < 13) return "morning";
  if (hour >= 17 && hour < 23) return "evening";
  return "none";
}

export function getReportModeLabel(mode: ReportMode): string {
  switch (mode) {
    case "morning": return "오전 보고 모드";
    case "evening": return "퇴근 보고 모드";
    case "none": return "";
  }
}

export function getReportModeDescription(mode: ReportMode): string {
  const now = format(new Date(), "HH:mm");
  switch (mode) {
    case "morning": return `전일 합계 + 당일 00:00~${now}`;
    case "evening": return `당일 00:00~${now} 적립식`;
    case "none": return "";
  }
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, "yyyy-MM-dd");
}

export function formatDateShort(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, "MM/dd", { locale: ko });
}

export function formatDateWithDay(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, "MM/dd (E)", { locale: ko });
}

export function getLast7Days(): string[] {
  return Array.from({ length: 7 }, (_, i) =>
    formatDate(subDays(startOfDay(new Date()), i))
  );
}

export function isToday(date: string): boolean {
  return date === formatDate(new Date());
}
```

- [ ] **Step 2: 금액 포맷 유틸**

Create `src/lib/utils/currency-format.ts`:

```typescript
export function formatCurrency(amount: number): string {
  return `₩${amount.toLocaleString("ko-KR")}`;
}

export function formatCurrencyShort(amount: number): string {
  if (amount >= 1_000_000) return `₩${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `₩${Math.round(amount / 1_000)}K`;
  return `₩${amount}`;
}

export function parseCurrencyInput(value: string): number {
  return parseInt(value.replace(/[^\d]/g, ""), 10) || 0;
}
```

- [ ] **Step 3: 콜량 보고 텍스트 파서**

Create `src/lib/parsers/call-report-parser.ts`:

```typescript
import type { ParsedCallReport, MediaChannel } from "@/lib/types";

export function parseCallReport(text: string): ParsedCallReport[] {
  const results: ParsedCallReport[] = [];
  const sections = text.split(/[ㅡ-]{4,}/); // 구분선으로 분할

  let date = "";
  // 날짜 추출: "2026 / 4 / 11" or "2026/4/11" 패턴
  const dateMatch = text.match(/(\d{4})\s*\/\s*(\d{1,2})\s*\/\s*(\d{1,2})/);
  if (dateMatch) {
    const [, year, month, day] = dateMatch;
    date = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  for (const section of sections) {
    const trimmed = section.trim();
    if (!trimmed) continue;

    // 매체 판별
    let media: MediaChannel = "naver_web"; // 기본값
    if (/당근/i.test(trimmed.split("\n")[0])) media = "danggeun";
    if (/메타/i.test(trimmed.split("\n")[0])) media = "meta";
    if (/구글/i.test(trimmed.split("\n")[0])) media = "google";

    // 섹션 내 날짜 재추출 (섹션마다 다를 수 있음)
    const sectionDate = trimmed.match(/(\d{4})\s*\/\s*(\d{1,2})\s*\/\s*(\d{1,2})/);
    if (sectionDate) {
      const [, y, m, d] = sectionDate;
      date = `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
    }

    // 총 건수 추출
    const totalMatch = trimmed.match(/총\s*(\d+)\s*건/);
    const total = totalMatch ? parseInt(totalMatch[1], 10) : 0;
    if (total === 0) continue;

    // 세부 항목 추출
    const usedCar = extractCount(trimmed, /내수\s*(\d+)/);
    const scrap = extractCount(trimmed, /폐차\s*(\d+)/);
    const absence = extractCount(trimmed, /부재\s*(\d+)/);
    const invalid = extractCount(trimmed, /무효\s*(\d+)/);
    const exportCount = total - usedCar - scrap - absence - invalid;

    // 채널 정보 추출
    const phone = extractCount(trimmed, /전화[:\s]*(\d+)\s*건/);
    const kakao = extractCount(trimmed, /카톡[:\s]*(\d+)\s*건/);
    const sms = extractCount(trimmed, /문자[:\s]*(\d+)\s*건/);

    results.push({
      date,
      media,
      export_count: Math.max(0, exportCount),
      used_car_count: usedCar,
      scrap_count: scrap,
      absence_count: absence,
      invalid_count: invalid,
      phone_count: phone,
      channels: { phone, kakao, sms },
    });
  }

  return results;
}

function extractCount(text: string, pattern: RegExp): number {
  const match = text.match(pattern);
  return match ? parseInt(match[1], 10) : 0;
}
```

- [ ] **Step 4: 소진액 보고 텍스트 파서**

Create `src/lib/parsers/spend-report-parser.ts`:

```typescript
import type { ParsedAdSpend, MediaChannel } from "@/lib/types";

export function parseSpendReport(text: string): ParsedAdSpend[] {
  const results: ParsedAdSpend[] = [];

  // 날짜 추출
  let date = "";
  const dateMatch = text.match(/(\d{4})\s*\/\s*(\d{1,2})\s*\/\s*(\d{1,2})/);
  if (dateMatch) {
    const [, year, month, day] = dateMatch;
    date = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }
  if (!dateMatch) {
    // "4/10" 형식도 시도
    const shortDate = text.match(/(\d{1,2})\s*\/\s*(\d{1,2})/);
    if (shortDate) {
      const [, month, day] = shortDate;
      const year = new Date().getFullYear();
      date = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    }
  }

  const lines = text.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();

    // "네이버 소진액 : 96,432 원" 패턴
    const spendMatch = trimmed.match(
      /(네이버|당근|메타|구글)\s*소진액\s*[:\s]*([0-9,]+)\s*원?/i
    );

    if (spendMatch) {
      const [, mediaName, amountStr] = spendMatch;
      const media = mapMediaName(mediaName);
      const amount = parseInt(amountStr.replace(/,/g, ""), 10);

      if (media && !isNaN(amount)) {
        results.push({ date, media, amount });
      }
    }
  }

  return results;
}

function mapMediaName(name: string): MediaChannel | null {
  const map: Record<string, MediaChannel> = {
    "네이버": "naver_web",
    "당근": "danggeun",
    "메타": "meta",
    "구글": "google",
  };
  return map[name] || null;
}
```

- [ ] **Step 5: 커밋**

```bash
git add src/lib/
git commit -m "feat: 유틸리티 — 텍스트 파서, 날짜, 금액 포맷"
```

---

### Task 5: 데이터 입력 — 문의 관리

**Files:**
- Create: `src/app/(protected)/input/page.tsx`
- Create: `src/components/input/tab-container.tsx`
- Create: `src/components/input/call-text-input.tsx`
- Create: `src/components/input/call-direct-input.tsx`
- Create: `src/components/input/daily-history.tsx`
- Create: `src/components/input/absence-manager.tsx`

- [ ] **Step 1: 입력 페이지 + 탭 컨테이너**

Create `src/components/input/tab-container.tsx`:

```typescript
"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CallTextInput } from "./call-text-input";
import { CallDirectInput } from "./call-direct-input";
import { SpendTextInput } from "./spend-text-input";
import { SpendDirectInput } from "./spend-direct-input";
import { DailyHistory } from "./daily-history";
import { AbsenceManager } from "./absence-manager";
import { useState } from "react";

export function TabContainer({ userRole }: { userRole: string }) {
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [refreshKey, setRefreshKey] = useState(0);

  const canInputCalls = userRole === "call_reporter" || userRole === "admin";
  const canInputSpend = userRole === "spend_reporter" || userRole === "admin";

  return (
    <Tabs defaultValue={canInputCalls ? "calls" : "spend"}>
      <TabsList className="w-full grid grid-cols-2">
        <TabsTrigger value="calls" disabled={!canInputCalls}>
          문의 관리
        </TabsTrigger>
        <TabsTrigger value="spend" disabled={!canInputSpend}>
          광고비 관리
        </TabsTrigger>
      </TabsList>

      <TabsContent value="calls">
        <div className="flex gap-4 flex-col lg:flex-row">
          <div className="w-full lg:w-[300px] shrink-0">
            <CallInputModes
              selectedDate={selectedDate}
              onDateChange={setSelectedDate}
              onSaved={() => setRefreshKey((k) => k + 1)}
            />
          </div>
          <div className="flex-1 space-y-4">
            <DailyHistory date={selectedDate} type="calls" key={`calls-${refreshKey}`} />
            <AbsenceManager date={selectedDate} key={`absence-${refreshKey}`} />
          </div>
        </div>
      </TabsContent>

      <TabsContent value="spend">
        <div className="flex gap-4 flex-col lg:flex-row">
          <div className="w-full lg:w-[300px] shrink-0">
            <SpendInputModes
              selectedDate={selectedDate}
              onDateChange={setSelectedDate}
              onSaved={() => setRefreshKey((k) => k + 1)}
            />
          </div>
          <div className="flex-1">
            <DailyHistory date={selectedDate} type="spend" key={`spend-${refreshKey}`} />
          </div>
        </div>
      </TabsContent>
    </Tabs>
  );
}

function CallInputModes({
  selectedDate,
  onDateChange,
  onSaved,
}: {
  selectedDate: string;
  onDateChange: (d: string) => void;
  onSaved: () => void;
}) {
  const [mode, setMode] = useState<"text" | "direct">("text");

  return (
    <div>
      <div className="flex gap-1 mb-3">
        <button
          onClick={() => setMode("direct")}
          className={`flex-1 text-sm py-1.5 rounded ${
            mode === "direct" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
          }`}
        >
          직접 입력
        </button>
        <button
          onClick={() => setMode("text")}
          className={`flex-1 text-sm py-1.5 rounded ${
            mode === "text" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
          }`}
        >
          텍스트 작성
        </button>
      </div>
      {mode === "text" ? (
        <CallTextInput onSaved={onSaved} />
      ) : (
        <CallDirectInput
          selectedDate={selectedDate}
          onDateChange={onDateChange}
          onSaved={onSaved}
        />
      )}
    </div>
  );
}

function SpendInputModes({
  selectedDate,
  onDateChange,
  onSaved,
}: {
  selectedDate: string;
  onDateChange: (d: string) => void;
  onSaved: () => void;
}) {
  const [mode, setMode] = useState<"text" | "direct">("text");

  return (
    <div>
      <div className="flex gap-1 mb-3">
        <button
          onClick={() => setMode("direct")}
          className={`flex-1 text-sm py-1.5 rounded ${
            mode === "direct" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
          }`}
        >
          직접 입력
        </button>
        <button
          onClick={() => setMode("text")}
          className={`flex-1 text-sm py-1.5 rounded ${
            mode === "text" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
          }`}
        >
          텍스트 작성
        </button>
      </div>
      {mode === "text" ? (
        <SpendTextInput onSaved={onSaved} />
      ) : (
        <SpendDirectInput
          selectedDate={selectedDate}
          onDateChange={onDateChange}
          onSaved={onSaved}
        />
      )}
    </div>
  );
}
```

Create `src/app/(protected)/input/page.tsx`:

```typescript
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { TabContainer } from "@/components/input/tab-container";

export default async function InputPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  const canAccess = ["call_reporter", "spend_reporter", "admin"].includes(profile.role);
  if (!canAccess) redirect("/dashboard");

  return (
    <div className="container mx-auto p-4 max-w-5xl">
      <h1 className="text-xl font-bold mb-4">데이터 입력</h1>
      <TabContainer userRole={profile.role} />
    </div>
  );
}
```

- [ ] **Step 2: 콜량 텍스트 입력 컴포넌트, 직접 입력 컴포넌트, 이력 테이블, 부재 관리 컴포넌트 구현**

각 컴포넌트는 위 TabContainer에서 사용하는 props 인터페이스를 따른다. 상세 구현은 스펙의 "문의 관리 탭" 섹션을 참조하여 구현한다.

핵심 로직:
- `call-text-input.tsx`: textarea → parseCallReport() → 미리보기 → Supabase upsert
- `call-direct-input.tsx`: 개별 필드 입력 → Supabase upsert
- `daily-history.tsx`: 해당 날짜 call_reports + ad_spend 조회하여 테이블 표시
- `absence-manager.tsx`: absence_count > 0인 레코드 조회 → 드롭다운으로 상태 변경 → call_report_logs에 이력 기록

- [ ] **Step 3: 브라우저에서 문의 관리 탭 동작 확인**

1. /input 접속
2. 텍스트 작성 모드에서 보고 텍스트 붙여넣기
3. 파싱 결과 미리보기 확인
4. 저장 → 우측 이력 테이블에 반영 확인
5. 직접 입력 모드 전환 → 입력 → 저장 확인

- [ ] **Step 4: 커밋**

```bash
git add src/components/input/ src/app/\(protected\)/input/
git commit -m "feat: 데이터 입력 — 문의 관리 (텍스트 파싱 + 직접 입력 + 부재 처리)"
```

---

### Task 6: 데이터 입력 — 광고비 관리

**Files:**
- Create: `src/components/input/spend-text-input.tsx`
- Create: `src/components/input/spend-direct-input.tsx`

- [ ] **Step 1: 소진액 텍스트 입력 + 직접 입력 컴포넌트 구현**

핵심 로직:
- `spend-text-input.tsx`: textarea → parseSpendReport() → 미리보기 → Supabase upsert
- `spend-direct-input.tsx`: 날짜/매체/소진액 입력 + "어제와 같은 매체로 입력" 반복 기능 + 자동 CPA 계산 (call_reports에서 콜량 조회)

- [ ] **Step 2: 브라우저에서 광고비 관리 탭 동작 확인**

1. 텍스트 작성 모드 → "네이버 소진액 : 96,432 원" 붙여넣기 → 파싱 → 저장
2. 직접 입력 모드 → 매체 선택 → 금액 입력 → 자동 CPA 표시 → 저장
3. "어제와 같은 매체로 입력" 버튼 동작 확인

- [ ] **Step 3: 커밋**

```bash
git add src/components/input/spend-*
git commit -m "feat: 데이터 입력 — 광고비 관리 (텍스트 파싱 + 직접 입력 + 반복)"
```

---

### Task 7: 대시보드

**Files:**
- Create: `src/app/(protected)/dashboard/page.tsx`
- Create: `src/components/dashboard/filter-bar.tsx`
- Create: `src/components/dashboard/daily-table.tsx`
- Create: `src/components/dashboard/media-table.tsx`
- Create: `src/components/dashboard/call-trend-chart.tsx`
- Create: `src/components/dashboard/media-pie-chart.tsx`
- Create: `src/components/dashboard/daily-swipe-card.tsx`
- Create: `src/components/dashboard/media-swipe-card.tsx`

- [ ] **Step 1: 대시보드 페이지 + 필터 바**

대시보드 페이지는 Server Component로 초기 데이터를 로드하고, 필터/차트는 Client Component로 구현한다.

필터 바: 프리셋 버튼 (오늘/이번주/이번달/지난달) + 날짜 범위 선택 + 매체 필터
- 기본값: 이번주 (최근 7일)
- URL search params로 상태 관리 (공유 가능)

- [ ] **Step 2: 일별 합산 테이블 (PC 기본 뷰)**

`daily-table.tsx`: call_reports + ad_spend를 날짜별로 GROUP BY하여 일별 합산 표시.
- 컬럼: 날짜 | 전체 | 유효 | 무효 | 폐차 | 소진액 | 단가(전체) | 단가(유효)
- 오늘 행은 "09:30 기준" 같은 시점 표시
- 하단 합계 행

- [ ] **Step 3: 매체별 테이블 (PC 매체별 뷰)**

`media-table.tsx`: 날짜별 × 매체별로 펼쳐서 표시.
- 오늘/어제는 펼침, 나머지 접힘 (▸ 토글)
- 각 날짜 아래 네이버/당근/메타/구글 + 소계 행

- [ ] **Step 4: 차트 (바 차트 + 파이 차트)**

`call-trend-chart.tsx`: Recharts BarChart, 바 위에 숫자 표기
`media-pie-chart.tsx`: Recharts PieChart, 범례에 % + 건수 표기

- [ ] **Step 5: 모바일 스와이프 카드**

`daily-swipe-card.tsx`: CSS scroll-snap으로 일별 카드 스와이프 구현. 인디케이터 점 표시.
`media-swipe-card.tsx`: 매체별 카드 스와이프. 다음 카드 살짝 보이도록 overflow 조절.

- [ ] **Step 6: 반응형 레이아웃 통합**

`dashboard/page.tsx`에서:
- PC (lg 이상): 테이블 + 차트 2열
- 모바일: 스와이프 카드 + 차트 1열

Tailwind 반응형 클래스로 분기.

- [ ] **Step 7: 브라우저에서 대시보드 동작 확인**

1. PC에서 일별 테이블 + 차트 확인
2. 날짜 필터 변경 → 데이터 갱신 확인
3. 매체 필터 적용 확인
4. 모바일 뷰포트에서 스와이프 카드 확인
5. 오늘 데이터 시점 표시 확인

- [ ] **Step 8: 커밋**

```bash
git add src/components/dashboard/ src/app/\(protected\)/dashboard/
git commit -m "feat: 대시보드 — 일별/매체별 테이블 + 차트 + 모바일 스와이프"
```

---

### Task 8: 사용자 관리

**Files:**
- Create: `src/app/(protected)/admin/page.tsx`
- Create: `src/components/admin/user-table.tsx`

- [ ] **Step 1: 사용자 관리 페이지 (관리자 전용)**

`admin/page.tsx`: Server Component, role === 'admin' 체크, 아니면 redirect.
`user-table.tsx`: Client Component.
- profiles 테이블 전체 조회
- 테이블: 이메일(진한 파랑) | 가입일(진한 남색) | 상태(초록/빨강) | 역할 | 관리
- 대기 사용자: 역할 드롭다운 + 승인 버튼
- 승인 시 Supabase update profiles SET status='approved', role=선택값
- 역할 변경 버튼

- [ ] **Step 2: 브라우저에서 사용자 관리 동작 확인**

1. admin 계정으로 /admin 접속
2. 대기 중인 사용자에 역할 선택 → 승인
3. 해당 사용자가 로그인하면 대시보드 접근 가능 확인
4. 역할 변경 동작 확인

- [ ] **Step 3: 커밋**

```bash
git add src/components/admin/ src/app/\(protected\)/admin/
git commit -m "feat: 사용자 관리 — 승인/역할 부여/변경"
```

---

### Task 9: 네비게이션 + 레이아웃

**Files:**
- Modify: `src/app/(protected)/layout.tsx`
- Create: `src/components/nav-bar.tsx`

- [ ] **Step 1: 네비게이션 바**

`nav-bar.tsx`: 상단 네비게이션.
- 로고 "GNA 수출 마케팅"
- 메뉴: 대시보드 | 데이터 입력 | 사용자 관리(관리자만)
- 현재 사용자 이름 + 로그아웃 버튼
- 모바일: 햄버거 메뉴

- [ ] **Step 2: protected 레이아웃에 네비게이션 통합**

`(protected)/layout.tsx`에 NavBar 추가.

- [ ] **Step 3: 커밋**

```bash
git add src/components/nav-bar.tsx src/app/\(protected\)/layout.tsx
git commit -m "feat: 네비게이션 바 + 레이아웃 통합"
```

---

### Task 10: 최종 통합 테스트 + Vercel 배포

- [ ] **Step 1: 전체 플로우 E2E 확인**

1. 회원가입 → 승인 대기 → 관리자 승인 → 로그인
2. 문의 관리: 텍스트 붙여넣기 → 파싱 → 저장 → 이력 확인 → 부재 처리
3. 광고비 관리: 텍스트/직접 → 저장 → CPA 자동 계산
4. 대시보드: 일별/매체별 데이터 확인 + 필터 + 차트
5. 모바일: 스와이프 카드 + 입력 플로우
6. 사용자 관리: 역할 변경
7. 비밀번호 찾기: 이메일 발송

- [ ] **Step 2: Vercel 배포**

```bash
npm install -g vercel
vercel
```

Vercel 대시보드에서:
1. 환경 변수 설정 (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY)
2. 도메인 설정 (필요시)
3. 배포 확인

- [ ] **Step 3: 배포 후 외부 접근 확인**

1. 배포 URL로 접속
2. 회원가입 → 로그인 플로우 확인
3. 모바일에서 접속 확인

- [ ] **Step 4: 최종 커밋**

```bash
git add -A
git commit -m "chore: 최종 정리 및 배포 설정"
git push
```
