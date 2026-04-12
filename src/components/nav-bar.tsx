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
}

const NAV_ITEMS = [
  { href: "/dashboard", label: "대시보드" },
  { href: "/input", label: "데이터 입력" },
] as const;

export function NavBar({ userName, userRole }: NavBarProps) {
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
      ? [{ href: "/admin" as const, label: "사용자 관리" as const }]
      : []),
  ];

  return (
    <nav className="border-b border-border bg-card">
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex h-14 items-center justify-between">
          {/* Logo */}
          <Link
            href="/dashboard"
            className="text-sm font-bold text-foreground sm:text-base"
          >
            수출 마케팅 대시보드
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
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>

          {/* Desktop right side */}
          <div className="hidden items-center gap-3 md:flex">
            <span className="text-sm text-muted-foreground">{userName}</span>
            <Button
              size="sm"
              variant="ghost"
              disabled={loggingOut}
              onClick={handleLogout}
              className="gap-1.5"
            >
              <LogOut className="size-4" />
              {loggingOut ? "로그아웃 중..." : "로그아웃"}
            </Button>
          </div>

          {/* Mobile hamburger */}
          <button
            className="inline-flex items-center justify-center rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground md:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="메뉴 열기"
          >
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-t border-border md:hidden">
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
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
          <div className="border-t border-border px-4 py-3">
            <p className="mb-2 text-sm text-muted-foreground">{userName}</p>
            <Button
              size="sm"
              variant="ghost"
              disabled={loggingOut}
              onClick={handleLogout}
              className="w-full justify-start gap-1.5"
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
