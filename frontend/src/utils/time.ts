/** 15분 단위 시간 옵션 생성 (계획서: 시간 입력은 전부 15분 단위 드롭다운) */

/** ["00:00","00:15",...,"23:45"] = 96개 */
export const TIME_OPTIONS: string[] = (() => {
  const out: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      const hh = String(h).padStart(2, "0");
      const mm = String(m).padStart(2, "0");
      out.push(`${hh}:${mm}`);
    }
  }
  return out;
})();

/** "2026-05-31"+"14:00" → 비교용 정렬키 (간단 검증에 사용) */
export function toSortKey(date: string | null, time: string | null): string {
  return `${date ?? "9999-99-99"} ${time ?? "99:99"}`;
}
