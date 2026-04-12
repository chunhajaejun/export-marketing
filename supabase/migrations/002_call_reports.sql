-- 콜량 보고 (일별 × 매체별)
CREATE TABLE call_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  media TEXT NOT NULL
    CHECK (media IN ('naver_web', 'naver_landing', 'danggeun', 'meta', 'google')),
  export_count INT,
  used_car_count INT,
  valid_total INT,
  scrap_count INT NOT NULL DEFAULT 0,
  absence_count INT NOT NULL DEFAULT 0,
  invalid_count INT NOT NULL DEFAULT 0,
  phone_naver_count INT NOT NULL DEFAULT 0,
  total_count INT NOT NULL DEFAULT 0,
  reported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reporter_id UUID REFERENCES profiles(id) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(date, media)
);

CREATE TRIGGER call_reports_updated_at
  BEFORE UPDATE ON call_reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 변경 이력 (부재 상태 변경 등)
CREATE TABLE call_report_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  call_report_id UUID REFERENCES call_reports(id) ON DELETE CASCADE NOT NULL,
  field_changed TEXT NOT NULL,
  old_value TEXT NOT NULL,
  new_value TEXT NOT NULL,
  changed_by UUID REFERENCES profiles(id) NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
