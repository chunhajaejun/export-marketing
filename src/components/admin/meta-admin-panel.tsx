"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface MetaAccount {
  account_id: string;
  name: string;
  last_synced_at: string | null;
}
interface MetaCampaign {
  campaign_id: string;
  name: string;
  status: string | null;
  adlabels: Array<{ id: string; name: string }>;
}
interface MetaAd {
  ad_id: string;
  campaign_id: string;
  name: string;
  status: string | null;
  thumbnail_url: string | null;
  adlabels: Array<{ id: string; name: string }>;
}

export function MetaAdminPanel({
  accounts,
  ads,
  campaigns,
}: {
  accounts: MetaAccount[];
  ads: MetaAd[];
  campaigns: MetaCampaign[];
}) {
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function manualSync() {
    setSyncing(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/meta/sync", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "동기화 실패");
      const lines = [
        `캠페인: ${data.campaigns ?? 0}`,
        `광고세트: ${data.adsets ?? 0}`,
        `광고: ${data.ads ?? 0}`,
        `실적 행: ${data.insights ?? 0}`,
      ];
      if (data.errors?.length) {
        lines.push(`오류 ${data.errors.length}건: ${data.errors.slice(0, 3).join(" / ")}`);
      }
      setResult(lines.join("\n"));
    } catch (e) {
      setResult(e instanceof Error ? e.message : "실패");
    } finally {
      setSyncing(false);
    }
  }

  const adsByCampaign = new Map<string, MetaAd[]>();
  for (const ad of ads) {
    const arr = adsByCampaign.get(ad.campaign_id) ?? [];
    arr.push(ad);
    adsByCampaign.set(ad.campaign_id, arr);
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-[#334155] bg-[#1e293b] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-[#e2e8f0]">동기화 제어</h2>
            <p className="mt-1 text-xs text-[#94a3b8]">
              매 시간 자동 동기화 (Vercel Cron). 즉시 실행이 필요하면 "지금 동기화"를 누르세요.
            </p>
            {accounts[0] && (
              <p className="mt-1 text-xs text-[#94a3b8]">
                계정: <span className="text-[#e2e8f0]">{accounts[0].name}</span> ({accounts[0].account_id})
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

      {campaigns.length === 0 ? (
        <div className="rounded-xl border border-[#334155] bg-[#1e293b] p-4 text-sm text-[#94a3b8]">
          캠페인 데이터가 없습니다. "지금 동기화"를 눌러 메타에서 불러오세요.
        </div>
      ) : (
        campaigns.map((c) => {
          const cAds = adsByCampaign.get(c.campaign_id) ?? [];
          return (
            <div
              key={c.campaign_id}
              className="rounded-xl border border-[#334155] bg-[#1e293b] p-4"
            >
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-semibold text-[#e2e8f0]">{c.name}</h3>
                {c.status && (
                  <Badge variant="secondary" className="text-[10px]">
                    {c.status}
                  </Badge>
                )}
                {c.adlabels?.map((l) => (
                  <Badge key={l.id} variant="outline" className="text-[10px]">
                    {l.name}
                  </Badge>
                ))}
                <span className="ml-auto text-xs text-[#94a3b8]">{cAds.length} 광고</span>
              </div>
              {cAds.length > 0 && (
                <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {cAds.map((ad) => (
                    <li
                      key={ad.ad_id}
                      className="flex items-center gap-3 rounded-md border border-[#334155] bg-[#0f172a] p-2"
                    >
                      {ad.thumbnail_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={ad.thumbnail_url}
                          alt={ad.name}
                          className="h-12 w-12 shrink-0 rounded object-cover"
                        />
                      ) : (
                        <div className="h-12 w-12 shrink-0 rounded bg-[#334155]" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-xs font-semibold text-[#e2e8f0]">
                          {ad.name}
                        </div>
                        <div className="mt-0.5 flex flex-wrap gap-1">
                          {ad.status && (
                            <span className="text-[10px] text-[#94a3b8]">{ad.status}</span>
                          )}
                          {ad.adlabels?.map((l) => (
                            <span
                              key={l.id}
                              className="rounded bg-[#334155] px-1 text-[10px] text-[#94a3b8]"
                            >
                              {l.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
