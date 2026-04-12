-- 광고비 소진액 (일별 × 매체별)
CREATE TABLE ad_spend (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  media TEXT NOT NULL
    CHECK (media IN ('naver_web', 'naver_landing', 'danggeun', 'meta', 'google')),
  amount INT NOT NULL DEFAULT 0,
  reporter_id UUID REFERENCES profiles(id) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(date, media)
);

CREATE TRIGGER ad_spend_updated_at
  BEFORE UPDATE ON ad_spend
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
