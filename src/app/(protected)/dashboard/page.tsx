import { Suspense } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { subDays, format } from "date-fns";
import type { CallReport, AdSpend, DailySummary, MediaChannel } from "@/lib/types";
import { FilterBar } from "@/components/dashboard/filter-bar";
import { DailyTable } from "@/components/dashboard/daily-table";
import { CallTrendChart } from "@/components/dashboard/call-trend-chart";
import { MediaPieChart } from "@/components/dashboard/media-pie-chart";
import { MediaTable } from "@/components/dashboard/media-table";
import { DailySwipeCard } from "@/components/dashboard/daily-swipe-card";
import { MediaSwipeCard } from "@/components/dashboard/media-swipe-card";

function buildDailySummaries(
  calls: CallReport[],
  spend: AdSpend[],
  startDate: string,
  endDate: string
): DailySummary[] {
  const dateMap = new Map<
    string,
    {
      total_calls: number;
      valid_calls: number;
      export_count: number;
      used_car_count: number;
      scrap_count: number;
      absence_count: number;
      invalid_count: number;
      phone_naver_count: number;
      total_spend: number;
      last_reported_at: string | null;
    }
  >();

  for (const c of calls) {
    const existing = dateMap.get(c.date) || {
      total_calls: 0,
      valid_calls: 0,
      export_count: 0,
      used_car_count: 0,
      scrap_count: 0,
      absence_count: 0,
      invalid_count: 0,
      phone_naver_count: 0,
      total_spend: 0,
      last_reported_at: null,
    };

    existing.total_calls += c.total_count;
    existing.valid_calls += c.valid_total ?? 0;
    existing.export_count += c.export_count ?? 0;
    existing.used_car_count += c.used_car_count ?? 0;
    existing.scrap_count += c.scrap_count;
    existing.absence_count += c.absence_count;
    existing.invalid_count += c.invalid_count;
    existing.phone_naver_count += c.phone_naver_count;

    if (
      !existing.last_reported_at ||
      c.reported_at > existing.last_reported_at
    ) {
      existing.last_reported_at = c.reported_at;
    }

    dateMap.set(c.date, existing);
  }

  for (const s of spend) {
    const existing = dateMap.get(s.date) || {
      total_calls: 0,
      valid_calls: 0,
      export_count: 0,
      used_car_count: 0,
      scrap_count: 0,
      absence_count: 0,
      invalid_count: 0,
      phone_naver_count: 0,
      total_spend: 0,
      last_reported_at: null,
    };
    existing.total_spend += s.amount;
    dateMap.set(s.date, existing);
  }

  // startDate~endDate 사이 모든 날짜를 채움 (데이터 없으면 0)
  const allDates: string[] = [];
  const cur = new Date(startDate);
  const end = new Date(endDate);
  while (cur <= end) {
    allDates.push(format(cur, "yyyy-MM-dd"));
    cur.setDate(cur.getDate() + 1);
  }

  const emptyDay = {
    total_calls: 0, valid_calls: 0, export_count: 0, used_car_count: 0,
    scrap_count: 0, absence_count: 0, invalid_count: 0, phone_naver_count: 0,
    total_spend: 0, last_reported_at: null,
  };

  return allDates.map((date) => {
    const data = dateMap.get(date) || emptyDay;
    return {
      date,
      ...data,
      cpa_total: data.total_calls > 0 ? Math.round(data.total_spend / data.total_calls) : null,
      cpa_valid: data.valid_calls > 0 ? Math.round(data.total_spend / data.valid_calls) : null,
    };
  });
}

const MEDIA_FILTER_MAP: Record<string, MediaChannel[]> = {
  naver: ["naver_web", "naver_landing"],
  danggeun: ["danggeun"],
  meta: ["meta"],
  google: ["google"],
};

