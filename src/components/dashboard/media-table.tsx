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
  meta: "��타",
  google: "구글",
};

const MEDIA_COLORS: Record<string, string> = {
  naver_web: "#3b82f6",
  naver_landing: "#3b82f6",
  danggeun: "#f97316",
  meta: "#8b5cf6",
  google: "#34d399",
};

interface MediaTableProps {
  calls: CallReport[];
  spend: AdSpend[];
}

interface DateGroup {
  date: string;
  mediaRows: {
    media: MediaChannel;
    total_calls: number;
    valid_calls: number;
    scrap_count: number;
    spend: number;
  }[];
  subtotal: {
    total_calls: number;
    valid_calls: number;
    scrap_count: number;
    spend: number;
  };
}

function groupByDateAndMedia(
  calls: CallReport[],
  spend: AdSpend[]
): DateGroup[] {
  const dateMap = new Map<
    string,
    Map<MediaChannel, { total_calls: number; valid_calls: number; scrap_count: number; spend: number }>
  >();

  for (const c of calls) {
    if (!dateMap.has(c.date)) dateMap.set(c.date, new Map());
    const mediaMap = dateMap.get(c.date)!;
    const existing = mediaMap.get(c.media) || {
      total_calls: 0,
      valid_calls: 0,
      scrap_count: 0,
      spend: 0,
    };
    existing.total_calls += c.total_count;
    existing.valid_calls += (c.valid_total ?? 0);
    existing.scrap_count += c.scrap_count;
    mediaMap.set(c.media, existing);
  }

  for (const s of spend) {
    if (!dateMap.has(s.date)) dateMap.set(s.date, new Map());
    const mediaMap = dateMap.get(s.date)!;
    const existing = mediaMap.get(s.media) || {
      total_calls: 0,
      valid_calls: 0,
      scrap_count: 0,
      spend: 0,
    };
    existing.spend += s.amount;
    mediaMap.set(s.media, existing);
  }

  const groups: DateGroup[] = [];
  const sortedDates = Array.from(dateMap.keys()).sort((a, b) => b.localeCompare(a));

  for (const date of sortedDates) {
    const mediaMap = dateMap.get(date)!;
    const mediaRows = Array.from(mediaMap.entries()).map(([media, data]) => ({
      media,
      ...data,
    }));
    const subtotal = mediaRows.reduce(
      (acc, r) => ({
        total_calls: acc.total_calls + r.total_calls,
        valid_calls: acc.valid_calls + r.valid_calls,
        scrap_count: acc.scrap_count + r.scrap_count,
        spend: acc.spend + r.spend,
      }),
      { total_calls: 0, valid_calls: 0, scrap_count: 0, spend: 0 }
    );
    groups.push({ date, mediaRows, subtotal });
  }

  return groups;
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
        데이���가 없습니다
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="border-[#334155] bg-[#0f172a] hover:bg-[#0f172a]">
          <TableHead className="text-[#94a3b8]">날짜 / 매체</TableHead>
          <TableHead className="text-right text-[#94a3b8]">전체콜량</TableHead>
          <TableHead className="text-right text-[#94a3b8]">유효</TableHead>
          <TableHead className="text-right text-[#94a3b8]">폐차</TableHead>
          <TableHead className="text-right text-[#94a3b8]">소진액</TableHead>
          <TableHead className="text-right text-[#94a3b8]">CPA(전체)</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {groups.map((group) => {
          const isOpen = expanded.has(group.date);
          const cpaTotal =
            group.subtotal.total_calls > 0
              ? Math.round(group.subtotal.spend / group.subtotal.total_calls)
              : null;

          return (
            <Fragment key={group.date}>
              <TableRow
                className="cursor-pointer border-[#334155] hover:bg-[#334155]/50"
                onClick={() => toggle(group.date)}
              >
                <TableCell className="font-medium text-[#e2e8f0]">
                  <span className="mr-1.5 inline-block w-3 text-[#94a3b8]">
                    {isOpen ? "▾" : "▸"}
                  </span>
                  {formatDateWithDay(parseISO(group.date))}
                </TableCell>
                <TableCell className="text-right font-semibold text-[#e2e8f0]">
                  {group.subtotal.total_calls}
                </TableCell>
                <TableCell className="text-right font-semibold text-[#4ade80]">
                  {group.subtotal.valid_calls}
                </TableCell>
                <TableCell className="text-right text-[#fbbf24]">
                  {group.subtotal.scrap_count}
                </TableCell>
                <TableCell className="text-right text-[#e2e8f0]">
                  {formatCurrency(group.subtotal.spend)}
                </TableCell>
                <TableCell className="text-right text-[#94a3b8]">
                  {cpaTotal != null ? formatCurrency(cpaTotal) : "-"}
                </TableCell>
              </TableRow>
              {isOpen &&
                group.mediaRows.map((row) => {
                  const mediaCpa =
                    row.total_calls > 0
                      ? Math.round(row.spend / row.total_calls)
                      : null;
                  return (
                    <TableRow
                      key={`${group.date}-${row.media}`}
                      className="border-[#334155] bg-[#0f172a]/40 hover:bg-[#334155]/30"
                    >
                      <TableCell className="pl-8">
                        <span style={{ color: MEDIA_COLORS[row.media] || "#94a3b8" }}>
                          {MEDIA_LABELS[row.media] || row.media}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-[#e2e8f0]">{row.total_calls}</TableCell>
                      <TableCell className="text-right text-[#4ade80]">
                        {row.valid_calls}
                      </TableCell>
                      <TableCell className="text-right text-[#fbbf24]">
                        {row.scrap_count}
                      </TableCell>
                      <TableCell className="text-right text-[#e2e8f0]">
                        {formatCurrency(row.spend)}
                      </TableCell>
                      <TableCell className="text-right text-[#94a3b8]">
                        {mediaCpa != null ? formatCurrency(mediaCpa) : "-"}
                      </TableCell>
                    </TableRow>
                  );
                })}
            </Fragment>
          );
        })}
      </TableBody>
    </Table>
  );
}
