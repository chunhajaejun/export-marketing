"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  getReportMode,
  getReportModeLabel,
  getReportModeDescription,
} from "@/lib/utils/date-utils";
import { parseCallReport } from "@/lib/parsers/call-report-parser";
import { createClient } from "@/lib/supabase/client";
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
  onSaved: () => void;
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
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("인증 정보가 없습니다.");

      for (const item of parsed) {
        const total =
          item.export_count +
          item.used_car_count +
          item.scrap_count +
          item.absence_count +
          item.invalid_count +
          item.phone_count;

        const validTotal =
          item.export_count + item.used_car_count + item.phone_count;

        const { error: upsertError } = await supabase
          .from("call_reports")
          .upsert(
            {
              date: item.date,
              media: item.media,
              export_count: item.export_count,
              used_car_count: item.used_car_count,
              scrap_count: item.scrap_count,
              absence_count: item.absence_count,
              invalid_count: item.invalid_count,
              phone_naver_count: item.phone_count,
              valid_total: validTotal,
              total_count: total,
              reporter_id: user.id,
              reported_at: new Date().toISOString(),
            },
            { onConflict: "date,media" }
          );

        if (upsertError) throw upsertError;
      }

      setSuccess(true);
      setParsed(null);
      setText("");
      onSaved();
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
      {/* 시간 추정 배너 */}
      <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm">
        <Badge variant="secondary">{getReportModeLabel(activeMode)}</Badge>
        <span className="flex-1 text-xs text-muted-foreground">
          {getReportModeDescription(activeMode)}
        </span>
        <Button variant="ghost" size="xs" onClick={cycleMode}>
          변경
        </Button>
      </div>

      {/* 텍스트 입력 */}
      <textarea
        className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none dark:bg-input/30"
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

      {/* 안내 텍스트 */}
      <div className="space-y-1 text-xs text-muted-foreground">
        <p>* &quot;유효(미분리)&quot;: 수출/중고매입이 분리되지 않은 유효 건수</p>
        <p>* &quot;전화&quot; 채널은 네이버웹 추정으로 네이버 건수에 합산됩니다</p>
      </div>

      {/* 에러 */}
      {error && (
        <div className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* 성공 */}
      {success && (
        <div className="rounded-lg bg-green-500/10 px-3 py-2 text-sm text-green-700 dark:text-green-400">
          저장 완료
        </div>
      )}

      {/* 파싱 결과 미리보기 */}
      {parsed && parsed.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium">파싱 결과</h3>
          {parsed.map((item, i) => (
            <div
              key={`${item.date}-${item.media}-${i}`}
              className="rounded-lg border p-3 text-sm"
            >
              <div className="mb-1 flex items-center gap-2">
                <Badge variant="outline">{item.date}</Badge>
                <Badge>{MEDIA_LABELS[item.media]}</Badge>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs">
                <span className="text-green-600">
                  수출가능: {item.export_count}
                </span>
                <span className="text-green-600">
                  중고매입: {item.used_car_count}
                </span>
                <span className="text-yellow-600">
                  폐차: {item.scrap_count}
                </span>
                <span className="text-green-600">
                  전화-네이버웹: {item.phone_count}
                </span>
                <span className="text-blue-600">
                  부재: {item.absence_count}
                </span>
                <span className="text-red-600">
                  무효: {item.invalid_count}
                </span>
              </div>
              {(item.channels.phone > 0 ||
                item.channels.kakao > 0 ||
                item.channels.sms > 0) && (
                <div className="mt-1 text-xs text-muted-foreground">
                  채널: 전화 {item.channels.phone} / 카톡 {item.channels.kakao}{" "}
                  / 문자 {item.channels.sms}
                </div>
              )}
            </div>
          ))}

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
