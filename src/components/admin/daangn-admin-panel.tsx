"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface DaangnStat {
  date: string;
  media_id: number;
  media_name: string;
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
  chat_inquiry: number;
  phone_inquiry: number;
  service_request: number;
  ctr: number | null;
  cpc: number | null;
  cpa: number | null;
  source: string | null;
  synced_at: string;
}

function won(n: number) {
  return "₩" + Math.round(Number(n)).toLocaleString("ko-KR");
}

function fmt(n: number) {
  return Number(n).toLocaleString("ko-KR");
}

function formatKst(iso: string): string {
  const d = new Date(iso);
  const kst = new Date(d.getTime() + 9 * 3600 * 1000);
  return kst.toISOString().replace("T", " ").slice(0, 19);
}

export function DaangnAdminPanel({
  initialStats,
}: {
  initialStats: DaangnStat[];
}) {
  const [stats] = useState(initialStats);
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function manualSync() {
    setSyncing(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/daangn/sync", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "동기화 실패");
      const lines = [
        `적재 행: ${data.rows_upserted ?? 0}`,
      ];
      if (data.errors?.length) {
        lines.push(`오류 ${data.errors.length}건: ${data.errors.slice(0, 3).join(" / ")}`);
      } else {
        lines.push("오류 없음");
      }
      setResult(lines.join("\n"));
      setTimeout(() => window.location.reload(), 1500);
    } catch (e) {
      setResult(e instanceof Error ? e.message : "실패");
    } finally {
      setSyncing(false);
    }
  }

  const lastSyncedAt = stats[0]?.synced_at;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-[#334155] bg-[#1e293b] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-[#e2e8f0]">동기화 제어</h2>
            <p className="mt-1 text-xs text-[#94a3b8]">
              매일 KST 03~06시 자동 동기화 (당근 크롤러는 02시 KST에 갱신). 즉시 실행이 필요하면 &quot;지금 동기화&quot;를 누르세요.
            </p>
            <p className="mt-1 text-xs text-[#94a3b8]">
              매체: <span className="text-[#e2e8f0]">투바이어 (media_id: 795)</span>
            </p>
            {lastSyncedAt && (
              <p className="mt-1 text-xs text-[#94a3b8]">
                마지막 동기화: <span className="text-[#e2e8f0]">{formatKst(lastSyncedAt)}</span>
              </p>
            )}
          </div>
          <Button size="sm" disabled={syncing} onClick={manualSync}>
            {syncing ? "동기화 중..." : "지금 동기화"}
          </Button>
        </div>
        {result && (
          <pre className="mt-3 whitespace-pre-wrap rounded-md border border-[#334155] bg-[#0f172a] px-3 py-2 text-xs text-[#e2e8f0]">
            {result}
          </pre>
        )}
      </div>

      <div className="rounded-xl border border-[#334155] bg-[#1e293b] p-4">
        <div className="mb-3 flex items-center gap-2">
          <h3 className="text-base font-semibold text-[#e2e8f0]">최근 14일 데이터</h3>
          <Badge variant="outline">{stats.length}건</Badge>
        </div>
        {stats.length === 0 ? (
          <p className="text-sm text-[#94a3b8]">
            데이터가 없습니다. &quot;지금 동기화&quot;를 눌러 당근에서 불러오세요.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#334155] text-[#94a3b8]">
                  <th className="px-2 py-2 text-left">날짜</th>
                  <th className="px-2 py-2 text-right">노출</th>
                  <th className="px-2 py-2 text-right">클릭</th>
                  <th className="px-2 py-2 text-right">CTR</th>
                  <th className="px-2 py-2 text-right">광고비</th>
                  <th className="px-2 py-2 text-right">CPC</th>
                  <th className="px-2 py-2 text-right">전환</th>
                  <th className="px-2 py-2 text-right">채팅</th>
                  <th className="px-2 py-2 text-right">전화</th>
                  <th className="px-2 py-2 text-right">서비스 요청</th>
                  <th className="px-2 py-2 text-right">CPA</th>
                </tr>
              </thead>
              <tbody>
                {stats.map((s) => (
                  <tr
                    key={`${s.date}-${s.media_id}`}
                    className="border-b border-[#334155]/50 text-[#e2e8f0] hover:bg-[#334155]/30"
                  >
                    <td className="px-2 py-2">{s.date}</td>
                    <td className="px-2 py-2 text-right">{fmt(s.impressions)}</td>
                    <td className="px-2 py-2 text-right">{fmt(s.clicks)}</td>
                    <td className="px-2 py-2 text-right text-[#3b82f6]">
                      {s.ctr !== null ? Number(s.ctr).toFixed(2) + "%" : "-"}
                    </td>
                    <td className="px-2 py-2 text-right">{won(s.cost)}</td>
                    <td className="px-2 py-2 text-right text-[#94a3b8]">
                      {s.cpc !== null && Number(s.cpc) > 0 ? won(s.cpc) : "-"}
                    </td>
                    <td className="px-2 py-2 text-right font-bold text-[#4ade80]">
                      {fmt(s.conversions)}
                    </td>
                    <td className="px-2 py-2 text-right">{fmt(s.chat_inquiry)}</td>
                    <td className="px-2 py-2 text-right">{fmt(s.phone_inquiry)}</td>
                    <td className="px-2 py-2 text-right">{fmt(s.service_request)}</td>
                    <td className="px-2 py-2 text-right text-[#94a3b8]">
                      {s.cpa !== null && Number(s.cpa) > 0 ? won(s.cpa) : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
