-- Meta Marketing API 연동 — 광고 계정/캠페인/광고세트/광고/일별 실적

CREATE TABLE IF NOT EXISTS meta_ad_accounts (
  account_id TEXT PRIMARY KEY,
  name TEXT NOT NULL DEFAULT '',
  status INT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS meta_campaigns (
  campaign_id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES meta_ad_accounts(account_id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  status TEXT,
  objective TEXT,
  adlabels JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS meta_campaigns_account_idx ON meta_campaigns(account_id);

CREATE TABLE IF NOT EXISTS meta_adsets (
  adset_id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL REFERENCES meta_campaigns(campaign_id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  status TEXT,
  adlabels JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS meta_adsets_campaign_idx ON meta_adsets(campaign_id);

CREATE TABLE IF NOT EXISTS meta_ads (
  ad_id TEXT PRIMARY KEY,
  adset_id TEXT NOT NULL REFERENCES meta_adsets(adset_id) ON DELETE CASCADE,
  campaign_id TEXT NOT NULL REFERENCES meta_campaigns(campaign_id) ON DELETE CASCADE,
  account_id TEXT NOT NULL REFERENCES meta_ad_accounts(account_id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  status TEXT,
  creative_id TEXT,
  thumbnail_url TEXT,
  adlabels JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS meta_ads_campaign_idx ON meta_ads(campaign_id);
CREATE INDEX IF NOT EXISTS meta_ads_account_idx ON meta_ads(account_id);

CREATE TABLE IF NOT EXISTS meta_ad_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id TEXT NOT NULL REFERENCES meta_ads(ad_id) ON DELETE CASCADE,
  campaign_id TEXT NOT NULL,
  account_id TEXT NOT NULL,
  date DATE NOT NULL,
  impressions BIGINT NOT NULL DEFAULT 0,
  clicks BIGINT NOT NULL DEFAULT 0,
  reach BIGINT NOT NULL DEFAULT 0,
  spend NUMERIC(14,2) NOT NULL DEFAULT 0,
  ctr NUMERIC(8,4),
  cpc NUMERIC(12,2),
  cpm NUMERIC(12,2),
  conversions JSONB NOT NULL DEFAULT '[]'::jsonb,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(ad_id, date)
);
CREATE INDEX IF NOT EXISTS meta_ad_stats_date_idx ON meta_ad_stats(date);
CREATE INDEX IF NOT EXISTS meta_ad_stats_account_date_idx ON meta_ad_stats(account_id, date);

DROP TRIGGER IF EXISTS meta_campaigns_updated_at ON meta_campaigns;
CREATE TRIGGER meta_campaigns_updated_at
  BEFORE UPDATE ON meta_campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
DROP TRIGGER IF EXISTS meta_adsets_updated_at ON meta_adsets;
CREATE TRIGGER meta_adsets_updated_at
  BEFORE UPDATE ON meta_adsets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
DROP TRIGGER IF EXISTS meta_ads_updated_at ON meta_ads;
CREATE TRIGGER meta_ads_updated_at
  BEFORE UPDATE ON meta_ads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE meta_ad_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE meta_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE meta_adsets ENABLE ROW LEVEL SECURITY;
ALTER TABLE meta_ads ENABLE ROW LEVEL SECURITY;
ALTER TABLE meta_ad_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS meta_accounts_read ON meta_ad_accounts;
DROP POLICY IF EXISTS meta_campaigns_read ON meta_campaigns;
DROP POLICY IF EXISTS meta_adsets_read ON meta_adsets;
DROP POLICY IF EXISTS meta_ads_read ON meta_ads;
DROP POLICY IF EXISTS meta_ad_stats_read ON meta_ad_stats;
CREATE POLICY meta_accounts_read ON meta_ad_accounts FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY meta_campaigns_read ON meta_campaigns FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY meta_adsets_read ON meta_adsets FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY meta_ads_read ON meta_ads FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY meta_ad_stats_read ON meta_ad_stats FOR SELECT TO authenticated USING (TRUE);

INSERT INTO meta_ad_accounts (account_id, name) VALUES
  ('act_1524371265717302', '투바이어')
ON CONFLICT (account_id) DO NOTHING;
