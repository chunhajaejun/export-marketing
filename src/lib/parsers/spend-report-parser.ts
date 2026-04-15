import type { ParsedAdSpend, MediaChannel } from "../types";

/**
 * 소진액 보고 텍스트를 파싱하여 구조화된 데이터로 변환
 *
 * 입력 예시:
 * 4/10 금요일
 * 네이버 소진액 : 96,432 원
 * 당근 소진액 : 100,254 원
 */
export function parseSpendReport(text: string): ParsedAdSpend[] {
  if (!text || !text.trim()) return [];

  const results: ParsedAdSpend[] = [];

  // 날짜 파싱: "2026/4/10" 또는 "4/10" 패턴
  const dateMatch = text.match(
    /(?:(\d{4})\s*\/\s*)?(\d{1,2})\s*\/\s*(\d{1,2})/
  );
  if (!dateMatch) return [];

  const now = new Date();
  const year = dateMatch[1] || String(now.getFullYear());
  const month = dateMatch[2].padStart(2, "0");
  const day = dateMatch[3].padStart(2, "0");
  const date = `${year}-${month}-${day}`;

  // 각 매체별 소진액 파싱
  const spendPattern =
    /(네이버|당근|메타|구글)\s*소진액\s*[:：]\s*([\d,]+)\s*원?/g;
  let match: RegExpExecArray | null;

  while ((match = spendPattern.exec(text)) !== null) {
    const mediaName = match[1];
    const amount = parseInt(match[2].replace(/,/g, ""), 10);
    const media = mapMediaName(mediaName);

    if (media) {
      results.push({ date, media, amount });
    }
  }

  return results;
}

function mapMediaName(name: string): MediaChannel | null {
  switch (name) {
    case "네이버":
      return "naver_web";
    case "당근":
      return "danggeun";
    case "메타":
      return "meta";
    case "구글":
      return "google";
    default:
      return null;
  }
}
