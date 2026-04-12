export type UserRole = "call_reporter" | "spend_reporter" | "viewer" | "admin";
export type ApprovalStatus = "pending" | "approved" | "rejected";
export type CallCategory = "export" | "used_car" | "scrap" | "absence" | "invalid" | "phone_naver";
export type MediaChannel = "naver_web" | "naver_landing" | "danggeun" | "meta" | "google";

export interface Profile {
  id: string;
  email: string;
  name: string;
  phone: string;
  organization: string | null;
  role: UserRole;
  status: ApprovalStatus;
  created_at: string;
}

export interface CallReport {
  id: string;
  date: string;
  media: MediaChannel;
  export_count: number | null;
  used_car_count: number | null;
  valid_total: number | null;
  scrap_count: number;
  absence_count: number;
  invalid_count: number;
  phone_naver_count: number;
  total_count: number;
  reported_at: string;
  reporter_id: string;
  created_at: string;
}

export interface CallReportLog {
  id: string;
  call_report_id: string;
  field_changed: string;
  old_value: string;
  new_value: string;
  changed_by: string;
  changed_at: string;
}

export interface AdSpend {
  id: string;
  date: string;
  media: MediaChannel;
  amount: number;
  reporter_id: string;
  created_at: string;
}

export interface DailySummary {
  date: string;
  total_calls: number;
  valid_calls: number;
  export_count: number;
  used_car_count: number;
  scrap_count: number;
  absence_count: number;
  invalid_count: number;
  phone_naver_count: number;
  total_spend: number;
  cpa_total: number | null;
  cpa_valid: number | null;
  last_reported_at: string | null;
}

export interface ParsedCallReport {
  date: string;
  media: MediaChannel;
  export_count: number;
  used_car_count: number;
  scrap_count: number;
  absence_count: number;
  invalid_count: number;
  phone_count: number;
  channels: { phone: number; kakao: number; sms: number };
}

export interface ParsedAdSpend {
  date: string;
  media: MediaChannel;
  amount: number;
}
