"use client";

import { useRouter } from "next/navigation";

export function SignOutButton() {
  const router = useRouter();

  const handleSignOut = async () => {
    await fetch("/api/auth/signout", { method: "POST" });
    router.push("/login");
  };

  return (
    <button
      onClick={handleSignOut}
      className="text-sm text-[#64748b] hover:text-white hover:underline"
    >
      로그아웃
    </button>
  );
}
