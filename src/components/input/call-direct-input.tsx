"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
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
  { key: "export_count", label: "수출가능", color: "text-green-600" },
  { key: "used_car_count", label: "중고매입", color: "text-green-600" },
  { key: "scrap_count", label: "폐차", color: "text-yellow-600" },
  { key: "phone_naver_count", label: "전화-네이버웹 추정", color: "text-green-600" },
  { key: "absence_count", label: "부재", color: "text-blue-600" },
  { key: "invalid_count", label: "무효", color: "text-red-600" },
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
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("인증 정보가 없습니다.");

      const validTotal =
        (values.export_count ?? 0) +
        (values.used_car_count ?? 0) +
        (values.phone_naver_count ?? 0);

      const { error: upsertError } = await supabase
        .from("call_reports")
        .upsert(
          {
            date: selectedDate,
            media,
            export_count: values.export_count ?? 0,
            used_car_count: values.used_car_count ?? 0,
            scrap_count: values.scrap_count ?? 0,
            absence_count: values.absence_count ?? 0,
            invalid_count: values.invalid_count ?? 0,
            phone_naver_count: values.phone_naver_count ?? 0,
            valid_total: validTotal,
            total_count: total,
            reporter_id: user.id,
            reported_at: new Date().toISOString(),
          },
          { onConflict: "date,media" }
        );

      if (upsertError) throw upsertError;

      setSuccess(true);
      setValues(Object.fromEntries(FIELDS.map((f) => [f.key, 0])));
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  }, [selectedDate, media, values, total, onSaved]);

  return (
    <div className="space-y-3">
      {/* 날짜 선택 */}
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">
          날짜
        </label>
        <Input
          type="date"
          value={selectedDate}
          onChange={(e) => onDateChange(e.target.value)}
        />
      </div>

      {/* 매체 선택 */}
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">
          매체
        </label>
        <select
          className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none dark:bg-input/30"
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

      {/* 세부 내역 2열 */}
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">
          세부 내역
        </label>
        <div className="grid grid-cols-2 gap-2">
          {FIELDS.map((field) => (
            <div key={field.key} className="flex items-center gap-1.5">
              <span className={`w-[90px] shrink-0 text-xs ${field.color}`}>
                {field.label}
              </span>
              <Input
                type="number"
                min={0}
                className="w-[50px] px-1.5 text-center"
                value={values[field.key] || ""}
                onChange={(e) => handleChange(field.key, e.target.value)}
                placeholder="0"
              />
            </div>
          ))}
        </div>
      </div>

      {/* 합계 */}
      <div className="flex items-center justify-between rounded-lg bg-muted px-3 py-2 text-sm">
        <span className="font-medium">합계</span>
        <span className="font-bold">{total}건</span>
      </div>

      {/* 에러/성공 */}
      {error && (
        <div className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg bg-green-500/10 px-3 py-2 text-sm text-green-700 dark:text-green-400">
          저장 완료
        </div>
      )}

      <Button onClick={handleSave} disabled={saving || total === 0} className="w-full">
        {saving ? "저장 중..." : "저장"}
      </Button>
    </div>
  );
}
