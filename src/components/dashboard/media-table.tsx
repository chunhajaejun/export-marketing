"use client";

import { Fragment, useState } from "react";
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

const MEDIA_LABELS: Record<MediaChannel, string> = {
  naver_web: "네이버(웹)",
  naver_landing: "네이버(랜딩)",
  danggeun: "당근",
  meta: "메타",
  google: "구글",
};

const MEDIA_COLORS: Record<MediaChannel, string> = {
  naver_web: "#3b82f6",
  naver_landing: "#3b82f6",
  danggeun: "#f97316",
  meta: "#8b5cf6",
  google: "#34d399",
};

const ALL_MEDIA: MediaChannel[] = [
  "naver_web", "naver_landing", "danggeun", "meta", "google",
];

interface MediaTableProps {
  calls: CallReport[];
  spend: AdSpend[];
}

function ValCell({ value, color, isCurrency }: { value: number | null; color: string; isCurrency?: boolean }) {
  if (value === null) return <TableCell className="text-right text-[#475569]">-</TableCell>;
  return (
    <TableCell className="text-right" style={{ color: value === 0 ? "#475569" : color }}>
      {isCurrency ? formatCurrency(value) : value}
    </TableCell>
  );
}

export function MediaTable({ calls, spend }: MediaTableProps) {
  const [expandedMedia, setExpandedMedia] = useState<Set<string>>(new Set());

  // 매체별 합산
  const summaries = ALL_MEDIA.map((media) => {
    const mc = calls.filter((c) => c.media === media);
    const ms = spend.filter((s) => s.media === media);
    const totalCalls = mc.reduce((s, c) => s + (c.total_count || 0), 0);
    const validCalls = mc.reduce((s, c) => s + (c.export_count || 0) + (c.used_car_count || 0) + (c.phone_naver_count || 0), 0);
    const totalSpend = ms.reduce((s, sp) => s + (sp.amount || 0), 0);

    // 날짜별 데이터
    const dates = new Set([...mc.map((c) => c.date), ...ms.map((s) => s.date)]);
    const dailyData = Array.from(dates).sort().map((date) => {
      const dc = mc.filter((c) => c.date === date);
      const ds = ms.filter((s) => s.date === date);
      const dayCalls = dc.reduce((s, c) => s + (c.total_count || 0), 0);
      const dayValid = dc.reduce((s, c) => s + (c.export_count || 0) + (c.used_car_count || 0) + (c.phone_naver_count || 0), 0);
      const daySpend = ds.reduce((s, sp) => s + (sp.amount || 0), 0);
      return {
        date, calls: dayCalls, valid: dayValid, spend: daySpend,
        cpa_total: dayCalls > 0 ? Math.round(daySpend / dayCalls) : null,
        cpa_valid: dayValid > 0 ? Math.round(daySpend / dayValid) : null,
      };
    });

    return {
      media, spend: totalSpend, total_calls: totalCalls, valid_calls: validCalls,
      cpa_total: totalCalls > 0 ? Math.round(totalSpend / totalCalls) : null,
      cpa_valid: validCalls > 0 ? Math.round(totalSpend / validCalls) : null,
      dailyData,
    };
  });

  const totals = summaries.reduce(
    (a, s) => ({ spend: a.spend + s.spend, total_calls: a.total_calls + s.total_calls, valid_calls: a.valid_calls + s.valid_calls }),
    { spend: 0, total_calls: 0, valid_calls: 0 }
  );

  const toggle = (media: string) => {
    setExpandedMedia((prev) => {
      const next = new Set(prev);
      if (next.has(media)) next.delete(media); else next.add(media);
      return next;
    });
  };

  return (
    <div className="overflow-hidden rounded-xl">
      <Table>
        <TableHeader>
          <TableRow className="border-[#334155] bg-[#0f172a] hover:bg-[#0f172a]">
            <TableHead className="text-[#64748b]">매체</TableHead>
            <TableHead className="text-right text-[#64748b]">소진액</TableHead>
            <TableHead className="text-right text-[#64748b]">콜량</TableHead>
            <TableHead className="text-right text-[#64748b]">유효콜</TableHead>
            <TableHead className="text-right text-[#64748b]">CPA(전체)</TableHead>
            <TableHead className="text-right text-[#64748b]">CPA(유효)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {summaries.map((s, i) => {
            const isOpen = expandedMedia.has(s.media);
            return (
              <Fragment key={s.media}>
                <TableRow
                  className={`border-[#334155] cursor-pointer hover:bg-[#334155]/50 ${i % 2 === 0 ? "bg-[#1e293b]" : "bg-[#1a2332]"}`}
                  onClick={() => toggle(s.media)}
                >
                  <TableCell className="font-medium text-[#e2e8f0]">
                    <span className="mr-1.5 inline-block w-3 text-[#94a3b8] text-xs">{isOpen ? "▾" : "▸"}</span>
                    <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: MEDIA_COLORS[s.media] }} />
                    {MEDIA_LABELS[s.media]}
                  </TableCell>
                  <ValCell value={s.spend} color="#e2e8f0" isCurrency />
                  <ValCell value={s.total_calls} color="#e2e8f0" />
                  <ValCell value={s.valid_calls} color="#4ade80" />
                  <ValCell value={s.cpa_total} color="#e2e8f0" isCurrency />
                  <ValCell value={s.cpa_valid} color="#4ade80" isCurrency />
                </TableRow>
                {isOpen && s.dailyData.map((d) => (
                  <TableRow key={`${s.media}-${d.date}`} className="border-[#334155]/50 bg-[#0f172a]/50 hover:bg-[#334155]/30">
                    <TableCell className="pl-10 text-xs text-[#94a3b8]">
                      {formatDateWithDay(parseISO(d.date))}
                    </TableCell>
                    <ValCell value={d.spend} color="#94a3b8" isCurrency />
                    <ValCell value={d.calls} color="#94a3b8" />
                    <ValCell value={d.valid} color="#4ade80" />
                    <ValCell value={d.cpa_total} color="#94a3b8" isCurrency />
                    <ValCell value={d.cpa_valid} color="#4ade80" isCurrency />
                  </TableRow>
                ))}
              </Fragment>
            );
          })}
        </TableBody>
        <TableRow className="border-[#334155] bg-[#0f172a] hover:bg-[#0f172a]" style={{ borderTop: "2px solid #3b82f6" }}>
          <TableCell className="font-bold text-white">합계</TableCell>
          <TableCell className="text-right font-bold text-white">{formatCurrency(totals.spend)}</TableCell>
          <TableCell className="text-right font-bold text-white">{totals.total_calls}</TableCell>
          <TableCell className="text-right font-bold text-[#4ade80]">{totals.valid_calls}</TableCell>
          <TableCell className="text-right font-bold text-white">
            {totals.total_calls > 0 ? formatCurrency(Math.round(totals.spend / totals.total_calls)) : "-"}
          </TableCell>
          <TableCell className="text-right font-bold text-[#4ade80]">
            {totals.valid_calls > 0 ? formatCurrency(Math.round(totals.spend / totals.valid_calls)) : "-"}
          </TableCell>
        </TableRow>
      </Table>
    </div>
  );
}
