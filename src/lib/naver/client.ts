import crypto from "crypto";

const NAVER_API_BASE = "https://api.searchad.naver.com";

export interface NaverCreds {
  customerId: string;
  apiKey: string;
  secret: string;
}

export interface NaverAccount {
  key: string;
  label: string;
  creds: NaverCreds;
}

export function loadNaverAccounts(): NaverAccount[] {
  const accounts: NaverAccount[] = [];
  const pairs: [string, string, string][] = [
    ["gna82", "gna82 (마스터)", "NAVER_GNA82"],
  ];
  for (const [key, label, prefix] of pairs) {
    const customerId = process.env[`${prefix}_CUSTOMER_ID`];
    const apiKey = process.env[`${prefix}_API_KEY`];
    const secret = process.env[`${prefix}_SECRET`];
    if (!customerId || !apiKey || !secret) continue;
    accounts.push({ key, label, creds: { customerId, apiKey, secret } });
  }
  return accounts;
}

function sign(secret: string, timestamp: string, method: string, path: string) {
  const message = `${timestamp}.${method.toUpperCase()}.${path}`;
  return crypto.createHmac("sha256", secret).update(message).digest("base64");
}

async function naverRequest<T>(
  creds: NaverCreds,
  method: "GET" | "POST",
  path: string,
  query?: Record<string, string | number | undefined>,
  body?: unknown
): Promise<T> {
  const timestamp = String(Date.now());
  const signature = sign(creds.secret, timestamp, method, path);

  const url = new URL(NAVER_API_BASE + path);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    }
  }

  const res = await fetch(url.toString(), {
    method,
    headers: {
      "Content-Type": "application/json; charset=UTF-8",
      "X-Timestamp": timestamp,
      "X-API-KEY": creds.apiKey,
      "X-Customer": creds.customerId,
      "X-Signature": signature,
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Naver API ${method} ${path} failed ${res.status}: ${text}`);
  }

  return res.json() as Promise<T>;
}

export interface NaverCampaignRaw {
  nccCampaignId: string;
  name: string;
  campaignTp: string;
  status: string;
  statusReason?: string;
  customerId: number;
}

export async function listCampaigns(creds: NaverCreds): Promise<NaverCampaignRaw[]> {
  return naverRequest<NaverCampaignRaw[]>(creds, "GET", "/ncc/campaigns");
}

export interface NaverStatRow {
  id: string;
  impCnt: number;
  clkCnt: number;
  salesAmt: number;
  ccnt?: number;
  convAmt?: number;
  ctr?: number;
  cpc?: number;
  avgRnk?: number;
}

/**
 * /stats 엔드포인트 — 지정한 캠페인/광고그룹/소재의 지정 기간 실적을 일별 또는 요약으로 반환.
 * ids: 최대 100개씩 배치. timeRange: {since, until} YYYY-MM-DD.
 */
export async function getStats(
  creds: NaverCreds,
  ids: string[],
  since: string,
  until: string
): Promise<NaverStatRow[]> {
  if (ids.length === 0) return [];
  const query = {
    ids: JSON.stringify(ids),
    fields: JSON.stringify([
      "impCnt",
      "clkCnt",
      "salesAmt",
      "ccnt",
      "convAmt",
      "ctr",
      "cpc",
      "avgRnk",
    ]),
    timeRange: JSON.stringify({ since, until }),
    datePreset: undefined,
    breakdown: "day",
    StatType: "CAMPAIGN",
  };
  const raw = await naverRequest<{ data: Array<NaverStatRow & { row: unknown }> }>(
    creds,
    "GET",
    "/stats",
    query
  );
  return (raw.data ?? []).map((r) => ({
    id: r.id,
    impCnt: Number(r.impCnt ?? 0),
    clkCnt: Number(r.clkCnt ?? 0),
    salesAmt: Number(r.salesAmt ?? 0),
    ccnt: Number(r.ccnt ?? 0),
    convAmt: Number(r.convAmt ?? 0),
    ctr: r.ctr !== undefined ? Number(r.ctr) : undefined,
    cpc: r.cpc !== undefined ? Number(r.cpc) : undefined,
    avgRnk: r.avgRnk !== undefined ? Number(r.avgRnk) : undefined,
  }));
}
