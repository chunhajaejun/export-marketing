"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import type { MediaChannel } from "@/lib/types";

const MEDIA_OPTIONS: { value: MediaChannel; label: string }[] = [
  { value: "naver_web", label: "네이버-홈페이지" },
  { value: "naver_landing", label: "네이버-랜딩" },
  { value: "danggeun", label: "당근" },
  { value: "meta", label: "메타" },
  { value: "google", label: "구글" },
];

// 각 매체의 입력 규칙
const MEDIA_RULES: Record<
  MediaChannel,
  { hasPhone: boolean; hasApi: boolean; hasManualWeb: boolean }
> = {
  naver_web: { hasPhone: true, hasApi: true, hasManualWeb: false },
  naver_landing: { hasPhone: true, hasApi: true, hasManualWeb: false },
  meta: { hasPhone: false, hasApi: true, hasManualWeb: false },
  google: { hasPhone: false, hasApi: false, hasManualWeb: true },
  danggeun: { hasPhone: true, hasApi: false, hasManualWeb: true },
};

interface FieldDef {
  key: string;
  label: string;
  color: string;
  group: "valid" | "other";
}

const CLASSIFICATION_FIELDS: FieldDef[] = [
  { key: "export_count", label: "수출", color: "#4ade80", group: "valid" },
  { key: "used_car_count", label: "매입", color: "#4ade80", group: "valid" },
  { key: "scrap_count", label: "폐차", color: "#4ade80", group: "valid" },
  { key: "absence_count", label: "부재", color: "#60a5fa", group: "other" },
  { key: "invalid_count", label: "무효", color: "#f87171", group: "other" },
];

type FieldValues = Record<string, number>;

interface CallDirectInputProps {
  selectedDate: string;
  onDateChange: (date: string) => void;
  onSaved: () => void;
}

