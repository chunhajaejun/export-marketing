"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface NaverAccount {
  account_key: string;
  customer_id: string;
  label: string;
}

interface NaverCampaign {
  campaign_id: string;
  account_key: string;
  name: string;
  campaign_tp: string | null;
  status: string | null;
  is_whitelisted: boolean;
  media_channel: "naver_web" | "naver_landing";
  last_synced_at: string | null;
}

export function NaverAdminPanel({
  initialAccounts,
  initialCampaigns,
}: {
  initialAccounts: NaverAccount[];
  initialCampaigns: NaverCampaign[];
}) {
  const [accounts] = useState(initialAccounts);
  const [campaigns, setCampaigns] = useState(initialCampaigns);
  const [loading, setLoading] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<string | null>(null);

  async function refreshCampaignList() {
    setRefreshing(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/naver/campaigns?refresh=1");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "불러오기 실패");
      setCampaigns(data.campaigns ?? []);
      setMessage(
        data.errors?.length
          ? `일부 오류: ${data.errors.slice(0, 3).join(" / ")}`
          : "네이버에서 최신 캠페인 목록 불러오기 완료"
      );
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "실패");
    } finally {
      setRefreshing(false);
    }
  }

  async function toggleWhitelist(campaignId: string, next: boolean) {
    setLoading(campaignId);
    try {
      const res = await fetch("/api/admin/naver/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId, isWhitelisted: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "저장 실패");
      setCampaigns((prev) =>
        prev.map((c) =>
          c.campaign_id === campaignId ? { ...c, is_whitelisted: next } : c
        )
      );
    } catch (e) {
      alert(e instanceof Error ? e.message : "실패");
    } finally {
      setLoading(null);
    }
  }

  async function changeMediaChannel(
    campaignId: string,
    next: "naver_web" | "naver_landing"
  ) {
    setLoading(campaignId);
    try {
      const res = await fetch("/api/admin/naver/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId, mediaChannel: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "저장 실패");
      setCampaigns((prev) =>
        prev.map((c) =>
          c.campaign_id === campaignId ? { ...c, media_channel: next } : c
        )
      );
    } catch (e) {
      alert(e instanceof Error ? e.message : "실패");
    } finally {
      setLoading(null);
    }
  }

  async function manualSync() {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch("/api/admin/naver/sync", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "동기화 실패");
      const accs = (data.accounts ?? []) as Array<{
        account: string;
        campaigns_upserted: number;
        stats_rows: number;
        errors: string[];
      }>;
      const lines = accs.map(
        (a) =>
          `${a.account}: 캠페인 ${a.campaigns_upserted}건 / 실적 ${a.stats_rows}행${
            a.errors.length ? ` / 오류 ${a.errors.length}` : ""
          }`
      );
      setSyncResult(lines.join("\n"));
    } catch (e) {
      setSyncResult(e instanceof Error ? e.message : "실패");
    } finally {
      setSyncing(false);
    }
  }

  const byAccount = accounts.map((acc) => ({
    account: acc,
    campaigns: campaigns.filter((c) => c.account_key === acc.account_key),
  }));

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-[#334155] bg-[#1e293b] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-[#e2e8f0]">동기화 제어</h2>
            <p className="mt-1 text-xs text-[#94a3b8]">
              매 시간 자동 동기화 (Vercel Cron). 즉시 실행이 필요하면 "지금 동기화"를 누르세요.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={refreshing}
              onClick={refreshCampaignList}
            >
              {refreshing ? "불러오는 중..." : "네이버에서 캠페인 새로고침"}
            </Button>
            <Button size="sm" disabled={syncing} onClick={manualSync}>
              {syncing ? "동기화 중..." : "지금 동기화"}
            </Button>
          </div>
        </div>
        {message && (
          <div className="mt-3 rounded-md border border-[#334155] bg-[#0f172a] px-3 py-2 text-sm text-[#94a3b8]">
            {message}
          </div>
        )}
        {syncResult && (
          <pre className="mt-3 whitespace-pre-wrap rounded-md border border-[#334155] bg-[#0f172a] px-3 py-2 text-xs text-[#e2e8f0]">
            {syncResult}
          </pre>
        )}
      </div>

      {byAccount.map(({ account, campaigns: accCampaigns }) => (
        <div key={account.account_key} className="rounded-xl border border-[#334155] bg-[#1e293b] p-4">
          <div className="mb-3 flex items-center gap-2">
            <h3 className="text-base font-semibold text-[#e2e8f0]">{account.label}</h3>
            <span className="text-xs text-[#94a3b8]">CustomerID {account.customer_id}</span>
            <Badge variant="outline">{accCampaigns.length} 캠페인</Badge>
          </div>
          {accCampaigns.length === 0 ? (
            <p className="text-sm text-[#94a3b8]">
              캠페인 정보가 없습니다. "네이버에서 캠페인 새로고침"을 눌러 불러오세요.
            </p>
          ) : (
            <ul className="divide-y divide-[#334155]">
              {accCampaigns.map((c) => (
                <li
                  key={c.campaign_id}
                  className="flex items-center justify-between gap-3 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-semibold text-[#e2e8f0]">
                        {c.name || "(이름 없음)"}
                      </span>
                      {c.status && (
                        <Badge variant="secondary" className="text-[10px]">
                          {c.status}
                        </Badge>
                      )}
                    </div>
                    <div className="mt-1 truncate font-mono text-xs text-[#94a3b8]">
                      {c.campaign_id}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <select
                      disabled={loading === c.campaign_id}
                      value={c.media_channel}
                      onChange={(e) =>
                        changeMediaChannel(
                          c.campaign_id,
                          e.target.value as "naver_web" | "naver_landing"
                        )
                      }
                      className="h-8 rounded-md border border-[#334155] bg-[#0f172a] px-2 text-xs text-[#e2e8f0] focus:border-[#3b82f6] focus:outline-none"
                    >
                      <option value="naver_web">네이버 웹</option>
                      <option value="naver_landing">네이버 랜딩</option>
                    </select>
                    <label className="flex items-center gap-2 text-sm text-[#e2e8f0]">
                      <input
                        type="checkbox"
                        checked={c.is_whitelisted}
                        disabled={loading === c.campaign_id}
                        onChange={(e) =>
                          toggleWhitelist(c.campaign_id, e.target.checked)
                        }
                        className="h-4 w-4 accent-[#3b82f6]"
                      />
                      동기화
                    </label>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}
