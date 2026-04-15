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
      export_count: acc.export_count + row.export_count,
      used_car_count: acc.used_car_count + row.used_car_count,
      scrap_count: acc.scrap_count + row.scrap_count,
      absence_count: acc.absence_count + row.absence_count,
      invalid_count:
        acc.invalid_count + row.invalid_count + row.phone_naver_count,
      total_spend: acc.total_spend + row.total_spend,
    }),
    {
      total_calls: 0,
      export_count: 0,
      used_car_count: 0,
      scrap_count: 0,
      absence_count: 0,
      invalid_count: 0,
      total_spend: 0,
    }
  );

  const totalCpaTotal =
    totals.total_calls > 0
      ? Math.round(totals.total_spend / totals.total_calls)
      : null;
  const totalValidCalls = totals.export_count + totals.used_car_count + totals.scrap_count;
  const totalCpaValid =
    totalValidCalls > 0
      ? Math.round(totals.total_spend / totalValidCalls)
      : null;

  return (
    <div className="overflow-hidden rounded-xl">
      <Table>
        <TableHeader>
          <TableRow className="border-[#334155] bg-[#0f172a] hover:bg-[#0f172a]">
            <TableHead className="text-[#64748b]">날짜</TableHead>
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
          {data.map((row, idx) => {
            const dateObj = parseISO(row.date);
            const today = isToday(dateObj);
            const invalidTotal = row.invalid_count + row.phone_naver_count;

            return (
              <TableRow
                key={row.date}
                className={`border-[#334155] ${
                  today
                    ? "bg-[#3b82f6]/10"
                    : idx % 2 === 0
                    ? "bg-[#1e293b]"
                    : "bg-[#1a2332]"
                } hover:bg-[#334155]/50`}
              >
                <TableCell className="font-medium text-[#e2e8f0]">
                  {formatDateWithDay(dateObj)}
                  {today && row.last_reported_at && (
                    <span className="ml-1.5 text-xs text-[#94a3b8]">
                      {format(parseISO(row.last_reported_at), "HH:mm")} 기준
                    </span>
                  )}
                </TableCell>
                <TableCell
                  className="text-right font-semibold"
                  style={{ color: row.total_calls === 0 ? "#475569" : "#e2e8f0" }}
                >
                  {row.total_calls}
                </TableCell>
                <ValCell value={row.export_count} color="#4ade80" />
                <ValCell value={row.used_car_count} color="#4ade80" />
                <ValCell value={row.scrap_count} color="#fbbf24" />
                <ValCell value={row.absence_count} color="#60a5fa" />
                <ValCell value={invalidTotal} color="#f87171" />
                <TableCell
                  className="text-right"
                  style={{ color: row.total_spend === 0 ? "#475569" : "#e2e8f0" }}
                >
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
          <TableRow className="border-[#334155] bg-[#0f172a] hover:bg-[#0f172a]" style={{ borderTop: "2px solid #3b82f6" }}>
            <TableCell className="font-bold text-white">합계</TableCell>
            <TableCell className="text-right font-bold text-white">
              {totals.total_calls}
            </TableCell>
            <TableCell className="text-right font-bold text-white">
              {totals.export_count}
            </TableCell>
            <TableCell className="text-right font-bold text-white">
              {totals.used_car_count}
            </TableCell>
            <TableCell className="text-right font-bold text-white">
              {totals.scrap_count}
            </TableCell>
            <TableCell className="text-right font-bold text-white">
              {totals.absence_count}
            </TableCell>
            <TableCell className="text-right font-bold text-white">
              {totals.invalid_count}
            </TableCell>
            <TableCell className="text-right font-bold text-white">
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
    </div>
  );
}
