/**
 * 전화번호 포맷 유틸리티
 * 숫자만 추출하여 010-0000-0000 형식으로 변환
 */

export function formatPhoneNumber(value: string): string {
  const digits = value.replace(/\D/g, "");
  const limited = digits.slice(0, 11);

  if (limited.length <= 3) {
    return limited;
  }
  if (limited.length <= 7) {
    return `${limited.slice(0, 3)}-${limited.slice(3)}`;
  }
  return `${limited.slice(0, 3)}-${limited.slice(3, 7)}-${limited.slice(7)}`;
}

export function isValidPhone(phone: string): boolean {
  return /^010-\d{4}-\d{4}$/.test(phone);
}
