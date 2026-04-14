"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

const ROLE_LABEL: Record<string, string> = {
  call_reporter: "인바운드 매니저",
  spend_reporter: "미디어 매니저",
  viewer: "열람자",
  admin: "마스터",
};

interface Initial {
  name: string;
  phone: string;
  organization: string;
  email: string;
  role: string;
  status: string;
}

export function ProfileForm({ initial }: { initial: Initial }) {
  const [name, setName] = useState(initial.name);
  const [phone, setPhone] = useState(initial.phone);
  const [organization, setOrganization] = useState(initial.organization);

  const [savingInfo, setSavingInfo] = useState(false);
  const [infoMsg, setInfoMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [savingPw, setSavingPw] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  async function saveInfo() {
    setSavingInfo(true);
    setInfoMsg(null);
    try {
      const res = await fetch("/api/profile/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, organization }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "저장 실패");
      setInfoMsg({ type: "ok", text: "저장 완료" });
    } catch (e) {
      setInfoMsg({
        type: "err",
        text: e instanceof Error ? e.message : "저장 실패",
      });
    } finally {
      setSavingInfo(false);
    }
  }

  async function changePw() {
    setPwMsg(null);
    if (newPw.length < 8) {
      setPwMsg({ type: "err", text: "새 비밀번호는 8자 이상이어야 합니다." });
      return;
    }
    if (newPw !== confirmPw) {
      setPwMsg({ type: "err", text: "새 비밀번호 확인이 일치하지 않습니다." });
      return;
    }
    setSavingPw(true);
    try {
      const res = await fetch("/api/profile/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current_password: currentPw, new_password: newPw }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "변경 실패");
      setPwMsg({ type: "ok", text: "비밀번호가 변경됐습니다." });
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
    } catch (e) {
      setPwMsg({
        type: "err",
        text: e instanceof Error ? e.message : "변경 실패",
      });
    } finally {
      setSavingPw(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* 계정 정보 */}
      <section className="rounded-xl border border-[#334155] bg-[#1e293b] p-5">
        <h2 className="mb-4 text-base font-semibold text-[#e2e8f0]">계정 정보</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="이메일" value={initial.email} readOnly />
          <Field
            label="역할"
            value={ROLE_LABEL[initial.role] ?? initial.role}
            readOnly
          />
          <Field
            label="상태"
            value={initial.status === "approved" ? "승인됨" : initial.status}
            readOnly
          />
        </div>
      </section>

      {/* 기본 정보 수정 */}
      <section className="rounded-xl border border-[#334155] bg-[#1e293b] p-5">
        <h2 className="mb-4 text-base font-semibold text-[#e2e8f0]">기본 정보 수정</h2>
        <div className="space-y-3">
          <Field
            label="이름"
            value={name}
            onChange={setName}
            required
          />
          <Field label="연락처" value={phone} onChange={setPhone} placeholder="010-0000-0000" />
          <Field label="소속" value={organization} onChange={setOrganization} />
          {infoMsg && (
            <div
              className={`rounded-md px-3 py-2 text-sm ${
                infoMsg.type === "ok"
                  ? "bg-[#4ade80]/10 text-[#4ade80] border border-[#4ade80]/20"
                  : "bg-[#f87171]/10 text-[#f87171] border border-[#f87171]/20"
              }`}
            >
              {infoMsg.text}
            </div>
          )}
          <Button
            disabled={savingInfo}
            onClick={saveInfo}
            className="bg-[#3b82f6] text-white hover:bg-[#3b82f6]/80"
          >
            {savingInfo ? "저장 중..." : "저장"}
          </Button>
        </div>
      </section>

      {/* 비밀번호 변경 */}
      <section className="rounded-xl border border-[#334155] bg-[#1e293b] p-5">
        <h2 className="mb-4 text-base font-semibold text-[#e2e8f0]">비밀번호 변경</h2>
        <div className="space-y-3">
          <Field
            type="password"
            label="현재 비밀번호"
            value={currentPw}
            onChange={setCurrentPw}
          />
          <Field
            type="password"
            label="새 비밀번호 (8자 이상)"
            value={newPw}
            onChange={setNewPw}
          />
          <Field
            type="password"
            label="새 비밀번호 확인"
            value={confirmPw}
            onChange={setConfirmPw}
          />
          {pwMsg && (
            <div
              className={`rounded-md px-3 py-2 text-sm ${
                pwMsg.type === "ok"
                  ? "bg-[#4ade80]/10 text-[#4ade80] border border-[#4ade80]/20"
                  : "bg-[#f87171]/10 text-[#f87171] border border-[#f87171]/20"
              }`}
            >
              {pwMsg.text}
            </div>
          )}
          <Button
            disabled={savingPw || !currentPw || !newPw || !confirmPw}
            onClick={changePw}
            className="bg-[#3b82f6] text-white hover:bg-[#3b82f6]/80"
          >
            {savingPw ? "변경 중..." : "비밀번호 변경"}
          </Button>
        </div>
      </section>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  readOnly,
  type = "text",
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange?: (v: string) => void;
  readOnly?: boolean;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-[#94a3b8]">
        {label}
        {required && <span className="ml-1 text-[#f87171]">*</span>}
      </span>
      <input
        type={type}
        value={value}
        readOnly={readOnly}
        placeholder={placeholder}
        onChange={(e) => onChange?.(e.target.value)}
        className={`h-9 w-full rounded-md border border-[#334155] bg-[#0f172a] px-3 text-sm text-[#e2e8f0] focus:border-[#3b82f6] focus:outline-none focus:ring-1 focus:ring-[#3b82f6] ${
          readOnly ? "opacity-60" : ""
        }`}
      />
    </label>
  );
}
