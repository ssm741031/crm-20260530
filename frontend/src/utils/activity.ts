/* ============================================================
   활동량 통계 계산 (Sprint 17, 계획서 §6) — 순수 함수.
   할 일 배열을 받아 달성률·완료분포·습관 streak를 집계한다.
   권한 필터는 호출부(ActivityPage)에서 먼저 적용한 뒤 전달.
   ============================================================ */
import type { Task } from "../types";
import { addDays, parseDate, todayIso } from "./calendar";

/** 비율(완료/전체)을 0~100 정수 %로. 전체 0이면 0 (0 division 가드). */
export function pct(done: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((done / total) * 100);
}

/** 마감일(endDate)이 특정 날짜인 할 일만 */
function dueOn(tasks: Task[], iso: string): Task[] {
  return tasks.filter((t) => t.endDate === iso);
}

/** 오늘 처리 현황 — 마감일=오늘인 할 일 중 완료 수 (계획서 §6.1) */
export function todayProgress(tasks: Task[]): {
  total: number;
  done: number;
  rate: number;
} {
  const today = todayIso();
  const list = dueOn(tasks, today);
  const done = list.filter((t) => t.done).length;
  return { total: list.length, done, rate: pct(done, list.length) };
}

/** 최근 N일(오늘 포함) 마감 기준 달성률 */
export function rangeProgress(
  tasks: Task[],
  days: number
): { total: number; done: number; rate: number } {
  const today = todayIso();
  const from = addDays(today, -(days - 1)); // N일 전 ~ 오늘
  const inRange = tasks.filter(
    (t) => t.endDate && t.endDate >= from && t.endDate <= today
  );
  const done = inRange.filter((t) => t.done).length;
  return { total: inRange.length, done, rate: pct(done, inRange.length) };
}

/** 카테고리별 완료 분포 — categoryId별 {완료, 전체} */
export function byCategory(
  tasks: Task[]
): { categoryId: string; total: number; done: number }[] {
  const map = new Map<string, { total: number; done: number }>();
  tasks.forEach((t) => {
    const cur = map.get(t.categoryId) ?? { total: 0, done: 0 };
    cur.total += 1;
    if (t.done) cur.done += 1;
    map.set(t.categoryId, cur);
  });
  return [...map.entries()]
    .map(([categoryId, v]) => ({ categoryId, ...v }))
    .sort((a, b) => b.total - a.total);
}

/** 습관(반복 켜진 할 일) streak 요약 — streak 높은 순 */
export function habitStreaks(
  tasks: Task[]
): { id: string; title: string; streak: number }[] {
  return tasks
    .filter((t) => t.repeat !== "none")
    .map((t) => ({ id: t.id, title: t.title, streak: t.streak }))
    .sort((a, b) => b.streak - a.streak);
}

/** 최근 7일 일자별 완료 건수 (작은 막대 추이용) — [{date, done}] 오래된→오늘 */
export function dailyDoneTrend(
  tasks: Task[],
  days = 7
): { date: string; done: number }[] {
  const today = todayIso();
  const out: { date: string; done: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = addDays(today, -i);
    // 완료 시각(doneAt) 우선, 없으면 마감일 기준 근사
    const done = tasks.filter((t) => {
      if (!t.done) return false;
      const ref = t.doneAt ? t.doneAt.slice(0, 10) : t.endDate;
      return ref === d;
    }).length;
    out.push({ date: d, done });
  }
  return out;
}

/** 짧은 날짜 라벨 "M/D" */
export function shortDate(iso: string): string {
  const d = parseDate(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}
