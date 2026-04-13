-- Naver Search Ads 연동
-- 계정별 키는 환경변수에 저장, DB에는 계정 메타와 캠페인 화이트리스트만 보관

CREATE TABLE naver_accounts (
  account_key TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE naver_campaigns (
  campaign_id TEXT PRIMARY KEY,
  account_key TEXT NOT NULL REFERENCES naver_accounts(account_key) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  campaign_tp TEXT,
  status TEXT,
  is_whitelisted BOOLEAN NOT NULL DEFAULT FALSE,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX naver_campaigns_account_idx ON naver_campaigns(account_key);
CREATE INDEX naver_campaigns_whitelist_idx ON naver_campaigns(is_whitelisted) WHERE is_whitelisted;

CREATE TABLE naver_ad_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id TEXT NOT NULL REFERENCES naver_campaigns(campaign_id) ON DELETE CASCADE,
  date DATE NOT NULL,
  impressions BIGINT NOT NULL DEFAULT 0,
  clicks BIGINT NOT NULL DEFAULT 0,
  cost NUMERIC(14,2) NOT NULL DEFAULT 0,
  conversions BIGINT NOT NULL DEFAULT 0,
  conv_value NUMERIC(14,2) NOT NULL DEFAULT 0,
  ctr NUMERIC(8,4),
  cpc NUMERIC(12,2),
  avg_rank NUMERIC(6,2),
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(campaign_id, date)
);

CREATE INDEX naver_ad_stats_date_idx ON naver_ad_stats(date);

CREATE TRIGGER naver_campaigns_updated_at
  BEFORE UPDATE ON naver_campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS: admin만 전부 접근, 그 외는 읽기만
ALTER TABLE naver_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE naver_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE naver_ad_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY naver_accounts_read ON naver_accounts FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY naver_campaigns_read ON naver_campaigns FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY naver_ad_stats_read ON naver_ad_stats FOR SELECT TO authenticated USING (TRUE);

-- 초기 계정/캠페인 시드
INSERT INTO naver_accounts (account_key, customer_id, label) VALUES
  ('gna82', '1327969', 'gna82 (마스터)');

INSERT INTO naver_campaigns (campaign_id, account_key, name, is_whitelisted) VALUES
  ('cmp-a001-01-000000010470065', 'gna82', '투바이어랜딩 (buy.tobuyer.co.kr)', TRUE),
  ('cmp-a001-01-000000010440288', 'gna82', '투바이어 주말 (gnacc.co.kr)', TRUE),
  ('cmp-a001-01-000000010407027', 'gna82', '투바이어 웹 (tobuyer.co.kr)', TRUE),
  ('cmp-a001-01-000000010406427', 'gna82', '투바이어 평일 (gnacc.co.kr)', TRUE);
