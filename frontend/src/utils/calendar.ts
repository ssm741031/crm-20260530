/** 캘린더 4종 뷰 공용 유틸 (계획서 §5.2, §5.5)
 *  날짜 그리드 생성·포맷·필터. 주 시작 = 일요일(0). 종일 타입 없음(마감/구간 2종). */
import type { Task } from "../types";

export const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];
export const MONTH_LABELS = [
  "1월", "2월", "3월", "4월", "5월", "6월",
  "7월", "8월", "9월", "10월", "11월", "12월",
];

/** "YYYY-MM-DD" → 로컬 자정 Date (시간대 밀림 방지) */
export function parseDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}
/** Date → "YYYY-MM-DD" */
export function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
/** 오늘(로컬) ISO */
export function todayIso(): string {
  return ymd(new Date());
}
export function addDays(iso: string, n: number): string {
  const d = parseDate(iso);
  d.setDate(d.getDate() + n);
  return ymd(d);
}
/** 월 이동 — 일(day)은 해당 월 말일로 클램프 */
export function addMonths(iso: string, n: number): string {
  const d = parseDate(iso);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + n);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, last));
  return ymd(d);
}

/** iso가 속한 주의 일요일 ISO */
export function startOfWeek(iso: string): string {
  const d = parseDate(iso);
  d.setDate(d.getDate() - d.getDay()); // getDay 0=일
  return ymd(d);
}
/** iso가 속한 주의 7일(일~토) ISO 배열 */
export function weekDates(iso: string): string[] {
  const start = startOfWeek(iso);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

/** year·month0(0=1월) 달력 6주 매트릭스. 각 칸 {date, inMonth} */
export function monthMatrix(
  year: number,
  month0: number
): { date: string; inMonth: boolean }[][] {
  const first = new Date(year, month0, 1);
  const gridStart = parseDate(ymd(first));
  gridStart.setDate(gridStart.getDate() - gridStart.getDay()); // 그 주 일요일부터
  const weeks: { date: string; inMonth: boolean }[][] = [];
  const cur = gridStart;
  for (let w = 0; w < 6; w++) {
    const row: { date: string; inMonth: boolean }[] = [];
    for (let i = 0; i < 7; i++) {
      row.push({ date: ymd(cur), inMonth: cur.getMonth() === month0 });
      cur.setDate(cur.getDate() + 1);
    }
    weeks.push(row);
  }
  return weeks;
}

/** 표시 기준 날짜: 마감형=endDate, 구간형=시작~종료 범위에 포함되면 해당일 */
export function occursOnDate(t: Task, iso: string): boolean {
  if (t.timeType === "range" && t.startDate && t.endDate) {
    return t.startDate <= iso && iso <= t.endDate; // ISO 문자열 사전순 = 날짜순
  }
  return t.endDate === iso;
}

/** 해당 날짜에 표시할 할 일 (시간순 정렬) */
export function tasksOnDate(tasks: Task[], iso: string): Task[] {
  return tasks
    .filter((t) => occursOnDate(t, iso))
    .sort((a, b) => (a.endTime ?? "").localeCompare(b.endTime ?? ""));
}

/** 보기 제어 필터 (§5.5) */
export interface CalFilters {
  showDone: boolean; // 완료 표시
  showRepeat: boolean; // 반복 항목 표시
  hiddenCats: string[]; // 끈 카테고리 id
}
export function applyFilters(tasks: Task[], f: CalFilters): Task[] {
  return tasks.filter((t) => {
    if (!f.showDone && t.done) return false;
    if (!f.showRepeat && t.repeat !== "none") return false;
    if (f.hiddenCats.includes(t.categoryId)) return false;
    return true;
  });
}
