"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  getReportMode,
  getReportModeLabel,
  getReportModeDescription,
} from "@/lib/utils/date-utils";
import { parseCallReport } from "@/lib/parsers/call-report-parser";
import type { ParsedCallReport, MediaChannel } from "@/lib/types";
import type { ReportMode } from "@/lib/utils/date-utils";

const MEDIA_LABELS: Record<MediaChannel, string> = {
  naver_web: "네이버-홈페이지",
  naver_landing: "네이버-랜딩",
  danggeun: "당근",
  meta: "메타",
  google: "구글",
};

interface CallTextInputProps {
  onSaved: (date?: string) => void;
}

export function CallTextInput({ onSaved }: CallTextInputProps) {
  const [text, setText] = useState("");
  const [parsed, setParsed] = useState<ParsedCallReport[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const mode = getReportMode();
  const [overrideMode, setOverrideMode] = useState<ReportMode | null>(null);
  const activeMode = overrideMode ?? mode;

  const handleParse = useCallback(() => {
    setError(null);
    setSuccess(false);
    const results = parseCallReport(text);
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
      const items = parsed.map((item) => ({
        date: item.date,
        media: item.media,
        phone_count: item.phone_count,
        export_count: item.export_count,
        used_car_count: item.used_car_count,
        scrap_count: item.scrap_count,
        absence_count: item.absence_count,
        invalid_count: item.invalid_count,
        input_source: "text",
      }));

      const res = await fetch("/api/data/save-calls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "저장 실패");

      setSuccess(true);
      const savedDate = parsed[0]?.date;
      setParsed(null);
      setText("");
      onSaved(savedDate);
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  }, [parsed, onSaved]);

  function cycleMode() {
    const modes: ReportMode[] = ["morning", "evening", "none"];
    const currentIdx = modes.indexOf(activeMode);
    setOverrideMode(modes[(currentIdx + 1) % modes.length]);
  }

  return (
    <div className="space-y-3">
      {/* Time estimation banner */}
      <div className="flex items-center gap-2 rounded-lg bg-[#334155] px-3 py-2 text-sm">
        <span className="rounded-md bg-[#3b82f6]/20 px-2 py-0.5 text-xs font-medium text-[#3b82f6]">
          {getReportModeLabel(activeMode)}
        </span>
        <span className="flex-1 text-xs text-[#94a3b8]">
          {getReportModeDescription(activeMode)}
        </span>
        <button
          onClick={cycleMode}
          className="rounded px-2 py-0.5 text-xs text-[#94a3b8] hover:bg-[#1e293b] hover:text-[#e2e8f0]"
        >
          변경
        </button>
      </div>

      {/* Text input */}
      <textarea
        className="w-full rounded-lg border border-[#334155] bg-[#0f172a] px-3 py-2 text-sm text-[#e2e8f0] placeholder:text-[#94a3b8] focus:border-[#3b82f6] focus:outline-none focus:ring-1 focus:ring-[#3b82f6]"
        rows={8}
        placeholder="보고 텍스트를 붙여넣거나 직접 작성하세요..."
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

      {/* Help text */}
      <div className="space-y-1 text-xs text-[#94a3b8]">
        <p>* &quot;유효(미분리)&quot;: 수출/중고매입이 분리되지 않은 유효 건수</p>
        <p>* &quot;전화&quot; 채널은 네이버웹 추정으로 네이버 건수에 합산됩니다</p>
      </div>

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
              className="rounded-lg border border-[#334155] bg-[#0f172a] p-3 text-sm"
            >
              <div className="mb-1 flex items-center gap-2">
                <span className="rounded bg-[#334155] px-2 py-0.5 text-xs text-[#e2e8f0]">
                  {item.date}
                </span>
                <span className="rounded bg-[#3b82f6]/20 px-2 py-0.5 text-xs text-[#3b82f6]">
                  {MEDIA_LABELS[item.media]}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs">
                <span className="text-[#4ade80]">
                  수출가능: {item.export_count}
                </span>
                <span className="text-[#4ade80]">
                  중고매입: {item.used_car_count}
                </span>
                <span className="text-[#fbbf24]">
                  폐차: {item.scrap_count}
                </span>
                <span className="text-[#4ade80]">
                  전화-네이버웹: {item.phone_count}
                </span>
                <span className="text-[#60a5fa]">
                  부재: {item.absence_count}
                </span>
                <span className="text-[#f87171]">
                  무효: {item.invalid_count}
                </span>
              </div>
              {(item.channels.phone > 0 ||
                item.channels.kakao > 0 ||
                item.channels.sms > 0) && (
                <div className="mt-1 text-xs text-[#e2e8f0]">
                  채널: <span className="text-[#3b82f6]">전화 {item.channels.phone}</span> / <span className="text-[#4ade80]">카톡 {item.channels.kakao}</span> / <span className="text-[#fbbf24]">문자 {item.channels.sms}</span>
                </div>
              )}
            </div>
          ))}

          {/* 총 유입량 */}
          <div className="rounded-lg border border-[#334155] bg-[#0f172a] p-3 text-sm">
            <span className="text-[#94a3b8]">총 유입량 : </span>
            <span className="text-lg font-bold text-white">
              {parsed.reduce((sum, item) => sum + item.export_count + item.used_car_count + item.scrap_count + item.absence_count + item.invalid_count + item.phone_count, 0)}
            </span>
            <span className="text-[#94a3b8]"> 콜</span>
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