export function CallDirectInput({
  selectedDate,
  onDateChange,
  onSaved,
}: CallDirectInputProps) {
  const [media, setMedia] = useState<MediaChannel>("naver_web");
  const [phoneCount, setPhoneCount] = useState(0);
  const [manualWebCount, setManualWebCount] = useState(0);
  const [values, setValues] = useState<FieldValues>(() =>
    Object.fromEntries(CLASSIFICATION_FIELDS.map((f) => [f.key, 0]))
  );
  const [apiWebCount, setApiWebCount] = useState<number | null>(null);
  const [apiLoading, setApiLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const rules = MEDIA_RULES[media];
  const webCount = rules.hasApi ? (apiWebCount ?? 0) : manualWebCount;
  const totalInquiry = (rules.hasPhone ? phoneCount : 0) + webCount;
  const classificationSum =
    (values.export_count ?? 0) +
    (values.used_car_count ?? 0) +
    (values.scrap_count ?? 0) +
    (values.absence_count ?? 0) +
    (values.invalid_count ?? 0);
  const mismatch = classificationSum !== totalInquiry;

  // API 매체일 때 자동 웹문의 수 조회
  useEffect(() => {
    if (!rules.hasApi) {
      setApiWebCount(null);
      return;
    }
    let cancelled = false;
    setApiLoading(true);
    fetch(`/api/data/api-web-count?date=${selectedDate}&media=${media}`)
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setApiWebCount(Number(d.api_web_count ?? 0));
      })
      .catch(() => !cancelled && setApiWebCount(0))
      .finally(() => !cancelled && setApiLoading(false));
    return () => {
      cancelled = true;
    };
  }, [selectedDate, media, rules.hasApi]);

  const handleChange = useCallback((key: string, raw: string) => {
    const num = parseInt(raw, 10);
    setValues((prev) => ({
      ...prev,
      [key]: isNaN(num) ? 0 : Math.max(0, num),
    }));
    setSuccess(false);
    setError(null);
  }, []);

  const handleSave = useCallback(async () => {
    if (mismatch) {
      setError(
        `분류 합(${classificationSum})이 총 문의량(${totalInquiry})과 일치하지 않습니다.`
      );
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch("/api/data/save-calls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [
            {
              date: selectedDate,
              media,
              phone_count: rules.hasPhone ? phoneCount : 0,
              manual_web_count: rules.hasManualWeb ? manualWebCount : 0,
              export_count: values.export_count ?? 0,
              used_car_count: values.used_car_count ?? 0,
              scrap_count: values.scrap_count ?? 0,
              absence_count: values.absence_count ?? 0,
              invalid_count: values.invalid_count ?? 0,
            },
          ],
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "저장 실패");

      setSuccess(true);
      setPhoneCount(0);
      setManualWebCount(0);
      setValues(Object.fromEntries(CLASSIFICATION_FIELDS.map((f) => [f.key, 0])));
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  }, [
    selectedDate,
    media,
    phoneCount,
    manualWebCount,
    values,
    rules,
    mismatch,
    classificationSum,
    totalInquiry,
    onSaved,
  ]);

  return (
    <div className="space-y-3">
      {/* Date */}
      <div>
        <label className="mb-1 block text-xs font-medium text-[#94a3b8]">날짜</label>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => onDateChange(e.target.value)}
          className="h-8 w-full rounded-lg border border-[#334155] bg-[#0f172a] px-2.5 text-sm text-[#e2e8f0] focus:border-[#3b82f6] focus:outline-none focus:ring-1 focus:ring-[#3b82f6]"
        />
      </div>

      {/* Media */}
      <div>
        <label className="mb-1 block text-xs font-medium text-[#94a3b8]">매체</label>
        <select
          className="h-8 w-full rounded-lg border border-[#334155] bg-[#0f172a] px-2.5 text-sm text-[#e2e8f0] focus:border-[#3b82f6] focus:outline-none focus:ring-1 focus:ring-[#3b82f6]"
          value={media}
          onChange={(e) => setMedia(e.target.value as MediaChannel)}
        >
          {MEDIA_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* 전화량 */}
      {rules.hasPhone && (
        <div className="flex items-center gap-2">
          <label className="w-[110px] shrink-0 text-xs font-medium text-[#e2e8f0]">
            📞 전화량
          </label>
          <input
            type="number"
            min={0}
            className="h-8 w-[90px] rounded-md border border-[#334155] bg-[#0f172a] px-2 text-center text-sm text-[#e2e8f0] focus:border-[#3b82f6] focus:outline-none focus:ring-1 focus:ring-[#3b82f6]"
            value={phoneCount || ""}
            onChange={(e) => {
              const n = parseInt(e.target.value, 10);
              setPhoneCount(isNaN(n) ? 0 : Math.max(0, n));
              setSuccess(false);
            }}
            placeholder="0"
          />
        </div>
      )}

      {/* 웹문의 */}
      <div className="flex items-center gap-2">
        <label className="w-[110px] shrink-0 text-xs font-medium text-[#e2e8f0]">
          🌐 웹문의
        </label>
        {rules.hasApi ? (
          <div className="flex items-center gap-2 text-sm text-[#94a3b8]">
            <span className="rounded bg-[#334155] px-2 py-1 text-xs font-bold text-[#e2e8f0]">
              {apiLoading ? "..." : apiWebCount ?? 0}
            </span>
            <span className="text-xs">API 자동 집계</span>
          </div>
        ) : (
          <input
            type="number"
            min={0}
            className="h-8 w-[90px] rounded-md border border-[#334155] bg-[#0f172a] px-2 text-center text-sm text-[#e2e8f0] focus:border-[#3b82f6] focus:outline-none focus:ring-1 focus:ring-[#3b82f6]"
            value={manualWebCount || ""}
            onChange={(e) => {
              const n = parseInt(e.target.value, 10);
              setManualWebCount(isNaN(n) ? 0 : Math.max(0, n));
              setSuccess(false);
            }}
            placeholder="0"
          />
        )}
      </div>

      {/* 총 문의 */}
      <div className="flex items-center justify-between rounded-lg bg-[#1e293b] border border-[#334155] px-3 py-2 text-sm">
        <span className="text-[#94a3b8]">총 문의</span>
        <span className="font-bold text-[#e2e8f0]">{totalInquiry}건</span>
      </div>

      {/* 분류 */}
      <div>
        <label className="mb-1 block text-xs font-medium text-[#94a3b8]">
          분류 (유효: 수출·매입·폐차 / 무효 / 부재)
        </label>
        <div className="grid grid-cols-2 gap-2">
          {CLASSIFICATION_FIELDS.map((field) => (
            <div key={field.key} className="flex items-center gap-1.5">
              <span
                className="w-[60px] shrink-0 text-xs"
                style={{ color: field.color }}
              >
                {field.label}
              </span>
              <input
                type="number"
                min={0}
                className="h-7 w-[60px] rounded-md border border-[#334155] bg-[#0f172a] px-1.5 text-center text-sm text-[#e2e8f0] focus:border-[#3b82f6] focus:outline-none focus:ring-1 focus:ring-[#3b82f6]"
                value={values[field.key] || ""}
                onChange={(e) => handleChange(field.key, e.target.value)}
                placeholder="0"
              />
            </div>
          ))}
        </div>
      </div>

      {/* 검증 */}
      <div
        className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${
          mismatch && classificationSum > 0
            ? "bg-[#f87171]/10 border border-[#f87171]/30 text-[#f87171]"
            : "bg-[#334155] text-[#e2e8f0]"
        }`}
      >
        <span>분류 합</span>
        <span className="font-bold">
          {classificationSum}건{" "}
          {mismatch && classificationSum > 0
            ? `⚠️ 총 ${totalInquiry}과 불일치`
            : classificationSum > 0
            ? "✓"
            : ""}
        </span>
      </div>

      {error && (
        <div className="rounded-lg bg-[#f87171]/10 border border-[#f87171]/20 px-3 py-2 text-sm text-[#f87171]">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg bg-[#4ade80]/10 border border-[#4ade80]/20 px-3 py-2 text-sm text-[#4ade80]">
          저장 완료
        </div>
      )}

      <Button
        onClick={handleSave}
        disabled={saving || classificationSum === 0}
        className="w-full"
      >
        {saving ? "저장 중..." : "저장"}
      </Button>
    </div>
  );
}
