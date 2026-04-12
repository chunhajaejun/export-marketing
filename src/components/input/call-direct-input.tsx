"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import type { MediaChannel } from "@/lib/types";

const MEDIA_OPTIONS: { value: MediaChannel; label: string }[] = [
  { value: "naver_web", label: "네이버-홈페이지" },
  { value: "naver_landing", label: "네이버-랜딩" },
  { value: "danggeun", label: "당근" },
  { value: "meta", label: "메타" },
  { value: "google", label: "구글" },
];

interface FieldDef {
  key: string;
  label: string;
  color: string;
}

const FIELDS: FieldDef[] = [
  { key: "export_count", label: "수출가능", color: "#4ade80" },
  { key: "used_car_count", label: "중고매입", color: "#4ade80" },
  { key: "scrap_count", label: "폐차", color: "#fbbf24" },
  { key: "phone_naver_count", label: "전화-네이버웹", color: "#4ade80" },
  { key: "absence_count", label: "부재", color: "#60a5fa" },
  { key: "invalid_count", label: "무효", color: "#f87171" },
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
  const [values, setValues] = useState<FieldValues>(() =>
    Object.fromEntries(FIELDS.map((f) => [f.key, 0]))
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const total = Object.values(values).reduce((sum, v) => sum + v, 0);

  const handleChange = useCallback((key: string, raw: string) => {
    const num = parseInt(raw, 10);
    setValues((prev) => ({ ...prev, [key]: isNaN(num) ? 0 : Math.max(0, num) }));
    setSuccess(false);
    setError(null);
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch("/api/data/save-calls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [{
            date: selectedDate,
            media,
            export_count: values.export_count ?? 0,
            used_car_count: values.used_car_count ?? 0,
            scrap_count: values.scrap_count ?? 0,
            absence_count: values.absence_count ?? 0,
            invalid_count: values.invalid_count ?? 0,
            phone_naver_count: values.phone_naver_count ?? 0,
          }],
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "저장 실패");

      setSuccess(true);
      setValues(Object.fromEntries(FIELDS.map((f) => [f.key, 0])));
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  }, [selectedDate, media, values, onSaved]);

  return (
    <div className="space-y-3">
      {/* Date selection */}
      <div>
        <label className="mb-1 block text-xs font-medium text-[#94a3b8]">
          날짜
        </label>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => onDateChange(e.target.value)}
          className="h-8 w-full rounded-lg border border-[#334155] bg-[#0f172a] px-2.5 text-sm text-[#e2e8f0] focus:border-[#3b82f6] focus:outline-none focus:ring-1 focus:ring-[#3b82f6]"
        />
      </div>

      {/* Media selection */}
      <div>
        <label className="mb-1 block text-xs font-medium text-[#94a3b8]">
          매체
        </label>
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

      {/* Detail fields 2-column */}
      <div>
        <label className="mb-1 block text-xs font-medium text-[#94a3b8]">
          세부 내역
        </label>
        <div className="grid grid-cols-2 gap-2">
          {FIELDS.map((field) => (
            <div key={field.key} className="flex items-center gap-1.5">
              <span
                className="w-[90px] shrink-0 text-xs"
                style={{ color: field.color }}
              >
                {field.label}
              </span>
              <input
                type="number"
                min={0}
                className="h-7 w-[50px] rounded-md border border-[#334155] bg-[#0f172a] px-1.5 text-center text-sm text-[#e2e8f0] focus:border-[#3b82f6] focus:outline-none focus:ring-1 focus:ring-[#3b82f6]"
                value={values[field.key] || ""}
                onChange={(e) => handleChange(field.key, e.target.value)}
                placeholder="0"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Total */}
      <div className="flex items-center justify-between rounded-lg bg-[#334155] px-3 py-2 text-sm">
        <span className="font-medium text-[#e2e8f0]">합계</span>
        <span className="font-bold text-[#e2e8f0]">{total}건</span>
      </div>

      {/* Error/Success */}
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

      <Button onClick={handleSave} disabled={saving || total === 0} className="w-full">
        {saving ? "저장 중..." : "저장"}
      </Button>
    </div>
  );
}
