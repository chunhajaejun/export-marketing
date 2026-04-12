import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0f172a] px-4">
      <div className="w-full max-w-sm rounded-xl border border-[#334155] bg-[#1e293b] p-8">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-bold text-white">(주)지엔에이 수출 마케팅</h1>
          <p className="text-sm text-[#64748b]">광고 성과 분석 대시보드</p>
        </div>
        <LoginForm />
        <div className="mt-4 flex justify-between text-sm">
          <Link href="/signup" className="text-blue-500 hover:underline">회원가입</Link>
          <Link href="/forgot-password" className="text-[#64748b] hover:underline">비밀번호 찾기</Link>
        </div>
      </div>
    </div>
  );
}
