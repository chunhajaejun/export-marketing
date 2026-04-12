"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { parseSpendReport } from "@/lib/parsers/spend-report-parser";
import { formatCurrency } from "@/lib/utils/currency-format";
import type { ParsedAdSpend, MediaChannel } from "@/lib/types";

const MEDIA_LABELS: Record<MediaChannel, string> = {
  naver_web: "네이버-홈페이지",
  naver_landing: "네이버-랜딩",
  danggeun: "당근",
  meta: "메타",
  google: "구글",
};

interface SpendTextInputProps {
  onSaved: () => void;
}

export function SpendTextInput({ onSaved }: SpendTextInputProps) {
  const [text, setText] = useState("");
  const [parsed, setParsed] = useState<ParsedAdSpend[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleParse = useCallback(() => {
    setError(null);
    setSuccess(false);
    const results = parseSpendReport(text);
    if (results.length === 0) {
      setError("파싱 결과가 없습니다. 텍스트 형식을 확인해 주세요.");
      setParsed(null);
      return;
    }
    setParsed(results);
  }, [text]);

  const handleSave = useCallback(async () => {
    if (!parsed || parsed.length === 0) return;
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch("/api/data/save-spend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: parsed }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "저장 실패");

      setSuccess(true);
      setParsed(null);
      setText("");
      onSaved();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "저장 중 오류가 발생했습니다."
      );
    } finally {
      setSaving(false);
    }
  }, [parsed, onSaved]);

  return (
    <div className="space-y-3">
      {/* Text input */}
      <textarea
        className="w-full rounded-lg border border-[#334155] bg-[#0f172a] px-3 py-2 text-sm text-[#e2e8f0] placeholder:text-[#94a3b8] focus:border-[#3b82f6] focus:outline-none focus:ring-1 focus:ring-[#3b82f6]"
        rows={6}
        placeholder={`소진액 보고 텍스트를 붙여넣으세요...\n\n예시:\n4/10 금요일\n네이버 소진액 : 96,432 원\n당근 소진액 : 100,254 원`}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setParsed(null);
          setSuccess(false);
          setError(null);
        }}
      />

      <Button onClick={handleParse} disabled={!text.trim()} className="w-full">
        파싱하기
      </Button>

      {/* Error */}
      {error && (
        <div className="rounded-lg bg-[#f87171]/10 border border-[#f87171]/20 px-3 py-2 text-sm text-[#f87171]">
          {error}
        </div>
      )}

      {/* Success */}
      {success && (
        <div className="rounded-lg bg-[#4ade80]/10 border border-[#4ade80]/20 px-3 py-2 text-sm text-[#4ade80]">
          저장 완료
        </div>
      )}

      {/* Parse results preview */}
      {parsed && parsed.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-[#e2e8f0]">파싱 결과</h3>
          {parsed.map((item, i) => (
            <div
              key={`${item.date}-${item.media}-${i}`}
              className="flex items-center justify-between rounded-lg border border-[#334155] bg-[#0f172a] p-3 text-sm"
            >
              <div className="flex items-center gap-2">
                <span className="rounded bg-[#334155] px-2 py-0.5 text-xs text-[#e2e8f0]">
                  {item.date}
                </span>
                <span className="rounded bg-[#3b82f6]/20 px-2 py-0.5 text-xs text-[#3b82f6]">
                  {MEDIA_LABELS[item.media]}
                </span>
              </div>
              <span className="font-semibold text-[#e2e8f0]">
                {formatCurrency(item.amount)}
              </span>
            </div>
          ))}

          {/* Total */}
          <div className="flex items-center justify-between rounded-lg bg-[#334155] px-3 py-2 text-sm">
            <span className="font-medium text-[#e2e8f0]">합계</span>
            <span className="font-bold text-[#e2e8f0]">
              {formatCurrency(parsed.reduce((sum, item) => sum + item.amount, 0))}
            </span>
          </div>

          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full"
          >
            {saving ? "저장 중..." : "저장"}
          </Button>
        </div>
      )}
    </div>
  );
}
