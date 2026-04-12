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
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import type { CallReport, MediaChannel } from "@/lib/types";

const MEDIA_LABELS: Record<MediaChannel, string> = {
  naver_web: "네이버-홈페이지",
  naver_landing: "네이버-랜딩",
  danggeun: "당근",
  meta: "메타",
  google: "구글",
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
    async function fetch() {
      setLoading(true);
      const supabase = createClient();

      const { data: callData } = await supabase
        .from("call_reports")
        .select("*")
        .eq("date", selectedDate);

      setReports((callData as CallReport[]) ?? []);

      if (type === "spend") {
        const { data: spendData } = await supabase
          .from("ad_spend")
          .select("*")
          .eq("date", selectedDate);

        const map: Record<string, number> = {};
        if (spendData) {
          for (const s of spendData) {
            map[s.media] = s.amount;
          }
        }
        setSpendMap(map);
      }

      setLoading(false);
    }

    fetch();
  }, [selectedDate, refreshKey, type]);

  const reportMap = new Map<MediaChannel, CallReport>();
  for (const r of reports) {
    reportMap.set(r.media, r);
  }

  // 합계 계산
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
        <label className="text-sm font-medium">날짜</label>
        <Input
          type="date"
          value={selectedDate}
          onChange={(e) => onDateChange(e.target.value)}
          className="w-[160px]"
        />
      </div>

      {loading ? (
        <div className="py-8 text-center text-sm text-muted-foreground">
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
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>매체</TableHead>
          <TableHead className="text-right">수출</TableHead>
          <TableHead className="text-right">중고</TableHead>
          <TableHead className="text-right">폐차</TableHead>
          <TableHead className="text-right">부재</TableHead>
          <TableHead className="text-right">무효</TableHead>
          <TableHead className="text-right">합계</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {mediaOrder.map((media) => {
          const r = reportMap.get(media);
          return (
            <TableRow key={media}>
              <TableCell className="font-medium">
                {MEDIA_LABELS[media]}
              </TableCell>
              <TableCell className="text-right">
                {r ? (r.export_count ?? 0) + (r.phone_naver_count ?? 0) : "-"}
              </TableCell>
              <TableCell className="text-right">
                {r ? (r.used_car_count ?? 0) : "-"}
              </TableCell>
              <TableCell className="text-right">
                {r ? r.scrap_count : "-"}
              </TableCell>
              <TableCell className="text-right">
                {r ? r.absence_count : "-"}
              </TableCell>
              <TableCell className="text-right">
                {r ? r.invalid_count : "-"}
              </TableCell>
              <TableCell className="text-right font-bold">
                {r ? r.total_count : "-"}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
      <TableFooter>
        <TableRow>
          <TableCell className="font-bold">합계</TableCell>
          <TableCell className="text-right font-bold">
            {totals.export_count + totals.phone_naver_count}
          </TableCell>
          <TableCell className="text-right font-bold">
            {totals.used_car_count}
          </TableCell>
          <TableCell className="text-right font-bold">
            {totals.scrap_count}
          </TableCell>
          <TableCell className="text-right font-bold">
            {totals.absence_count}
          </TableCell>
          <TableCell className="text-right font-bold">
            {totals.invalid_count}
          </TableCell>
          <TableCell className="text-right font-bold">
            {totals.total_count}
          </TableCell>
        </TableRow>
      </TableFooter>
    </Table>
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
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>매체</TableHead>
          <TableHead className="text-right">소진액</TableHead>
          <TableHead className="text-right">콜량</TableHead>
          <TableHead className="text-right">단가(전체)</TableHead>
          <TableHead className="text-right">단가(유효)</TableHead>
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
            <TableRow key={media}>
              <TableCell className="font-medium">
                {MEDIA_LABELS[media]}
              </TableCell>
              <TableCell className="text-right">
                {spend > 0 ? spend.toLocaleString() : "-"}
              </TableCell>
              <TableCell className="text-right">
                {calls > 0 ? calls : "-"}
              </TableCell>
              <TableCell className="text-right">
                {cpaTotal !== null ? cpaTotal.toLocaleString() : "-"}
              </TableCell>
              <TableCell className="text-right">
                {cpaValid !== null ? cpaValid.toLocaleString() : "-"}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
      <TableFooter>
        <TableRow>
          <TableCell className="font-bold">합계</TableCell>
          <TableCell className="text-right font-bold">
            {totals.spend > 0 ? totals.spend.toLocaleString() : "-"}
          </TableCell>
          <TableCell className="text-right font-bold">
            {totals.total_count > 0 ? totals.total_count : "-"}
          </TableCell>
          <TableCell className="text-right font-bold">
            {totals.total_count > 0
              ? Math.round(totals.spend / totals.total_count).toLocaleString()
              : "-"}
          </TableCell>
          <TableCell className="text-right font-bold">
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
  );
}
