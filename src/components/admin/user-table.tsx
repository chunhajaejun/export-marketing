"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
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

  const supabase = createClient();

  async function handleApprove(userId: string) {
    const role = selectedRoles[userId] || "viewer";
    setLoading(userId);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ status: "approved", role })
        .eq("id", userId);

      if (error) throw error;

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
      const { error } = await supabase
        .from("profiles")
        .update({ role })
        .eq("id", userId);

      if (error) throw error;

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

  return (
    <div className="space-y-6">
      {/* User table */}
      <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>이메일</TableHead>
              <TableHead>가입일</TableHead>
              <TableHead>상태</TableHead>
              <TableHead>역할</TableHead>
              <TableHead>관리</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell
                  className="font-bold"
                  style={{ color: "#2563eb" }}
                >
                  {user.email}
                </TableCell>
                <TableCell
                  className="font-bold"
                  style={{ color: "#1e293b" }}
                >
                  {formatDate(user.created_at)}
                </TableCell>
                <TableCell>
                  {user.status === "approved" ? (
                    <span
                      className="font-bold"
                      style={{ color: "#16a34a" }}
                    >
                      승인
                    </span>
                  ) : (
                    <span
                      className="font-bold"
                      style={{ color: "#dc2626" }}
                    >
                      대기
                    </span>
                  )}
                </TableCell>
                <TableCell
                  className="font-bold"
                  style={{ color: "#1e293b" }}
                >
                  {ROLE_LABEL[user.role] || user.role}
                </TableCell>
                <TableCell>
                  {user.status === "pending" ? (
                    <div className="flex items-center gap-2">
                      <select
                        className="rounded-md border border-input bg-background px-2 py-1 text-sm"
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
                      <button
                        className="rounded-md px-3 py-1 text-sm font-bold text-white disabled:opacity-50"
                        style={{ backgroundColor: "#16a34a" }}
                        disabled={loading === user.id}
                        onClick={() => handleApprove(user.id)}
                      >
                        {loading === user.id ? "처리중..." : "승인"}
                      </button>
                    </div>
                  ) : editingUserId === user.id ? (
                    <div className="flex items-center gap-2">
                      <select
                        className="rounded-md border border-input bg-background px-2 py-1 text-sm"
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
            {users.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  등록된 사용자가 없습니다.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Role permission info */}
      <div className="rounded-xl bg-muted/30 p-4 ring-1 ring-foreground/10">
        <h3 className="mb-3 text-sm font-bold">역할 권한 안내</h3>
        <ul className="space-y-1 text-sm text-muted-foreground">
          <li>
            <span className="font-semibold text-foreground">콜량보고</span> —
            대시보드 조회 + 문의 관리 탭 입력
          </li>
          <li>
            <span className="font-semibold text-foreground">소진액보고</span> —
            대시보드 조회 + 광고비 관리 탭 입력
          </li>
          <li>
            <span className="font-semibold text-foreground">뷰어</span> —
            대시보드 조회만
          </li>
          <li>
            <span className="font-semibold text-foreground">관리자</span> —
            전체 접근 + 사용자 관리
          </li>
        </ul>
        <p className="mt-3 text-xs text-muted-foreground">
          * 비밀번호 찾기 기능은 로그인 화면에서 이용 가능
        </p>
      </div>
    </div>
  );
}
