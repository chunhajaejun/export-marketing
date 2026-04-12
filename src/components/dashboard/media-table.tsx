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
import { isToday, isYesterday, parseISO } from "date-fns";
import type { CallReport, AdSpend, MediaChannel } from "@/lib/types";

const MEDIA_LABELS: Record<MediaChannel, string> = {
  naver_web: "네이버(웹)",
  naver_landing: "네이버(랜딩)",
  danggeun: "당근",
  meta: "메타",
  google: "구글",
};

const MEDIA_COLORS: Record<string, string> = {
  naver_web: "#3b82f6",
  naver_landing: "#3b82f6",
  danggeun: "#f97316",
  meta: "#8b5cf6",
  google: "#34d399",
};

const ALL_MEDIA: MediaChannel[] = [
  "naver_web",
  "naver_landing",
  "danggeun",
  "meta",
  "google",
];

interface MediaTableProps {
  calls: CallReport[];
  spend: AdSpend[];
}

interface MediaRow {
  media: MediaChannel;
  total_calls: number;
  export_count: number;
  used_car_count: number;
  scrap_count: number;
  absence_count: number;
  invalid_count: number;
  spend: number;
}

interface DateGroup {
  date: string;
  mediaRows: MediaRow[];
  subtotal: {
    total_calls: number;
    export_count: number;
    used_car_count: number;
    scrap_count: number;
    absence_count: number;
    invalid_count: number;
    spend: number;
  };
}

function groupByDateAndMedia(
  calls: CallReport[],
  spend: AdSpend[]
): DateGroup[] {
  const dateMap = new Map<
    string,
    Map<
      MediaChannel,
      {
        total_calls: number;
        export_count: number;
        used_car_count: number;
        scrap_count: number;
        absence_count: number;
        invalid_count: number;
        spend: number;
      }
    >
  >();

  for (const c of calls) {
    if (!dateMap.has(c.date)) dateMap.set(c.date, new Map());
    const mediaMap = dateMap.get(c.date)!;
    const existing = mediaMap.get(c.media) || {
      total_calls: 0,
      export_count: 0,
      used_car_count: 0,
      scrap_count: 0,
      absence_count: 0,
      invalid_count: 0,
      spend: 0,
    };
    existing.total_calls += c.total_count;
    existing.export_count += c.export_count ?? 0;
    existing.used_car_count += c.used_car_count ?? 0;
    existing.scrap_count += c.scrap_count;
    existing.absence_count += c.absence_count;
    existing.invalid_count += c.invalid_count + c.phone_naver_count;
    mediaMap.set(c.media, existing);
  }

  for (const s of spend) {
    if (!dateMap.has(s.date)) dateMap.set(s.date, new Map());
    const mediaMap = dateMap.get(s.date)!;
    const existing = mediaMap.get(s.media) || {
      total_calls: 0,
      export_count: 0,
      used_car_count: 0,
      scrap_count: 0,
      absence_count: 0,
      invalid_count: 0,
      spend: 0,
    };
    existing.spend += s.amount;
    mediaMap.set(s.media, existing);
  }

  const groups: DateGroup[] = [];
  // 날짜 정순 정렬 (ascending)
  const sortedDates = Array.from(dateMap.keys()).sort((a, b) =>
    a.localeCompare(b)
  );

  for (const date of sortedDates) {
    const mediaMap = dateMap.get(date)!;
    const mediaRows: MediaRow[] = ALL_MEDIA.map((media) => ({
      media,
      ...(mediaMap.get(media) || {
        total_calls: 0,
        export_count: 0,
        used_car_count: 0,
        scrap_count: 0,
        absence_count: 0,
        invalid_count: 0,
        spend: 0,
      }),
    }));
    const subtotal = mediaRows.reduce(
      (acc, r) => ({
        total_calls: acc.total_calls + r.total_calls,
        export_count: acc.export_count + r.export_count,
        used_car_count: acc.used_car_count + r.used_car_count,
        scrap_count: acc.scrap_count + r.scrap_count,
        absence_count: acc.absence_count + r.absence_count,
        invalid_count: acc.invalid_count + r.invalid_count,
        spend: acc.spend + r.spend,
      }),
      {
        total_calls: 0,
        export_count: 0,
        used_car_count: 0,
        scrap_count: 0,
        absence_count: 0,
        invalid_count: 0,
        spend: 0,
      }
    );
    groups.push({ date, mediaRows, subtotal });
  }

  return groups;
}

function ValCell({ value, color }: { value: number; color: string }) {
  return (
    <TableCell
      className="text-right"
      style={{ color: value === 0 ? "#475569" : color }}
    >
      {value}
    </TableCell>
  );
}

