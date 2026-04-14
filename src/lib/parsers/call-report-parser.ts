import type { ParsedCallReport, MediaChannel } from "../types";

/**
 * 콜량 보고 텍스트를 파싱하여 구조화된 데이터로 변환
 *
 * 섹션 구분: "ㅡㅡㅡ" 구분선 기준
 * 매체 판별: 섹션 내 키워드 (당근/메타/구글), 미표기시 naver_web
 */
export function parseCallReport(text: string): ParsedCallReport[] {
  if (!text || !text.trim()) return [];

  // "ㅡ" 3개 이상 연속을 구분선으로 사용하여 섹션 분할
  const sections = text.split(/ㅡ{3,}/);
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
  // 날짜 파싱: "2026 / 4 / 11" 또는 "2026/4/11"
  const dateMatch = section.match(
    /(\d{4})\s*\/\s*(\d{1,2})\s*\/\s*(\d{1,2})/
  );
  if (!dateMatch) return null;

  const year = dateMatch[1];
  const month = dateMatch[2].padStart(2, "0");
  const day = dateMatch[3].padStart(2, "0");
  const date = `${year}-${month}-${day}`;

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

  // 총 건수 파싱
  const totalMatch = section.match(/총\s*(\d+)\s*건/);
  const total = totalMatch ? parseInt(totalMatch[1], 10) : 0;

  // 카테고리별 건수 파싱
  const usedCar = parseCategoryCount(section, /\(?내수\)?\s*[:：]?\s*(\d+)\s*건?/);
  const scrap = parseCategoryCount(section, /\(?폐차\)?\s*[:：]?\s*(\d+)\s*건?/);
  const absence = parseCategoryCount(section, /\(?부재\)?\s*[:：]?\s*(\d+)\s*건?/);
  const invalid = parseCategoryCount(section, /\(?무효\)?\s*[:：]?\s*(\d+)\s*건?/);

  // 수출 건수 = 총건수 - (내수 + 폐차 + 부재 + 무효)
  const exportCount = Math.max(
    0,
    total - usedCar - scrap - absence - invalid
  );

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
      kakao: kakao + metaCount, // 메타 채널도 kakao와 같은 인입 경로
      sms,
    },
  };
}

function detectMedia(section: string): MediaChannel {
  // 섹션 텍스트에서 매체 키워드 탐색 (날짜 이전 또는 전체에서)
  if (/당근/i.test(section)) return "danggeun";
  if (/메타/i.test(section)) return "meta";
  if (/구글/i.test(section)) return "google";
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
