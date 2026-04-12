import { format, subDays, isToday as fnsIsToday } from "date-fns";
import { ko } from "date-fns/locale";

export type ReportMode = "morning" | "evening" | "none";

/**
 * 현재 시간에 따른 보고 모드 반환
 * 08~13시: morning, 17~23시: evening, 그 외: none
 */
export function getReportMode(): ReportMode {
  const hour = new Date().getHours();
  if (hour >= 8 && hour <= 13) return "morning";
  if (hour >= 17 && hour <= 23) return "evening";
  return "none";
}

/**
 * 보고 모드 한글 라벨
 */
export function getReportModeLabel(mode: ReportMode): string {
  switch (mode) {
    case "morning":
      return "오전 보고";
    case "evening":
      return "저녁 보고";
    case "none":
      return "보고 시간 외";
  }
}

/**
 * 보고 모드 설명 텍스트
 */
export function getReportModeDescription(mode: ReportMode): string {
  switch (mode) {
    case "morning":
      return "오전 8시~오후 1시: 전일 콜량 및 소진액을 보고하는 시간입니다.";
    case "evening":
      return "오후 5시~오후 11시: 금일 콜량 및 소진액을 보고하는 시간입니다.";
    case "none":
      return "현재는 보고 시간이 아닙니다.";
  }
}

/**
 * YYYY-MM-DD 형식으로 날짜 포맷
 */
export function formatDate(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

/**
 * MM/DD 형식으로 날짜 포맷
 */
export function formatDateShort(date: Date): string {
  return format(date, "MM/dd");
}

/**
 * MM/DD (요일) 형식으로 날짜 포맷
 */
export function formatDateWithDay(date: Date): string {
  return format(date, "MM/dd (EEE)", { locale: ko });
}

/**
 * 최근 7일 날짜 배열 반환 (오늘 포함, 내림차순)
 */
export function getLast7Days(): Date[] {
  const days: Date[] = [];
  const today = new Date();
  for (let i = 0; i < 7; i++) {
    days.push(subDays(today, i));
  }
  return days;
}

/**
 * 주어진 날짜가 오늘인지 확인
 */
export function isToday(date: Date): boolean {
  return fnsIsToday(date);
}