export function MediaTable({ calls, spend }: MediaTableProps) {
  const groups = groupByDateAndMedia(calls, spend);

  const [expanded, setExpanded] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    for (const g of groups) {
      const d = parseISO(g.date);
      if (isToday(d) || isYesterday(d)) {
        initial.add(g.date);
      }
    }
    return initial;
  });

  const toggle = (date: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  };

  if (groups.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-[#94a3b8]">
        데이터가 없습니다
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl">
      <Table>
        <TableHeader>
          <TableRow className="border-[#334155] bg-[#0f172a] hover:bg-[#0f172a]">
            <TableHead className="text-[#64748b]">매체</TableHead>
            <TableHead className="text-right text-[#64748b]">전체</TableHead>
            <TableHead className="text-right text-[#64748b]">수출</TableHead>
            <TableHead className="text-right text-[#64748b]">매입</TableHead>
            <TableHead className="text-right text-[#64748b]">폐차</TableHead>
            <TableHead className="text-right text-[#64748b]">부재</TableHead>
            <TableHead className="text-right text-[#64748b]">무효</TableHead>
            <TableHead className="text-right text-[#64748b]">소진액</TableHead>
            <TableHead className="text-right text-[#64748b]">단가(전체)</TableHead>
            <TableHead className="text-right text-[#64748b]">단가(유효)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {groups.map((group, groupIdx) => {
            const isOpen = expanded.has(group.date);
            const cpaTotal =
              group.subtotal.total_calls > 0
                ? Math.round(group.subtotal.spend / group.subtotal.total_calls)
                : null;
            const validCalls =
              group.subtotal.export_count + group.subtotal.used_car_count;
            const cpaValid =
              validCalls > 0
                ? Math.round(group.subtotal.spend / validCalls)
                : null;

            return (
              <Fragment key={group.date}>
                {/* Subtotal / date row */}
                <TableRow
                  className="cursor-pointer border-[#334155] bg-[#0f172a] hover:bg-[#0f172a]"
                  style={{ borderTop: "2px solid #3b82f6" }}
                  onClick={() => toggle(group.date)}
                >
                  <TableCell className="font-bold text-white">
                    <span className="mr-1.5 inline-block w-3 text-[#94a3b8]">
                      {isOpen ? "▾" : "▸"}
                    </span>
                    {formatDateWithDay(parseISO(group.date))}
                  </TableCell>
                  <TableCell className="text-right font-bold text-white">
                    {group.subtotal.total_calls}
                  </TableCell>
                  <TableCell className="text-right font-bold text-white">
                    {group.subtotal.export_count}
                  </TableCell>
                  <TableCell className="text-right font-bold text-white">
                    {group.subtotal.used_car_count}
                  </TableCell>
                  <TableCell className="text-right font-bold text-white">
                    {group.subtotal.scrap_count}
                  </TableCell>
                  <TableCell className="text-right font-bold text-white">
                    {group.subtotal.absence_count}
                  </TableCell>
                  <TableCell className="text-right font-bold text-white">
                    {group.subtotal.invalid_count}
                  </TableCell>
                  <TableCell className="text-right font-bold text-white">
                    {formatCurrency(group.subtotal.spend)}
                  </TableCell>
                  <TableCell className="text-right text-[#94a3b8]">
                    {cpaTotal != null ? formatCurrency(cpaTotal) : "-"}
                  </TableCell>
                  <TableCell className="text-right text-[#94a3b8]">
                    {cpaValid != null ? formatCurrency(cpaValid) : "-"}
                  </TableCell>
                </TableRow>
                {isOpen &&
                  group.mediaRows.map((row, rowIdx) => {
                    const mediaCpaTotal =
                      row.total_calls > 0
                        ? Math.round(row.spend / row.total_calls)
                        : null;
                    const mediaValidCalls =
                      row.export_count + row.used_car_count;
                    const mediaCpaValid =
                      mediaValidCalls > 0
                        ? Math.round(row.spend / mediaValidCalls)
                        : null;
                    return (
                      <TableRow
                        key={`${group.date}-${row.media}`}
                        className={`border-[#334155] hover:bg-[#334155]/50 ${
                          rowIdx % 2 === 0 ? "bg-[#1e293b]" : "bg-[#1a2332]"
                        }`}
                      >
                        <TableCell className="pl-8">
                          <span
                            className="mr-1.5 inline-block h-2 w-2 rounded-full"
                            style={{
                              backgroundColor:
                                MEDIA_COLORS[row.media] || "#94a3b8",
                            }}
                          />
                          <span
                            style={{
                              color: MEDIA_COLORS[row.media] || "#94a3b8",
                            }}
                          >
                            {MEDIA_LABELS[row.media] || row.media}
                          </span>
                        </TableCell>
                        <TableCell
                          className="text-right"
                          style={{
                            color:
                              row.total_calls === 0 ? "#475569" : "#e2e8f0",
                          }}
                        >
                          {row.total_calls}
                        </TableCell>
                        <ValCell value={row.export_count} color="#4ade80" />
                        <ValCell value={row.used_car_count} color="#4ade80" />
                        <ValCell value={row.scrap_count} color="#fbbf24" />
                        <ValCell value={row.absence_count} color="#60a5fa" />
                        <ValCell value={row.invalid_count} color="#f87171" />
                        <TableCell
                          className="text-right"
                          style={{
                            color: row.spend === 0 ? "#475569" : "#e2e8f0",
                          }}
                        >
                          {formatCurrency(row.spend)}
                        </TableCell>
                        <TableCell className="text-right text-[#94a3b8]">
                          {mediaCpaTotal != null
                            ? formatCurrency(mediaCpaTotal)
                            : "-"}
                        </TableCell>
                        <TableCell className="text-right text-[#94a3b8]">
                          {mediaCpaValid != null
                            ? formatCurrency(mediaCpaValid)
                            : "-"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </Fragment>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
