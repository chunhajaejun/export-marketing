"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu, X, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { UserRole } from "@/lib/types";

interface NavBarProps {
  userName: string;
  userRole: UserRole;
  userOrganization?: string | null;
}

const NAV_ITEMS = [
  { href: "/dashboard", label: "대시보드" },
  { href: "/input", label: "데이터 입력" },
] as const;

export function NavBar({ userName, userRole, userOrganization }: NavBarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/signout", { method: "POST" });
      router.push("/login");
    } catch {
      setLoggingOut(false);
    }
  }

  const allItems = [
    ...NAV_ITEMS,
    ...(userRole === "admin"
      ? [
          { href: "/admin" as const, label: "사용자 관리" as const },
          { href: "/admin/naver" as const, label: "네이버 광고" as const },
          { href: "/admin/meta" as const, label: "메타 광고" as const },
        ]
      : []),
  ];

  return (
    <nav className="border-b border-[#334155] bg-[#1e293b]">
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex h-14 items-center justify-between">
          {/* Logo */}
          <Link
            href="/dashboard"
            className="text-sm font-bold text-white sm:text-base"
          >
            투바이어
          </Link>

          {/* Desktop nav */}
          <div className="hidden items-center gap-1 md:flex">
            {allItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-[#3b82f6]/15 text-[#3b82f6]"
                      : "text-[#94a3b8] hover:bg-[#334155] hover:text-[#e2e8f0]"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>

          {/* Desktop right side */}
          <div className="hidden items-center gap-3 md:flex">
            <span className="text-sm text-[#94a3b8]">{userName}{userOrganization ? ` \u00B7 ${userOrganization}` : ""}</span>
            <Button
              size="sm"
              variant="ghost"
              disabled={loggingOut}
              onClick={handleLogout}
              className="gap-1.5 text-[#94a3b8] hover:text-[#e2e8f0]"
            >
              <LogOut className="size-4" />
              {loggingOut ? "로그아웃 중..." : "로그아웃"}
            </Button>
          </div>

          {/* Mobile hamburger */}
          <button
            className="inline-flex items-center justify-center rounded-md p-2 text-[#94a3b8] hover:bg-[#334155] hover:text-[#e2e8f0] md:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="메뉴 열기"
          >
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-t border-[#334155] md:hidden">
          <div className="space-y-1 px-4 py-3">
            {allItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`block rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-[#3b82f6]/15 text-[#3b82f6]"
                      : "text-[#94a3b8] hover:bg-[#334155] hover:text-[#e2e8f0]"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
          <div className="border-t border-[#334155] px-4 py-3">
            <p className="mb-2 text-sm text-[#94a3b8]">{userName}{userOrganization ? ` \u00B7 ${userOrganization}` : ""}</p>
            <Button
              size="sm"
              variant="ghost"
              disabled={loggingOut}
              onClick={handleLogout}
              className="w-full justify-start gap-1.5 text-[#94a3b8] hover:text-[#e2e8f0]"
            >
              <LogOut className="size-4" />
              {loggingOut ? "로그아웃 중..." : "로그아웃"}
            </Button>
          </div>
        </div>
      )}
    </nav>
  );
}