interface DashboardPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const params = await searchParams;

  const today = format(new Date(), "yyyy-MM-dd");
  const defaultStart = format(subDays(new Date(), 6), "yyyy-MM-dd");

  const startDate = (typeof params.start === "string" ? params.start : defaultStart);
  const endDate = (typeof params.end === "string" ? params.end : today);
  const mediaFilter = typeof params.media === "string" ? params.media : "all";

  const admin = createAdminClient();

  const [
    { data: calls },
    { data: spend },
    { data: naverStats },
    { data: naverWhitelist },
    { data: metaStats },
  ] = await Promise.all([
    admin
      .from("call_reports")
      .select("*")
      .gte("date", startDate)
      .lte("date", endDate)
      .order("date", { ascending: true }),
    admin
      .from("ad_spend")
      .select("*")
      .gte("date", startDate)
      .lte("date", endDate),
    admin
      .from("naver_ad_stats")
      .select("date, cost, campaign_id")
      .gte("date", startDate)
      .lte("date", endDate),
    admin
      .from("naver_campaigns")
      .select("campaign_id")
      .eq("is_whitelisted", true),
    admin
      .from("meta_ad_stats")
      .select("date, spend")
      .gte("date", startDate)
      .lte("date", endDate),
  ]);

  // 네이버 자동 동기화 데이터를 ad_spend 형태로 합성. 화이트리스트만, 일자별 합산.
  const whitelistSet = new Set(
    (naverWhitelist ?? []).map((r) => r.campaign_id as string)
  );
  const naverAutoByDate = new Map<string, number>();
  for (const row of (naverStats ?? []) as Array<{
    date: string;
    cost: number | string;
    campaign_id: string;
  }>) {
    if (!whitelistSet.has(row.campaign_id)) continue;
    naverAutoByDate.set(
      row.date,
      (naverAutoByDate.get(row.date) ?? 0) + Number(row.cost ?? 0)
    );
  }

  // 메타 자동 데이터 — 광고계정 단위 일별 spend 합산
  const metaAutoByDate = new Map<string, number>();
  for (const row of (metaStats ?? []) as Array<{ date: string; spend: number | string }>) {
    metaAutoByDate.set(
      row.date,
      (metaAutoByDate.get(row.date) ?? 0) + Number(row.spend ?? 0)
    );
  }

  // 자동 데이터가 있는 날짜는 수동 항목 무시 (중복 방지)
  const naverAutoDates = new Set(naverAutoByDate.keys());
  const metaAutoDates = new Set(metaAutoByDate.keys());
  const manualSpend = ((spend as AdSpend[]) || []).filter((s) => {
    if (s.media === "naver_web" && naverAutoDates.has(s.date)) return false;
    if (s.media === "meta" && metaAutoDates.has(s.date)) return false;
    return true;
  });
  const naverAutoRows: AdSpend[] = Array.from(naverAutoByDate.entries()).map(
    ([date, amount]) => ({
      id: `naver-auto-${date}`,
      date,
      media: "naver_web",
      amount,
      reporter_id: "naver-api",
      created_at: new Date().toISOString(),
    })
  );
  const metaAutoRows: AdSpend[] = Array.from(metaAutoByDate.entries()).map(
    ([date, amount]) => ({
      id: `meta-auto-${date}`,
      date,
      media: "meta",
      amount,
      reporter_id: "meta-api",
      created_at: new Date().toISOString(),
    })
  );

  let filteredCalls = (calls as CallReport[]) || [];
  let filteredSpend: AdSpend[] = [...manualSpend, ...naverAutoRows, ...metaAutoRows];

  if (mediaFilter !== "all" && MEDIA_FILTER_MAP[mediaFilter]) {
    const allowedChannels = MEDIA_FILTER_MAP[mediaFilter];
    filteredCalls = filteredCalls.filter((c) => allowedChannels.includes(c.media));
    filteredSpend = filteredSpend.filter((s) => allowedChannels.includes(s.media));
  }

  const dailySummaries = buildDailySummaries(filteredCalls, filteredSpend, startDate, endDate);

  return (
    <main className="min-h-screen bg-[#0f172a]">
      <div className="mx-auto max-w-7xl px-4 py-6">
        <Suspense fallback={null}>
          <FilterBar />
        </Suspense>

        {/* PC layout: lg and above */}
        <div className="mt-6 hidden lg:block">
          <div className="grid grid-cols-1 gap-6">
            {/* Daily summary table */}
            <section>
              <h2 className="mb-3 text-base font-semibold text-[#e2e8f0]">일별 합산</h2>
              <div className="rounded-xl border border-[#334155] bg-[#1e293b] max-h-[380px] overflow-y-auto">
                <DailyTable data={dailySummaries} />
              </div>
            </section>

            {/* 매체별 데이터 */}
            <section>
              <h2 className="mb-3 text-base font-semibold text-[#e2e8f0]">매체별 데이터</h2>
              <div className="rounded-xl border border-[#334155] bg-[#1e293b] max-h-[480px] overflow-y-auto">
                <MediaTable calls={filteredCalls} spend={filteredSpend} startDate={startDate} endDate={endDate} />
              </div>
            </section>

            {/* Charts row */}
            <div className="grid grid-cols-2 gap-6">
              <section>
                <h2 className="mb-3 text-base font-semibold text-[#e2e8f0]">일별 콜량 추이</h2>
                <div className="rounded-xl border border-[#334155] bg-[#1e293b] p-4">
                  <CallTrendChart data={dailySummaries} />
                </div>
              </section>
              <section>
                <h2 className="mb-3 text-base font-semibold text-[#e2e8f0]">매체별 비중</h2>
                <div className="rounded-xl border border-[#334155] bg-[#1e293b] p-4">
                  <MediaPieChart calls={filteredCalls} />
                </div>
              </section>
            </div>
          </div>
        </div>

        {/* Mobile layout: below lg */}
        <div className="mt-6 lg:hidden">
          <div className="space-y-6">
            {/* Daily swipe cards */}
            <section>
              <h2 className="mb-3 text-base font-semibold text-[#e2e8f0]">일별 요약</h2>
              <DailySwipeCard data={dailySummaries} />
            </section>

            {/* Media swipe cards */}
            <section>
              <h2 className="mb-3 text-base font-semibold text-[#e2e8f0]">매체별 요약</h2>
              <MediaSwipeCard calls={filteredCalls} spend={filteredSpend} startDate={startDate} endDate={endDate} />
            </section>

            {/* Charts stacked */}
            <section>
              <h2 className="mb-3 text-base font-semibold text-[#e2e8f0]">일별 콜량 추이</h2>
              <div className="rounded-xl border border-[#334155] bg-[#1e293b] p-4">
                <CallTrendChart data={dailySummaries} />
              </div>
            </section>

            <section>
              <h2 className="mb-3 text-base font-semibold text-[#e2e8f0]">매체별 비중</h2>
              <div className="rounded-xl border border-[#334155] bg-[#1e293b] p-4">
                <MediaPieChart calls={filteredCalls} />
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
