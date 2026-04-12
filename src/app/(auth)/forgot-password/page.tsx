import Link from "next/link";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0f172a] px-4">
      <div className="w-full max-w-sm rounded-xl border border-[#334155] bg-[#1e293b] p-8">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-bold text-white">비밀번호 찾기</h1>
        </div>
        <ForgotPasswordForm />
        <p className="mt-4 text-center">
          <Link href="/login" className="text-sm text-[#64748b] hover:underline">← 로그인으로 돌아가기</Link>
        </p>
      </div>
    </div>
  );
}
