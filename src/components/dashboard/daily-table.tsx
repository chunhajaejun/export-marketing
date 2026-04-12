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
        <TableRow>
          <TableHead>날짜</TableHead>
          <TableHead className="text-right">전체콜량</TableHead>
          <TableHead className="text-right">유효</TableHead>
          <TableHead className="text-right">무효</TableHead>
          <TableHead className="text-right">폐차</TableHead>
          <TableHead className="text-right">소진액</TableHead>
          <TableHead className="text-right">단가(전체)</TableHead>
          <TableHead className="text-right">단가(유효)</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((row) => {
          const dateObj = parseISO(row.date);
          const today = isToday(dateObj);
          const invalidTotal =
            row.scrap_count + row.absence_count + row.invalid_count + row.phone_naver_count;

          return (
            <TableRow key={row.date} className={today ? "bg-primary/5" : ""}>
              <TableCell className="font-medium">
                {formatDateWithDay(dateObj)}
                {today && row.last_reported_at && (
                  <span className="ml-1.5 text-xs text-muted-foreground">
                    {format(parseISO(row.last_reported_at), "HH:mm")} 기준
                  </span>
                )}
              </TableCell>
              <TableCell className="text-right font-semibold">
                {row.total_calls}
              </TableCell>
              <TableCell className="text-right text-blue-400">
                {row.valid_calls}
              </TableCell>
              <TableCell className="text-right text-muted-foreground">
                {invalidTotal}
              </TableCell>
              <TableCell className="text-right text-muted-foreground">
                {row.scrap_count}
              </TableCell>
              <TableCell className="text-right">
                {formatCurrency(row.total_spend)}
              </TableCell>
              <TableCell className="text-right">
                {row.cpa_total != null ? formatCurrency(row.cpa_total) : "-"}
              </TableCell>
              <TableCell className="text-right">
                {row.cpa_valid != null ? formatCurrency(row.cpa_valid) : "-"}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
      <TableFooter>
        <TableRow>
          <TableCell className="font-semibold">합계</TableCell>
          <TableCell className="text-right font-semibold">
            {totals.total_calls}
          </TableCell>
          <TableCell className="text-right font-semibold text-blue-400">
            {totals.valid_calls}
          </TableCell>
          <TableCell className="text-right text-muted-foreground">
            {totals.invalid}
          </TableCell>
          <TableCell className="text-right text-muted-foreground">
            {totals.scrap_count}
          </TableCell>
          <TableCell className="text-right font-semibold">
            {formatCurrency(totals.total_spend)}
          </TableCell>
          <TableCell className="text-right">
            {totalCpaTotal != null ? formatCurrency(totalCpaTotal) : "-"}
          </TableCell>
          <TableCell className="text-right">
            {totalCpaValid != null ? formatCurrency(totalCpaValid) : "-"}
          </TableCell>
        </TableRow>
      </TableFooter>
    </Table>
  );
}
