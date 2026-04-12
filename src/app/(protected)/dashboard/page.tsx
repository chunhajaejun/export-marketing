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

  const [{ data: calls }, { data: spend }] = await Promise.all([
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
  ]);

  let filteredCalls = (calls as CallReport[]) || [];
  let filteredSpend = (spend as AdSpend[]) || [];

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
              <div className="rounded-xl border border-[#334155] bg-[#1e293b] max-h-[480px] overflow-y-auto">
                <DailyTable data={dailySummaries} />
              </div>
            </section>

            {/* 매체별 데이터 */}
            <section>
              <h2 className="mb-3 text-base font-semibold text-[#e2e8f0]">매체별 데이터</h2>
              <div className="rounded-xl border border-[#334155] bg-[#1e293b] max-h-[480px] overflow-y-auto">
                <MediaTable calls={filteredCalls} spend={filteredSpend} />
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
              <MediaSwipeCard calls={filteredCalls} spend={filteredSpend} />
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
