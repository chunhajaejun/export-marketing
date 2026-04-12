"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, parseCurrencyInput } from "@/lib/utils/currency-format";
import { formatDate } from "@/lib/utils/date-utils";
import type { MediaChannel } from "@/lib/types";

const MEDIA_OPTIONS: { value: MediaChannel; label: string }[] = [
  { value: "naver_web", label: "네이버-홈페이지" },
  { value: "naver_landing", label: "네이버-랜딩" },
  { value: "danggeun", label: "당근" },
  { value: "meta", label: "메타" },
  { value: "google", label: "구글" },
];

interface SpendDirectInputProps {
  selectedDate: string;
  onDateChange: (date: string) => void;
  onSaved: () => void;
}

export function SpendDirectInput({
  selectedDate,
  onDateChange,
  onSaved,
}: SpendDirectInputProps) {
  const [media, setMedia] = useState<MediaChannel>("naver_web");
  const [amountInput, setAmountInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // CPA 관련
  const [cpaTotal, setCpaTotal] = useState<number | null>(null);
  const [cpaValid, setCpaValid] = useState<number | null>(null);
  const [loadingCpa, setLoadingCpa] = useState(false);

  const amount = parseCurrencyInput(amountInput);

  // 금액 입력 시 콤마 자동 포맷
  const handleAmountChange = useCallback((raw: string) => {
    const num = parseCurrencyInput(raw);
    setAmountInput(num > 0 ? num.toLocaleString("ko-KR") : "");
    setSuccess(false);
    setError(null);
  }, []);

  // CPA 자동 계산: 날짜+매체 변경 시 콜량 조회
  useEffect(() => {
    if (!selectedDate || !media) {
      setCpaTotal(null);
      setCpaValid(null);
      return;
    }

    let cancelled = false;

    async function fetchCpa() {
      setLoadingCpa(true);
      try {
        const supabase = createClient();
        const { data: calls } = await supabase
          .from("call_reports")
          .select("total_count, valid_total")
          .eq("date", selectedDate)
          .eq("media", media)
          .single();

        if (cancelled) return;

        if (calls && amount > 0) {
          setCpaTotal(
            calls.total_count > 0
              ? Math.round(amount / calls.total_count)
              : null
          );
          setCpaValid(
            calls.valid_total > 0
              ? Math.round(amount / calls.valid_total)
              : null
          );
        } else {
          setCpaTotal(null);
          setCpaValid(null);
        }
      } catch {
        if (!cancelled) {
          setCpaTotal(null);
          setCpaValid(null);
        }
      } finally {
        if (!cancelled) setLoadingCpa(false);
      }
    }

    fetchCpa();
    return () => {
      cancelled = true;
    };
  }, [selectedDate, media, amount]);

  // 어제와 같은 매체로 입력
  const handleYesterdayMedias = useCallback(async () => {
    setError(null);
    try {
      const supabase = createClient();
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const { data } = await supabase
        .from("ad_spend")
        .select("media")
        .eq("date", formatDate(yesterday));

      if (!data || data.length === 0) {
        setError("전일 소진액 데이터가 없습니다.");
        return;
      }

      // 첫 번째 매체를 선택
      setMedia(data[0].media as MediaChannel);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "매체 조회 중 오류가 발생했습니다."
      );
    }
  }, []);

  const handleSave = useCallback(async () => {
    if (amount <= 0) return;
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("인증 정보가 없습니다.");

      const { error: upsertError } = await supabase
        .from("ad_spend")
        .upsert(
          {
            date: selectedDate,
            media,
            amount,
            reporter_id: user.id,
          },
          { onConflict: "date,media" }
        );

      if (upsertError) throw upsertError;

      setSuccess(true);
      setAmountInput("");
      onSaved();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "저장 중 오류가 발생했습니다."
      );
    } finally {
      setSaving(false);
    }
  }, [selectedDate, media, amount, onSaved]);

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

      {/* 어제와 같은 매체 버튼 */}
      <Button
        variant="outline"
        size="sm"
        className="w-full"
        onClick={handleYesterdayMedias}
      >
        어제와 같은 매체로 입력
      </Button>

      {/* 소진액 입력 */}
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">
          소진액
        </label>
        <div className="relative">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            &#8361;
          </span>
          <Input
            type="text"
            inputMode="numeric"
            className="pl-7"
            placeholder="0"
            value={amountInput}
            onChange={(e) => handleAmountChange(e.target.value)}
          />
        </div>
      </div>

      {/* CPA 자동 계산 */}
      {amount > 0 && (
        <div className="rounded-lg bg-muted px-3 py-2 text-sm">
          <div className="mb-1 text-xs font-medium text-muted-foreground">
            자동 CPA 계산
          </div>
          {loadingCpa ? (
            <span className="text-xs text-muted-foreground">계산 중...</span>
          ) : (
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-muted-foreground">단가(전체): </span>
                <span className="font-semibold">
                  {cpaTotal !== null ? formatCurrency(cpaTotal) : "-"}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">단가(유효): </span>
                <span className="font-semibold">
                  {cpaValid !== null ? formatCurrency(cpaValid) : "-"}
                </span>
              </div>
            </div>
          )}
          {cpaTotal === null && cpaValid === null && !loadingCpa && (
            <span className="text-xs text-muted-foreground">
              해당 날짜/매체의 콜 데이터가 없습니다
            </span>
          )}
        </div>
      )}

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

      <Button
        onClick={handleSave}
        disabled={saving || amount <= 0}
        className="w-full"
      >
        {saving ? "저장 중..." : "저장"}
      </Button>
    </div>
  );
}
