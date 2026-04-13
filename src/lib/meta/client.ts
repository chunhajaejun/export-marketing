const META_GRAPH_BASE = "https://graph.facebook.com/v23.0";

export interface MetaCreds {
  accessToken: string;
  adAccountId: string;
}

export function loadMetaCreds(): MetaCreds | null {
  const accessToken = process.env.META_ACCESS_TOKEN;
  const adAccountId = process.env.META_AD_ACCOUNT_ID;
  if (!accessToken || !adAccountId) return null;
  return { accessToken, adAccountId };
}

interface PagedResponse<T> {
  data: T[];
  paging?: { next?: string; cursors?: { before?: string; after?: string } };
  error?: { message: string };
}

async function metaPaged<T>(url: string, accessToken: string): Promise<T[]> {
  const out: T[] = [];
  let next: string | undefined = url;
  while (next) {
    const sep = next.includes("?") ? "&" : "?";
    const u = next.startsWith("http") ? next : `${META_GRAPH_BASE}${next}`;
    const reqUrl = u.includes("access_token=") ? u : `${u}${sep}access_token=${accessToken}`;
    const res = await fetch(reqUrl, { cache: "no-store" });
    const json = (await res.json()) as PagedResponse<T>;
    if (!res.ok || json.error) {
      throw new Error(`Meta API ${res.status}: ${json.error?.message ?? "unknown"}`);
    }
    out.push(...(json.data ?? []));
    next = json.paging?.next;
  }
  return out;
}

export interface MetaCampaign {
  id: string;
  name: string;
  status: string;
  objective?: string;
  adlabels?: Array<{ id: string; name: string }>;
}
export interface MetaAdSet {
  id: string;
  name: string;
  status: string;
  campaign_id: string;
  adlabels?: Array<{ id: string; name: string }>;
}
export interface MetaAd {
  id: string;
  name: string;
  status: string;
  adset_id: string;
  campaign_id: string;
  creative?: { id: string; thumbnail_url?: string };
  adlabels?: Array<{ id: string; name: string }>;
}

export async function listCampaigns(creds: MetaCreds): Promise<MetaCampaign[]> {
  const fields = "id,name,status,objective,adlabels";
  return metaPaged<MetaCampaign>(
    `/${creds.adAccountId}/campaigns?fields=${fields}&limit=100`,
    creds.accessToken
  );
}

export async function listAdSets(creds: MetaCreds): Promise<MetaAdSet[]> {
  const fields = "id,name,status,campaign_id,adlabels";
  return metaPaged<MetaAdSet>(
    `/${creds.adAccountId}/adsets?fields=${fields}&limit=100`,
    creds.accessToken
  );
}

export async function listAds(creds: MetaCreds): Promise<MetaAd[]> {
  const fields = "id,name,status,adset_id,campaign_id,adlabels,creative{id,thumbnail_url}";
  return metaPaged<MetaAd>(
    `/${creds.adAccountId}/ads?fields=${encodeURIComponent(fields)}&limit=100`,
    creds.accessToken
  );
}

export interface MetaAdInsight {
  ad_id: string;
  campaign_id: string;
  account_id: string;
  date_start: string;
  date_stop: string;
  impressions?: string;
  clicks?: string;
  reach?: string;
  spend?: string;
  ctr?: string;
  cpc?: string;
  cpm?: string;
  actions?: Array<{ action_type: string; value: string }>;
}

export async function getAdInsightsDaily(
  creds: MetaCreds,
  since: string,
  until: string
): Promise<MetaAdInsight[]> {
  const fields = [
    "ad_id",
    "campaign_id",
    "account_id",
    "impressions",
    "clicks",
    "reach",
    "spend",
    "ctr",
    "cpc",
    "cpm",
    "actions",
  ].join(",");
  const timeRange = encodeURIComponent(JSON.stringify({ since, until }));
  const url =
    `/${creds.adAccountId}/insights?level=ad&fields=${fields}` +
    `&time_range=${timeRange}&time_increment=1&limit=200`;
  return metaPaged<MetaAdInsight>(url, creds.accessToken);
}
