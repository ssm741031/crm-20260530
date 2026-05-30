/** 자동 재생성(갱신) — 날짜 역산 유틸 (계획서 §5-B.3)
 *  만기일(endDate) 기준으로 안내일·생성일을 역산하고,
 *  완료 시 다음 주기 만기일을 계산한다. 매주/매월/매년만 대상.
 *  ※ 실제 "리드타임만큼 미리 생성"하는 스케줄러는 서버(이팀장) 몫.
 *    화면에서는 완료 시 즉시 재생성으로 날짜계산 로직만 검증한다. */
import type { RepeatType } from "../types";

/** 안내 목표 프리셋 (만기 N일 전) — 계획서 §5-B.3 */
export const NOTICE_PRESETS: { value: number; label: string }[] = [
  { value: 30, label: "30일 전" },
  { value: 60, label: "60일 전" },
  { value: 90, label: "90일 전" },
];

/** 준비 리드타임 프리셋 (안내일보다 N일 먼저 생성) */
export const LEAD_PRESETS: { value: number; label: string }[] = [
  { value: 1, label: "1일" },
  { value: 3, label: "3일" },
  { value: 7, label: "7일" },
  { value: 14, label: "14일" },
];

/** 자동재생성 가능한 반복(주기형)인가 — 매주/매월/매년만 (§5-B.3) */
export function canAutoRegen(repeat: RepeatType): boolean {
  return repeat === "weekly" || repeat === "monthly" || repeat === "yearly";
}

/** "YYYY-MM-DD" → 로컬 자정 Date (시간대 밀림 방지) */
function parseDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Date → "YYYY-MM-DD" */
function fmt(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** 날짜에서 N일 빼기 */
export function minusDays(iso: string, days: number): string {
  const d = parseDate(iso);
  d.setDate(d.getDate() - days);
  return fmt(d);
}

/** 다음 주기 만기일 = 만기 + 1주기.
 *  월/년은 말일 보정: 1/31 +1개월 → 2/28(말일)로 클램프(JS 자동 넘김 방지). */
export function addPeriod(iso: string, repeat: RepeatType): string {
  const d = parseDate(iso);
  if (repeat === "weekly") {
    d.setDate(d.getDate() + 7);
    return fmt(d);
  }
  const day = d.getDate();
  if (repeat === "monthly") d.setMonth(d.getMonth() + 1, 1);
  else if (repeat === "yearly") d.setFullYear(d.getFullYear() + 1, d.getMonth(), 1);
  else return iso; // 주기형 아님
  // 원래 '일'로 복원하되, 해당 월 말일을 넘지 않게 클램프
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, lastDay));
  return fmt(d);
}

/** 3단 날짜 미리보기: 만기(=dueDate) / 안내일(만기-안내) / 생성일(만기-안내-리드) */
export function computeRegenDates(
  dueDate: string,
  noticeDaysBefore: number,
  leadDays: number
): { dueDate: string; noticeDate: string; createDate: string } {
  const noticeDate = minusDays(dueDate, noticeDaysBefore);
  const createDate = minusDays(dueDate, noticeDaysBefore + leadDays);
  return { dueDate, noticeDate, createDate };
}
