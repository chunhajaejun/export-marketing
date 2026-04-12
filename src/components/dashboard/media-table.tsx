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

interface MediaSummary {
  media: MediaChannel;
  spend: number;
  total_calls: number;
  valid_calls: number;
  cpa_total: number | null;
  cpa_valid: number | null;
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
  const summaries: MediaSummary[] = ALL_MEDIA.map((media) => {
    const mediaCalls = calls.filter((c) => c.media === media);
    const mediaSpend = spend.filter((s) => s.media === media);

    const totalCalls = mediaCalls.reduce((s, c) => s + (c.total_count || 0), 0);
    const validCalls = mediaCalls.reduce((s, c) => s + (c.export_count || 0) + (c.used_car_count || 0) + (c.phone_naver_count || 0), 0);
    const totalSpend = mediaSpend.reduce((s, sp) => s + (sp.amount || 0), 0);

    return {
      media,
      spend: totalSpend,
      total_calls: totalCalls,
      valid_calls: validCalls,
      cpa_total: totalCalls > 0 ? Math.round(totalSpend / totalCalls) : null,
      cpa_valid: validCalls > 0 ? Math.round(totalSpend / validCalls) : null,
    };
  });

  const totals = summaries.reduce(
    (acc, s) => ({
      spend: acc.spend + s.spend,
      total_calls: acc.total_calls + s.total_calls,
      valid_calls: acc.valid_calls + s.valid_calls,
    }),
    { spend: 0, total_calls: 0, valid_calls: 0 }
  );

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
          {summaries.map((s, i) => (
            <TableRow
              key={s.media}
              className={`border-[#334155] hover:bg-[#334155]/50 ${i % 2 === 0 ? "bg-[#1e293b]" : "bg-[#1a2332]"}`}
            >
              <TableCell className="font-medium text-[#e2e8f0]">
                <span
                  className="mr-2 inline-block h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: MEDIA_COLORS[s.media] }}
                />
                {MEDIA_LABELS[s.media]}
              </TableCell>
              <ValCell value={s.spend} color="#e2e8f0" isCurrency />
              <ValCell value={s.total_calls} color="#e2e8f0" />
              <ValCell value={s.valid_calls} color="#4ade80" />
              <ValCell value={s.cpa_total} color="#e2e8f0" isCurrency />
              <ValCell value={s.cpa_valid} color="#4ade80" isCurrency />
            </TableRow>
          ))}
        </TableBody>
        <TableRow
          className="border-[#334155] bg-[#0f172a] hover:bg-[#0f172a]"
          style={{ borderTop: "2px solid #3b82f6" }}
        >
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
