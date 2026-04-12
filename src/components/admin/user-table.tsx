"use client";

import { useState } from "react";
import type { Profile, UserRole } from "@/lib/types";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: "call_reporter", label: "콜량보고" },
  { value: "spend_reporter", label: "소진액보고" },
  { value: "viewer", label: "뷰어" },
  { value: "admin", label: "관리자" },
];

const ROLE_LABEL: Record<UserRole, string> = {
  call_reporter: "콜량보고",
  spend_reporter: "소진액보고",
  viewer: "뷰어",
  admin: "관리자",
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export function UserTable({ initialUsers }: { initialUsers: Profile[] }) {
  const [users, setUsers] = useState<Profile[]>(initialUsers);
  const [selectedRoles, setSelectedRoles] = useState<Record<string, UserRole>>(
    {}
  );
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  async function handleApprove(userId: string) {
    const role = selectedRoles[userId] || "viewer";
    setLoading(userId);
    try {
      const res = await fetch("/api/admin/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role, status: "approved" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "승인 실패");

      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId ? { ...u, status: "approved" as const, role } : u
        )
      );
    } catch (err) {
      console.error("승인 실패:", err);
      alert("승인에 실패했습니다.");
    } finally {
      setLoading(null);
    }
  }

  async function handleRoleChange(userId: string) {
    const role = selectedRoles[userId];
    if (!role) return;

    setLoading(userId);
    try {
      const res = await fetch("/api/admin/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role, status: "approved" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "역할 변경 실패");

      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role } : u))
      );
      setEditingUserId(null);
    } catch (err) {
      console.error("역할 변경 실패:", err);
      alert("역할 변경에 실패했습니다.");
    } finally {
      setLoading(null);
    }
  }

  // 대기 사용자와 승인 사용자 분리
  const pendingUsers = users.filter((u) => u.status === "pending");
  const approvedUsers = users.filter((u) => u.status === "approved");

  return (
    <div className="space-y-6">
      {/* 대기 사용자 */}
      {pendingUsers.length > 0 && (
        <div>
          <h2 className="mb-3 flex items-center gap-2 text-base font-semibold">
            승인 대기
            <Badge variant="destructive">{pendingUsers.length}</Badge>
          </h2>
          <div className="overflow-hidden rounded-xl border border-[#334155] bg-[#1e293b]">
            <Table>
              <TableHeader>
                <TableRow className="border-[#334155] bg-[#0f172a] hover:bg-[#0f172a]">
                  <TableHead>이메일</TableHead>
                  <TableHead>가입일</TableHead>
                  <TableHead>역할 선택</TableHead>
                  <TableHead>관리</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingUsers.map((user) => (
                  <TableRow key={user.id} className="border-[#334155] hover:bg-[#334155]/50">
                    <TableCell className="font-bold text-[#3b82f6]">
                      {user.email}
                    </TableCell>
                    <TableCell className="font-semibold text-[#e2e8f0]">
                      {formatDate(user.created_at)}
                    </TableCell>
                    <TableCell>
                      <select
                        className="h-8 rounded-md border border-[#334155] bg-[#0f172a] px-2 py-1 text-sm text-[#e2e8f0] focus:border-[#3b82f6] focus:outline-none focus:ring-1 focus:ring-[#3b82f6]"
                        value={selectedRoles[user.id] || "viewer"}
                        onChange={(e) =>
                          setSelectedRoles((prev) => ({
                            ...prev,
                            [user.id]: e.target.value as UserRole,
                          }))
                        }
                      >
                        {ROLE_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        disabled={loading === user.id}
                        onClick={() => handleApprove(user.id)}
                        className="bg-[#4ade80] text-[#0f172a] hover:bg-[#4ade80]/80"
                      >
                        {loading === user.id ? "처리중..." : "승인"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* 승인된 사용자 */}
      <div>
        <h2 className="mb-3 text-base font-semibold">
          사용자 목록
          <span className="ml-2 text-sm font-normal text-[#94a3b8]">
            {approvedUsers.length}명
          </span>
        </h2>
        <div className="overflow-hidden rounded-xl border border-[#334155] bg-[#1e293b]">
          <Table>
            <TableHeader>
              <TableRow className="border-[#334155] bg-[#0f172a] hover:bg-[#0f172a]">
                <TableHead>이메일</TableHead>
                <TableHead>가입일</TableHead>
                <TableHead>상태</TableHead>
                <TableHead>역할</TableHead>
                <TableHead>관리</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {approvedUsers.map((user) => (
                <TableRow key={user.id} className="border-[#334155] hover:bg-[#334155]/50">
                  <TableCell className="font-bold text-[#3b82f6]">
                    {user.email}
                  </TableCell>
                  <TableCell className="font-semibold text-[#e2e8f0]">
                    {formatDate(user.created_at)}
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#4ade80]">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#4ade80]" />
                      승인
                    </span>
                  </TableCell>
                  <TableCell className="font-semibold text-[#e2e8f0]">
                    {ROLE_LABEL[user.role] || user.role}
                  </TableCell>
                  <TableCell>
                    {editingUserId === user.id ? (
                      <div className="flex items-center gap-2">
                        <select
                          className="h-8 rounded-md border border-[#334155] bg-[#0f172a] px-2 py-1 text-sm text-[#e2e8f0] focus:border-[#3b82f6] focus:outline-none focus:ring-1 focus:ring-[#3b82f6]"
                          value={selectedRoles[user.id] || user.role}
                          onChange={(e) =>
                            setSelectedRoles((prev) => ({
                              ...prev,
                              [user.id]: e.target.value as UserRole,
                            }))
                          }
                        >
                          {ROLE_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                        <Button
                          size="sm"
                          disabled={loading === user.id}
                          onClick={() => handleRoleChange(user.id)}
                        >
                          {loading === user.id ? "처리중..." : "저장"}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingUserId(null);
                            setSelectedRoles((prev) => {
                              const next = { ...prev };
                              delete next[user.id];
                              return next;
                            });
                          }}
                        >
                          취소
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingUserId(user.id);
                          setSelectedRoles((prev) => ({
                            ...prev,
                            [user.id]: user.role,
                          }));
                        }}
                      >
                        역할 변경
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {approvedUsers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-[#94a3b8]">
                    등록된 사용자가 없습니다.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Role permission info */}
      <div className="rounded-xl border border-[#334155] bg-[#1e293b] p-4">
        <h3 className="mb-3 text-sm font-bold text-[#e2e8f0]">역할 권한 안내</h3>
        <ul className="space-y-1 text-sm text-[#94a3b8]">
          <li>
            <span className="font-semibold text-[#e2e8f0]">콜량보고</span> —
            대시보드 조회 + 문의 관리 탭 입력
          </li>
          <li>
            <span className="font-semibold text-[#e2e8f0]">소진액보고</span> —
            대시보드 조회 + 광고비 관리 탭 입력
          </li>
          <li>
            <span className="font-semibold text-[#e2e8f0]">뷰어</span> —
            대시보드 조회만
          </li>
          <li>
            <span className="font-semibold text-[#e2e8f0]">관리자</span> —
            전체 접근 + 사용자 관리
          </li>
        </ul>
        <p className="mt-3 text-xs text-[#94a3b8]">
          * 비밀번호 찾기 기능은 로그인 화면에서 이용 가능
        </p>
      </div>
    </div>
  );
}
