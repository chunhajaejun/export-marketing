import type { ParsedCallReport, MediaChannel } from "../types";

/**
 * 콜량 보고 텍스트를 파싱하여 구조화된 데이터로 변환
 *
 * 섹션 구분: "ㅡㅡㅡ" 또는 "---" 구분선 기준
 * 매체 판별: 섹션 내 키워드 (당근/메타/구글), 미표기시 naver_web
 */
export function parseCallReport(text: string): ParsedCallReport[] {
  if (!text || !text.trim()) return [];

  // "ㅡ" 3개 이상 또는 "-" 3개 이상을 구분선으로 섹션 분할
  const sections = text.split(/[-]{3,}|[ㅡ]{3,}/);
  const results: ParsedCallReport[] = [];

  for (const section of sections) {
    const trimmed = section.trim();
    if (!trimmed) continue;

    const parsed = parseSection(trimmed);
    if (parsed) {
      results.push(parsed);
    }
  }

  return results;
}

function parseSection(section: string): ParsedCallReport | null {
  // 날짜 파싱: "2026 / 4 / 11", "2026/4/11", 없으면 오늘
  const dateMatch = section.match(
    /(\d{4})\s*\/\s*(\d{1,2})\s*\/\s*(\d{1,2})/
  );
  let date: string;
  if (dateMatch) {
    date = `${dateMatch[1]}-${dateMatch[2].padStart(2, "0")}-${dateMatch[3].padStart(2, "0")}`;
  } else {
    const now = new Date();
    const kst = new Date(now.getTime() + 9 * 3600 * 1000);
    date = kst.toISOString().slice(0, 10);
  }

  // 매체 판별
  const media = detectMedia(section);

  // 채널별 건수 파싱
  const phone = parseChannelCount(section, /[-\-]?\s*전화\s*[:：]\s*(\d+)\s*건/);
  const kakao = parseChannelCount(
    section,
    /[-\-]?\s*카톡\s*[:：]\s*(\d+)\s*건/
  );
  const sms = parseChannelCount(section, /[-\-]?\s*문자\s*[:：]\s*(\d+)\s*건/);
  const metaCount = parseChannelCount(
    section,
    /[-\-]?\s*메타\s*[:：]\s*(\d+)\s*건/
  );
  const webCount = parseChannelCount(
    section,
    /[-\-]?\s*웹문의\s*[:：]\s*(\d+)\s*건/
  );

  // 총 건수 파싱
  const totalMatch = section.match(/총\s*(\d+)\s*건/);
  const total = totalMatch ? parseInt(totalMatch[1], 10) : 0;

  // 카테고리별 건수 파싱
  const exportDirect = parseCategoryCount(section, /\(?수출\)?\s*[:：]?\s*(\d+)\s*건?/);
  const usedCar = parseCategoryCount(section, /\(?(?:내수|매입)\)?\s*[:：]?\s*(\d+)\s*건?/);
  const scrap = parseCategoryCount(section, /\(?폐차\)?\s*[:：]?\s*(\d+)\s*건?/);
  const absence = parseCategoryCount(section, /\(?부재\)?\s*[:：]?\s*(\d+)\s*건?/);
  const invalidBase = parseCategoryCount(section, /\(?무효\)?\s*[:：]?\s*(\d+)\s*건?/);
  const testCount = parseCategoryCount(section, /\(?(?:테스트|test)\)?\s*[:：]?\s*(\d+)\s*건?/i);
  const invalid = invalidBase + testCount;

  // 수출 건수: 직접 파싱되면 사용, 없으면 총건수에서 나머지 빼서 계산
  const exportCount = exportDirect > 0
    ? exportDirect
    : Math.max(0, total - usedCar - scrap - absence - invalid);

  return {
    date,
    media,
    export_count: exportCount,
    used_car_count: usedCar,
    scrap_count: scrap,
    absence_count: absence,
    invalid_count: invalid,
    phone_count: phone,
    channels: {
      phone,
      kakao: kakao + metaCount + webCount,
      sms,
    },
  };
}

function detectMedia(section: string): MediaChannel {
  // 날짜 이전 텍스트에서 매체 키워드 탐색
  const dateIdx = section.search(/\d{4}\s*\/\s*\d{1,2}\s*\/\s*\d{1,2}/);
  const beforeDate = dateIdx > 0 ? section.slice(0, dateIdx) : "";

  // 날짜 앞에 매체 키워드가 있으면 우선 사용
  if (beforeDate) {
    if (/당근/i.test(beforeDate)) return "danggeun";
    if (/메타/i.test(beforeDate)) return "meta";
    if (/구글/i.test(beforeDate)) return "google";
  }

  // 없으면 전체에서 첫 줄 기준으로 탐색
  const firstLine = section.split(/\n/)[0].trim();
  if (/^당근/.test(firstLine)) return "danggeun";
  if (/^메타/.test(firstLine)) return "meta";
  if (/^구글/.test(firstLine)) return "google";

  return "naver_web";
}

function parseChannelCount(section: string, pattern: RegExp): number {
  const match = section.match(pattern);
  return match ? parseInt(match[1], 10) : 0;
}

function parseCategoryCount(section: string, pattern: RegExp): number {
  const match = section.match(pattern);
  return match ? parseInt(match[1], 10) : 0;
}
