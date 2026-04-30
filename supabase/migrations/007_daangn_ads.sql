-- 당근(daangn) 광고 성과 API 연동 — gna-biz.online 외부 API
-- 매체별 일별 실적 (광고비, 노출, 클릭, 전환)
-- 우선 media_id=795 (투바이어) 한 매체만 사용. 향후 매체 추가 가능.

CREATE TABLE IF NOT EXISTS daangn_ad_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  media_id INT NOT NULL,
  media_name TEXT NOT NULL DEFAULT '',
  campaign_id INT,
  impressions BIGINT NOT NULL DEFAULT 0,
  clicks BIGINT NOT NULL DEFAULT 0,
  cost NUMERIC(14,2) NOT NULL DEFAULT 0,
  conversions BIGINT NOT NULL DEFAULT 0,
  chat_inquiry BIGINT NOT NULL DEFAULT 0,
  phone_inquiry BIGINT NOT NULL DEFAULT 0,
  service_request BIGINT NOT NULL DEFAULT 0,
  ctr NUMERIC(8,4),
  cpc NUMERIC(12,2),
  cpa NUMERIC(14,2),
  source TEXT,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(date, media_id)
);

CREATE INDEX IF NOT EXISTS daangn_ad_stats_date_idx ON daangn_ad_stats(date);
CREATE INDEX IF NOT EXISTS daangn_ad_stats_media_idx ON daangn_ad_stats(media_id);

ALTER TABLE daangn_ad_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS daangn_ad_stats_read ON daangn_ad_stats;
CREATE POLICY daangn_ad_stats_read ON daangn_ad_stats FOR SELECT TO authenticated USING (TRUE);
