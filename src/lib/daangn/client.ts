const DAANGN_API_BASE = "https://gna-biz.online/api/external";

// 우리(투바이어)가 사용할 매체 ID
export const DAANGN_TARGET_MEDIA_ID = 795;

export interface DaangnCreds {
  apiKey: string;
}

export function loadDaangnCreds(): DaangnCreds | null {
  const apiKey = process.env.DAANGN_API_KEY;
  if (!apiKey) return null;
  return { apiKey };
}

export interface DaangnAdRow {
  date: string;
  platform: string;
  media_id: number;
  media_name: string;
  campaign_id: number | null;
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
  conversion_breakdown: Record<string, number> | null;
  ctr: number;
  cpc: number;
  cpa: number;
  source: string;
}

interface DaangnApiResponse {
  success: boolean;
  meta?: {
    date_from: string;
    date_to: string;
    total_count: number;
    last_crawled_at: string;
    trace_id: string;
  };
  summary?: {
    impressions: number;
    clicks: number;
    cost: number;
    conversions: number;
    ctr: number;
    cpc: number;
    cpa: number;
  };
  data?: DaangnAdRow[];
  error?: { code: string; message: string; detail?: unknown };
}

export async function getAdPerformance(
  creds: DaangnCreds,
  dateFrom: string,
  dateTo: string
): Promise<DaangnAdRow[]> {
  const url = `${DAANGN_API_BASE}/ad-performance?date_from=${dateFrom}&date_to=${dateTo}`;
  const res = await fetch(url, {
    headers: { "X-API-Key": creds.apiKey },
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Daangn API ${res.status}: ${text}`);
  }

  const json = (await res.json()) as DaangnApiResponse;
  if (!json.success) {
    throw new Error(`Daangn API 실패: ${json.error?.message ?? "unknown"}`);
  }

  return json.data ?? [];
}
