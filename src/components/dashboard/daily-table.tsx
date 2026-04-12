"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils/currency-format";
import { formatDateWithDay } from "@/lib/utils/date-utils";
import type { DailySummary } from "@/lib/types";
import { format, isToday, parseISO } from "date-fns";

interface DailyTableProps {
  data: DailySummary[];
}

export function DailyTable({ data }: DailyTableProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-[#94a3b8]">
        데이터가 없습니다
      </div>
    );
  }

  const totals = data.reduce(
    (acc, row) => ({
      total_calls: acc.total_calls + row.total_calls,
      valid_calls: acc.valid_calls + row.valid_calls,
      invalid:
        acc.invalid + row.scrap_count + row.absence_count + row.invalid_count + row.phone_naver_count,
      scrap_count: acc.scrap_count + row.scrap_count,
      total_spend: acc.total_spend + row.total_spend,
    }),
    { total_calls: 0, valid_calls: 0, invalid: 0, scrap_count: 0, total_spend: 0 }
  );

  const totalCpaTotal =
    totals.total_calls > 0
      ? Math.round(totals.total_spend / totals.total_calls)
      : null;
  const totalCpaValid =
    totals.valid_calls > 0
      ? Math.round(totals.total_spend / totals.valid_calls)
      : null;

  return (
    <Table>
      <TableHeader>
        <TableRow className="border-[#334155] bg-[#0f172a] hover:bg-[#0f172a]">
          <TableHead className="text-[#94a3b8]">날짜</TableHead>
          <TableHead className="text-right text-[#94a3b8]">전체콜량</TableHead>
          <TableHead className="text-right text-[#94a3b8]">유효</TableHead>
          <TableHead className="text-right text-[#94a3b8]">무효</TableHead>
          <TableHead className="text-right text-[#94a3b8]">폐차</TableHead>
          <TableHead className="text-right text-[#94a3b8]">소진액</TableHead>
          <TableHead className="text-right text-[#94a3b8]">단가(전체)</TableHead>
          <TableHead className="text-right text-[#94a3b8]">단가(유효)</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((row) => {
          const dateObj = parseISO(row.date);
          const today = isToday(dateObj);
          const invalidTotal =
            row.scrap_count + row.absence_count + row.invalid_count + row.phone_naver_count;

          return (
            <TableRow
              key={row.date}
              className={`border-[#334155] ${today ? "bg-[#3b82f6]/10" : "hover:bg-[#334155]/50"}`}
            >
              <TableCell className="font-medium text-[#e2e8f0]">
                {formatDateWithDay(dateObj)}
                {today && row.last_reported_at && (
                  <span className="ml-1.5 text-xs text-[#94a3b8]">
                    {format(parseISO(row.last_reported_at), "HH:mm")} 기준
                  </span>
                )}
              </TableCell>
              <TableCell className="text-right font-semibold text-[#e2e8f0]">
                {row.total_calls}
              </TableCell>
              <TableCell className="text-right font-semibold text-[#4ade80]">
                {row.valid_calls}
              </TableCell>
              <TableCell className="text-right text-[#f87171]">
                {invalidTotal}
              </TableCell>
              <TableCell className="text-right text-[#fbbf24]">
                {row.scrap_count}
              </TableCell>
              <TableCell className="text-right text-[#e2e8f0]">
                {formatCurrency(row.total_spend)}
              </TableCell>
              <TableCell className="text-right text-[#94a3b8]">
                {row.cpa_total != null ? formatCurrency(row.cpa_total) : "-"}
              </TableCell>
              <TableCell className="text-right text-[#94a3b8]">
                {row.cpa_valid != null ? formatCurrency(row.cpa_valid) : "-"}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
      <TableFooter>
        <TableRow className="border-[#334155] bg-[#0f172a]/80 hover:bg-[#0f172a]/80">
          <TableCell className="font-semibold text-[#e2e8f0]">합계</TableCell>
          <TableCell className="text-right font-semibold text-[#e2e8f0]">
            {totals.total_calls}
          </TableCell>
          <TableCell className="text-right font-semibold text-[#4ade80]">
            {totals.valid_calls}
          </TableCell>
          <TableCell className="text-right text-[#f87171]">
            {totals.invalid}
          </TableCell>
          <TableCell className="text-right text-[#fbbf24]">
            {totals.scrap_count}
          </TableCell>
          <TableCell className="text-right font-semibold text-[#e2e8f0]">
            {formatCurrency(totals.total_spend)}
          </TableCell>
          <TableCell className="text-right text-[#94a3b8]">
            {totalCpaTotal != null ? formatCurrency(totalCpaTotal) : "-"}
          </TableCell>
          <TableCell className="text-right text-[#94a3b8]">
            {totalCpaValid != null ? formatCurrency(totalCpaValid) : "-"}
          </TableCell>
        </TableRow>
      </TableFooter>
    </Table>
  );
}
