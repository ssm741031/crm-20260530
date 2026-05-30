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

// ===== 드래그(Sprint 09) 헬퍼 =====

/** isoB - isoA 의 일수 차 (정수, B가 뒤면 양수) */
export function diffDays(isoA: string, isoB: string): number {
  const ms = parseDate(isoB).getTime() - parseDate(isoA).getTime();
  return Math.round(ms / 86400000);
}

/** "HH:MM" → 분 */
export function timeToMin(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}
/** 분 → "HH:MM" (24h) */
export function minToTime(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
/** 15분 단위로 스냅 (계획서 §5.1) */
export function snap15(min: number): number {
  return Math.round(min / 15) * 15;
}
/** 분을 [loHour, hiHour] 운영시간 경계로 클램프 */
export function clampMin(min: number, loHour: number, hiHour: number): number {
  return Math.max(loHour * 60, Math.min(hiHour * 60, min));
}

/** 겹치는 시간 막대를 좌우 열(레인)로 배치 — 캘린더 표준 (일간 뷰).
 *  서로 겹치는 묶음(cluster) 안에서 동시 개수만큼 폭을 나눠 col/cols를 돌려준다.
 *  입력 end는 배치용(마감형은 호출측에서 약간의 폭을 주어 겹침을 판정). */
export function packIntervals(
  items: { id: string; start: number; end: number }[]
): Record<string, { col: number; cols: number }> {
  const sorted = [...items].sort((a, b) => a.start - b.start || a.end - b.end);
  const result: Record<string, { col: number; cols: number }> = {};
  let cols: { id: string; end: number }[][] = [];
  let clusterMaxEnd = -Infinity;

  const flush = () => {
    const n = cols.length;
    cols.forEach((col, ci) =>
      col.forEach((m) => (result[m.id] = { col: ci, cols: n }))
    );
    cols = [];
    clusterMaxEnd = -Infinity;
  };

  for (const it of sorted) {
    if (cols.length && it.start >= clusterMaxEnd) flush(); // 묶음 종료
    let placed = false;
    for (const col of cols) {
      if (col[col.length - 1].end <= it.start) {
        col.push({ id: it.id, end: it.end });
        placed = true;
        break;
      }
    }
    if (!placed) cols.push([{ id: it.id, end: it.end }]);
    clusterMaxEnd = Math.max(clusterMaxEnd, it.end);
  }
  if (cols.length) flush();
  return result;
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
