"use client";

import { useState } from "react";
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
  naver_web: "text-blue-400",
  naver_landing: "text-blue-400",
  danggeun: "text-orange-400",
  meta: "text-purple-400",
  google: "text-emerald-400",
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

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>날짜 / 매체</TableHead>
          <TableHead className="text-right">전체콜량</TableHead>
          <TableHead className="text-right">유효</TableHead>
          <TableHead className="text-right">폐차</TableHead>
          <TableHead className="text-right">소진액</TableHead>
          <TableHead className="text-right">CPA(전체)</TableHead>
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
                className="cursor-pointer hover:bg-muted/70"
                onClick={() => toggle(group.date)}
              >
                <TableCell className="font-medium">
                  <span className="mr-1.5 inline-block w-3 text-muted-foreground">
                    {isOpen ? "▾" : "▸"}
                  </span>
                  {formatDateWithDay(parseISO(group.date))}
                </TableCell>
                <TableCell className="text-right font-semibold">
                  {group.subtotal.total_calls}
                </TableCell>
                <TableCell className="text-right text-blue-400">
                  {group.subtotal.valid_calls}
                </TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {group.subtotal.scrap_count}
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(group.subtotal.spend)}
                </TableCell>
                <TableCell className="text-right">
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
                      className="bg-muted/20"
                    >
                      <TableCell className="pl-8">
                        <span className={MEDIA_COLORS[row.media] || ""}>
                          {MEDIA_LABELS[row.media] || row.media}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">{row.total_calls}</TableCell>
                      <TableCell className="text-right text-blue-400">
                        {row.valid_calls}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {row.scrap_count}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(row.spend)}
                      </TableCell>
                      <TableCell className="text-right">
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

// Fragment import
import { Fragment } from "react";
