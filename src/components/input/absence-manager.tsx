"use client";

import { useEffect, useState, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import type { CallReport, MediaChannel } from "@/lib/types";

const MEDIA_LABELS: Record<MediaChannel, string> = {
  naver_web: "네이버-홈페이지",
  naver_landing: "네이버-랜딩",
  danggeun: "당근",
  meta: "메타",
  google: "구글",
};

type AbsenceResolution = "absence" | "export" | "used_car" | "scrap" | "invalid";

const RESOLUTION_OPTIONS: { value: AbsenceResolution; label: string }[] = [
  { value: "absence", label: "부재 유지" },
  { value: "export", label: "수출가능" },
  { value: "used_car", label: "중고매입" },
  { value: "scrap", label: "폐차" },
  { value: "invalid", label: "무효" },
];

const RESOLUTION_FIELD_MAP: Record<AbsenceResolution, string | null> = {
  absence: null,
  export: "export_count",
  used_car: "used_car_count",
  scrap: "scrap_count",
  invalid: "invalid_count",
};

interface AbsenceItem {
  report: CallReport;
  index: number; // nth absence in this report (0-based)
}

interface AbsenceManagerProps {
  selectedDate: string;
  refreshKey: number;
}

export function AbsenceManager({
  selectedDate,
  refreshKey,
}: AbsenceManagerProps) {
  const [items, setItems] = useState<AbsenceItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    async function fetch() {
      setLoading(true);
      const supabase = createClient();

      const { data } = await supabase
        .from("call_reports")
        .select("*")
        .eq("date", selectedDate)
        .gt("absence_count", 0);

      const result: AbsenceItem[] = [];
      if (data) {
        for (const report of data as CallReport[]) {
          for (let i = 0; i < report.absence_count; i++) {
            result.push({ report, index: i });
          }
        }
      }
      setItems(result);
      setLoading(false);
    }

    fetch();
  }, [selectedDate, refreshKey]);

  const handleResolve = useCallback(
    async (item: AbsenceItem, resolution: AbsenceResolution) => {
      if (resolution === "absence") return;

      const itemKey = `${item.report.id}-${item.index}`;
      setProcessing(itemKey);

      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("인증 정보가 없습니다.");

        const targetField = RESOLUTION_FIELD_MAP[resolution];
        if (!targetField) return;

        const report = item.report;
        const currentAbsence = report.absence_count;
        const currentTarget =
          (report[targetField as keyof CallReport] as number) ?? 0;

        // call_reports 업데이트: absence -1, target +1
        const { error: updateError } = await supabase
          .from("call_reports")
          .update({
            absence_count: currentAbsence - 1,
            [targetField]: currentTarget + 1,
          })
          .eq("id", report.id);

        if (updateError) throw updateError;

        // 이력 기록
        await supabase.from("call_report_logs").insert({
          call_report_id: report.id,
          field_changed: `absence_to_${resolution}`,
          old_value: String(currentAbsence),
          new_value: String(currentAbsence - 1),
          changed_by: user.id,
        });

        // 로컬 상태 업데이트: 해당 아이템 제거
        setItems((prev) =>
          prev.filter(
            (i) => !(i.report.id === item.report.id && i.index === item.index)
          )
        );
      } catch (err) {
        console.error("부재 처리 오류:", err);
      } finally {
        setProcessing(null);
      }
    },
    []
  );

  if (loading) {
    return (
      <div className="py-4 text-center text-xs text-muted-foreground">
        부재 정보 로딩 중...
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed px-3 py-4 text-center text-xs text-muted-foreground">
        부재 건이 없습니다
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium">
        부재 관리{" "}
        <Badge variant="secondary" className="ml-1">
          {items.length}건
        </Badge>
      </h3>

      <div className="space-y-1.5">
        {items.map((item) => {
          const itemKey = `${item.report.id}-${item.index}`;
          const isProcessing = processing === itemKey;

          return (
            <div
              key={itemKey}
              className="flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2 text-sm"
            >
              <Badge variant="outline">
                {MEDIA_LABELS[item.report.media]}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {new Date(item.report.reported_at).toLocaleTimeString("ko-KR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
              <select
                className="ml-auto h-7 rounded-md border border-input bg-transparent px-2 text-xs focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none dark:bg-input/30"
                defaultValue="absence"
                disabled={isProcessing}
                onChange={(e) =>
                  handleResolve(item, e.target.value as AbsenceResolution)
                }
              >
                {RESOLUTION_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          );
        })}
      </div>
    </div>
  );
}
