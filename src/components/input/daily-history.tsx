"use client";

import { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table";
import type { CallReport, MediaChannel } from "@/lib/types";

const MEDIA_LABELS: Record<MediaChannel, string> = {
  naver_web: "네이버-홈페이지",
  naver_landing: "네이버-랜딩",
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

const MEDIA_ORDER: MediaChannel[] = [
  "naver_web",
  "naver_landing",
  "danggeun",
  "meta",
  "google",
];

interface DailyHistoryProps {
  type: "calls" | "spend";
  selectedDate: string;
  onDateChange: (date: string) => void;
  refreshKey: number;
}

export function DailyHistory({
  type,
  selectedDate,
  onDateChange,
  refreshKey,
}: DailyHistoryProps) {
  const [reports, setReports] = useState<CallReport[]>([]);
  const [spendMap, setSpendMap] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const res = await fetch(`/api/data/daily-history?date=${selectedDate}&type=${type}`);
        if (!res.ok) throw new Error("조회 실패");
        const data = await res.json();

        if (type === "calls") {
          setReports(data as CallReport[]);
        } else {
          setReports((data.calls as CallReport[]) ?? []);
          const map: Record<string, number> = {};
          for (const s of data.spend) {
            map[s.media] = s.amount;
          }
          setSpendMap(map);
        }
      } catch {
        setReports([]);
        setSpendMap({});
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [selectedDate, refreshKey, type]);

  const reportMap = new Map<MediaChannel, CallReport>();
  for (const r of reports) {
    reportMap.set(r.media, r);
  }

  // Calculate totals
  const totals = {
    export_count: 0,
    used_car_count: 0,
    scrap_count: 0,
    absence_count: 0,
    invalid_count: 0,
    phone_naver_count: 0,
    total_count: 0,
    spend: 0,
  };

  for (const media of MEDIA_ORDER) {
    const r = reportMap.get(media);
    if (r) {
      totals.export_count += r.export_count ?? 0;
      totals.used_car_count += r.used_car_count ?? 0;
      totals.scrap_count += r.scrap_count;
      totals.absence_count += r.absence_count;
      totals.invalid_count += r.invalid_count;
      totals.phone_naver_count += r.phone_naver_count;
      totals.total_count += r.total_count;
    }
    totals.spend += spendMap[media] ?? 0;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-[#e2e8f0]">날짜</label>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => onDateChange(e.target.value)}
          className="h-8 w-[160px] rounded-lg border border-[#334155] bg-[#0f172a] px-2.5 text-sm text-[#e2e8f0] focus:border-[#3b82f6] focus:outline-none focus:ring-1 focus:ring-[#3b82f6]"
        />
      </div>

      {loading ? (
        <div className="py-8 text-center text-sm text-[#94a3b8]">
          로딩 중...
        </div>
      ) : type === "calls" ? (
        <CallsTable
          mediaOrder={MEDIA_ORDER}
          reportMap={reportMap}
          totals={totals}
        />
      ) : (
        <SpendTable
          mediaOrder={MEDIA_ORDER}
          reportMap={reportMap}
          spendMap={spendMap}
          totals={totals}
        />
      )}
    </div>
  );
}

interface Totals {
  export_count: number;
  used_car_count: number;
  scrap_count: number;
  absence_count: number;
  invalid_count: number;
  phone_naver_count: number;
  total_count: number;
  spend: number;
}

function CallsTable({
  mediaOrder,
  reportMap,
  totals,
}: {
  mediaOrder: MediaChannel[];
  reportMap: Map<MediaChannel, CallReport>;
  totals: Totals;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-[#334155]">
      <Table>
        <TableHeader>
          <TableRow className="border-[#334155] bg-[#0f172a] hover:bg-[#0f172a]">
            <TableHead className="text-[#94a3b8]">매체</TableHead>
            <TableHead className="text-right text-[#94a3b8]">수출</TableHead>
            <TableHead className="text-right text-[#94a3b8]">중고</TableHead>
            <TableHead className="text-right text-[#94a3b8]">폐차</TableHead>
            <TableHead className="text-right text-[#94a3b8]">부재</TableHead>
            <TableHead className="text-right text-[#94a3b8]">무효</TableHead>
            <TableHead className="text-right text-[#94a3b8]">합계</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {mediaOrder.map((media) => {
            const r = reportMap.get(media);
            return (
              <TableRow key={media} className="border-[#334155] hover:bg-[#334155]/50">
                <TableCell className="font-medium" style={{ color: MEDIA_COLORS[media] }}>
                  {MEDIA_LABELS[media]}
                </TableCell>
                <TableCell className="text-right text-[#4ade80]">
                  {r ? (r.export_count ?? 0) + (r.phone_naver_count ?? 0) : "-"}
                </TableCell>
                <TableCell className="text-right text-[#4ade80]">
                  {r ? (r.used_car_count ?? 0) : "-"}
                </TableCell>
                <TableCell className="text-right text-[#fbbf24]">
                  {r ? r.scrap_count : "-"}
                </TableCell>
                <TableCell className="text-right text-[#60a5fa]">
                  {r ? r.absence_count : "-"}
                </TableCell>
                <TableCell className="text-right text-[#f87171]">
                  {r ? r.invalid_count : "-"}
                </TableCell>
                <TableCell className="text-right font-bold text-[#e2e8f0]">
                  {r ? r.total_count : "-"}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
        <TableFooter>
          <TableRow className="border-[#334155] bg-[#0f172a]/80 hover:bg-[#0f172a]/80">
            <TableCell className="font-bold text-[#e2e8f0]">합계</TableCell>
            <TableCell className="text-right font-bold text-[#4ade80]">
              {totals.export_count + totals.phone_naver_count}
            </TableCell>
            <TableCell className="text-right font-bold text-[#4ade80]">
              {totals.used_car_count}
            </TableCell>
            <TableCell className="text-right font-bold text-[#fbbf24]">
              {totals.scrap_count}
            </TableCell>
            <TableCell className="text-right font-bold text-[#60a5fa]">
              {totals.absence_count}
            </TableCell>
            <TableCell className="text-right font-bold text-[#f87171]">
              {totals.invalid_count}
            </TableCell>
            <TableCell className="text-right font-bold text-[#e2e8f0]">
              {totals.total_count}
            </TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  );
}

function SpendTable({
  mediaOrder,
  reportMap,
  spendMap,
  totals,
}: {
  mediaOrder: MediaChannel[];
  reportMap: Map<MediaChannel, CallReport>;
  spendMap: Record<string, number>;
  totals: Totals;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-[#334155]">
      <Table>
        <TableHeader>
          <TableRow className="border-[#334155] bg-[#0f172a] hover:bg-[#0f172a]">
            <TableHead className="text-[#94a3b8]">매체</TableHead>
            <TableHead className="text-right text-[#94a3b8]">소진액</TableHead>
            <TableHead className="text-right text-[#94a3b8]">콜량</TableHead>
            <TableHead className="text-right text-[#94a3b8]">단가(전체)</TableHead>
            <TableHead className="text-right text-[#94a3b8]">단가(유효)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {mediaOrder.map((media) => {
            const r = reportMap.get(media);
            const spend = spendMap[media] ?? 0;
            const calls = r?.total_count ?? 0;
            const validCalls =
              (r?.export_count ?? 0) +
              (r?.used_car_count ?? 0) +
              (r?.phone_naver_count ?? 0);
            const cpaTotal = calls > 0 ? Math.round(spend / calls) : null;
            const cpaValid =
              validCalls > 0 ? Math.round(spend / validCalls) : null;

            return (
              <TableRow key={media} className="border-[#334155] hover:bg-[#334155]/50">
                <TableCell className="font-medium" style={{ color: MEDIA_COLORS[media] }}>
                  {MEDIA_LABELS[media]}
                </TableCell>
                <TableCell className="text-right text-[#e2e8f0]">
                  {spend > 0 ? spend.toLocaleString() : "-"}
                </TableCell>
                <TableCell className="text-right text-[#e2e8f0]">
                  {calls > 0 ? calls : "-"}
                </TableCell>
                <TableCell className="text-right text-[#94a3b8]">
                  {cpaTotal !== null ? cpaTotal.toLocaleString() : "-"}
                </TableCell>
                <TableCell className="text-right text-[#94a3b8]">
                  {cpaValid !== null ? cpaValid.toLocaleString() : "-"}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
        <TableFooter>
          <TableRow className="border-[#334155] bg-[#0f172a]/80 hover:bg-[#0f172a]/80">
            <TableCell className="font-bold text-[#e2e8f0]">합계</TableCell>
            <TableCell className="text-right font-bold text-[#e2e8f0]">
              {totals.spend > 0 ? totals.spend.toLocaleString() : "-"}
            </TableCell>
            <TableCell className="text-right font-bold text-[#e2e8f0]">
              {totals.total_count > 0 ? totals.total_count : "-"}
            </TableCell>
            <TableCell className="text-right font-bold text-[#94a3b8]">
              {totals.total_count > 0
                ? Math.round(totals.spend / totals.total_count).toLocaleString()
                : "-"}
            </TableCell>
            <TableCell className="text-right font-bold text-[#94a3b8]">
              {totals.export_count + totals.used_car_count + totals.phone_naver_count > 0
                ? Math.round(
                    totals.spend /
                      (totals.export_count +
                        totals.used_car_count +
                        totals.phone_naver_count)
                  ).toLocaleString()
                : "-"}
            </TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  );
}
