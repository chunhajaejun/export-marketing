"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils/currency-format";
import { formatDateWithDay } from "@/lib/utils/date-utils";
import { parseISO } from "date-fns";
import type { CallReport, AdSpend, MediaChannel } from "@/lib/types";

const MEDIA_LIST: { key: MediaChannel; label: string; color: string }[] = [
  { key: "naver_web", label: "네이버(웹)", color: "#3b82f6" },
  { key: "naver_landing", label: "네이버(랜딩)", color: "#3b82f6" },
  { key: "danggeun", label: "당근", color: "#f97316" },
  { key: "meta", label: "메타", color: "#8b5cf6" },
  { key: "google", label: "구글", color: "#34d399" },
];

interface MediaTableProps {
  calls: CallReport[];
  spend: AdSpend[];
  startDate: string;
  endDate: string;
}

function V({ v, c, money }: { v: number | null; c: string; money?: boolean }) {
  if (v === null) return <TableCell className="text-right text-xs text-[#475569]">-</TableCell>;
  return (
    <TableCell className="text-right text-xs" style={{ color: v === 0 ? "#475569" : c }}>
      {money ? formatCurrency(v) : v}
    </TableCell>
  );
}

export function MediaTable({ calls, spend, startDate, endDate }: MediaTableProps) {
  // 기간 내 모든 날짜 생성
  const allDates: string[] = [];
  const cur = new Date(startDate);
  const end = new Date(endDate);
  while (cur <= end) {
    allDates.push(cur.toISOString().split("T")[0]);
    cur.setDate(cur.getDate() + 1);
  }

  // 날짜×매체 데이터 매핑
  const getData = (date: string, media: MediaChannel) => {
    const mc = calls.filter((c) => c.date === date && c.media === media);
    const ms = spend.filter((s) => s.date === date && s.media === media);
    const totalSpend = ms.reduce((s, sp) => s + (sp.amount || 0), 0);
    const totalCalls = mc.reduce((s, c) => s + (c.total_count || 0), 0);
    const validCalls = mc.reduce((s, c) => s + (c.export_count || 0) + (c.used_car_count || 0) + (c.phone_naver_count || 0), 0);
    return {
      spend: totalSpend,
      calls: totalCalls,
      valid: validCalls,
      cpa_total: totalCalls > 0 ? Math.round(totalSpend / totalCalls) : null,
      cpa_valid: validCalls > 0 ? Math.round(totalSpend / validCalls) : null,
    };
  };

  // 매체별 합계
  const getMediaTotal = (media: MediaChannel) => {
    const mc = calls.filter((c) => c.media === media);
    const ms = spend.filter((s) => s.media === media);
    const totalSpend = ms.reduce((s, sp) => s + (sp.amount || 0), 0);
    const totalCalls = mc.reduce((s, c) => s + (c.total_count || 0), 0);
    const validCalls = mc.reduce((s, c) => s + (c.export_count || 0) + (c.used_car_count || 0) + (c.phone_naver_count || 0), 0);
    return {
      spend: totalSpend,
      calls: totalCalls,
      valid: validCalls,
      cpa_total: totalCalls > 0 ? Math.round(totalSpend / totalCalls) : null,
      cpa_valid: validCalls > 0 ? Math.round(totalSpend / validCalls) : null,
    };
  };

  return (
    <div className="overflow-x-auto overflow-y-auto rounded-xl">
      <Table>
        <TableHeader>
          <TableRow className="border-[#334155] bg-[#0f172a] hover:bg-[#0f172a]">
            <TableHead className="sticky left-0 z-10 bg-[#0f172a] text-[#64748b] min-w-[80px]">날짜</TableHead>
            {MEDIA_LIST.map((m) => (
              <TableHead key={m.key} colSpan={3} className="text-center border-l border-[#334155]">
                <span className="inline-flex items-center gap-1">
                  <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: m.color }} />
                  <span style={{ color: m.color }} className="text-xs font-bold">{m.label}</span>
                </span>
              </TableHead>
            ))}
          </TableRow>
          <TableRow className="border-[#334155] bg-[#0f172a] hover:bg-[#0f172a]">
            <TableHead className="sticky left-0 z-10 bg-[#0f172a]" />
            {MEDIA_LIST.map((m) => (
              <>
                <TableHead key={`${m.key}-spend`} className="text-right text-[10px] text-[#64748b] border-l border-[#334155]">소진액</TableHead>
                <TableHead key={`${m.key}-cpa1`} className="text-right text-[10px] text-[#64748b]">인입단가</TableHead>
                <TableHead key={`${m.key}-cpa2`} className="text-right text-[10px] text-[#64748b]">유효단가</TableHead>
              </>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {allDates.map((date, i) => (
            <TableRow key={date} className={`border-[#334155] hover:bg-[#334155]/50 ${i % 2 === 0 ? "bg-[#1e293b]" : "bg-[#1a2332]"}`}>
              <TableCell className="sticky left-0 z-10 text-xs font-medium text-[#e2e8f0] whitespace-nowrap" style={{ backgroundColor: i % 2 === 0 ? "#1e293b" : "#1a2332" }}>
                {formatDateWithDay(parseISO(date))}
              </TableCell>
              {MEDIA_LIST.map((m) => {
                const d = getData(date, m.key);
                return (
                  <>
                    <TableCell key={`${m.key}-${date}-s`} className="text-right text-xs border-l border-[#334155]" style={{ color: d.spend === 0 ? "#475569" : "#e2e8f0" }}>
                      {d.spend > 0 ? formatCurrency(d.spend) : "0"}
                    </TableCell>
                    <TableCell key={`${m.key}-${date}-ct`} className="text-right text-xs" style={{ color: d.cpa_total === null ? "#475569" : "#e2e8f0" }}>
                      {d.cpa_total !== null ? formatCurrency(d.cpa_total) : "-"}
                    </TableCell>
                    <TableCell key={`${m.key}-${date}-cv`} className="text-right text-xs" style={{ color: d.cpa_valid === null ? "#475569" : "#4ade80" }}>
                      {d.cpa_valid !== null ? formatCurrency(d.cpa_valid) : "-"}
                    </TableCell>
                  </>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
        {/* 합계 */}
        <TableRow className="border-[#334155] bg-[#0f172a] hover:bg-[#0f172a]" style={{ borderTop: "2px solid #3b82f6" }}>
          <TableCell className="sticky left-0 z-10 bg-[#0f172a] font-bold text-white text-xs">합계</TableCell>
          {MEDIA_LIST.map((m) => {
            const t = getMediaTotal(m.key);
            return (
              <>
                <TableCell key={`${m.key}-total-s`} className="text-right text-xs font-bold text-white border-l border-[#334155]">
                  {formatCurrency(t.spend)}
                </TableCell>
                <TableCell key={`${m.key}-total-ct`} className="text-right text-xs font-bold text-white">
                  {t.cpa_total !== null ? formatCurrency(t.cpa_total) : "-"}
                </TableCell>
                <TableCell key={`${m.key}-total-cv`} className="text-right text-xs font-bold text-[#4ade80]">
                  {t.cpa_valid !== null ? formatCurrency(t.cpa_valid) : "-"}
                </TableCell>
              </>
            );
          })}
        </TableRow>
      </Table>
    </div>
  );
}
