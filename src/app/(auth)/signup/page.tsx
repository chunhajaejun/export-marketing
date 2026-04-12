import Link from "next/link";
import { SignupForm } from "@/components/auth/signup-form";

export default function SignupPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0f172a] px-4 py-8">
      <div className="w-full max-w-sm rounded-xl border border-[#334155] bg-[#1e293b] p-8">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-bold text-white">회원가입</h1>
          <p className="text-sm text-[#64748b]">관리자 승인 후 이용 가능합니다</p>
        </div>
        <SignupForm />
        <p className="mt-4 text-center text-sm text-[#64748b]">
          이미 계정이 있으신가요? <Link href="/login" className="text-blue-500 hover:underline">로그인</Link>
        </p>
      </div>
    </div>
  );
}
