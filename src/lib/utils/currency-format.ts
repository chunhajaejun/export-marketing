/**
 * 금액을 ₩1,234,567 형식으로 포맷
 */
export function formatCurrency(amount: number): string {
  return `₩${amount.toLocaleString("ko-KR")}`;
}

/**
 * 금액을 축약 형식으로 포맷
 * 1,000,000 이상 → ₩1.2M
 * 1,000 이상 → ₩420K
 * 그 외 → ₩123
 */
export function formatCurrencyShort(amount: number): string {
  if (amount >= 1_000_000) {
    const millions = amount / 1_000_000;
    return `₩${parseFloat(millions.toFixed(1))}M`;
  }
  if (amount >= 1_000) {
    const thousands = amount / 1_000;
    return `₩${parseFloat(thousands.toFixed(0))}K`;
  }
  return `₩${amount}`;
}

/**
 * 콤마가 포함된 금액 문자열을 숫자로 변환
 * "96,432" → 96432
 * "1,234,567" → 1234567
 */
export function parseCurrencyInput(value: string): number {
  const cleaned = value.replace(/[^0-9]/g, "");
  return cleaned ? parseInt(cleaned, 10) : 0;
}
