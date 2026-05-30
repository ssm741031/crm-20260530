/** 연락처 부분 마스킹 (계획서 §8.5) — 010-1234-5678 → 010-****-5678 */
export function maskPhone(phone: string): string {
  const parts = phone.split("-");
  if (parts.length === 3) {
    return `${parts[0]}-****-${parts[2]}`;
  }
  // 하이픈이 없거나 형식이 다르면 가운데 4자리만 마스킹 시도
  return phone.replace(/(\d{2,3})(\d{3,4})(\d{4})/, "$1-****-$3");
}
