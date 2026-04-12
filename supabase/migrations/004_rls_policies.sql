-- RLS 활성화
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_report_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_spend ENABLE ROW LEVEL SECURITY;

-- profiles: 승인된 유저는 모든 프로필 조회 가능
CREATE POLICY "approved users can view profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.status = 'approved'
    )
  );

-- profiles: 자신의 프로필은 항상 조회 가능
CREATE POLICY "users can view own profile"
  ON profiles FOR SELECT
  USING (id = auth.uid());

-- profiles: 관리자만 프로필 수정 가능
CREATE POLICY "admins can update profiles"
  ON profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin' AND p.status = 'approved'
    )
  );

-- call_reports: 승인된 유저는 조회 가능
CREATE POLICY "approved users can view call_reports"
  ON call_reports FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.status = 'approved'
    )
  );

-- call_reports: 콜량보고자 + 관리자만 입력
CREATE POLICY "call reporters can insert"
  ON call_reports FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.status = 'approved'
        AND p.role IN ('call_reporter', 'admin')
    )
  );

-- call_reports: 콜량보고자 + 관리자만 수정
CREATE POLICY "call reporters can update"
  ON call_reports FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.status = 'approved'
        AND p.role IN ('call_reporter', 'admin')
    )
  );

-- call_report_logs: 승인된 유저 조회
CREATE POLICY "approved users can view logs"
  ON call_report_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.status = 'approved'
    )
  );

-- call_report_logs: 콜량보고자 + 관리자 입력
CREATE POLICY "reporters can insert logs"
  ON call_report_logs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.status = 'approved'
        AND p.role IN ('call_reporter', 'admin')
    )
  );

-- ad_spend: 승인된 유저 조회
CREATE POLICY "approved users can view ad_spend"
  ON ad_spend FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.status = 'approved'
    )
  );

-- ad_spend: 소진액보고자 + 관리자 입력
CREATE POLICY "spend reporters can insert"
  ON ad_spend FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.status = 'approved'
        AND p.role IN ('spend_reporter', 'admin')
    )
  );

-- ad_spend: 소진액보고자 + 관리자 수정
CREATE POLICY "spend reporters can update"
  ON ad_spend FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.status = 'approved'
        AND p.role IN ('spend_reporter', 'admin')
    )
  );
