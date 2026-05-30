/** 습관 뷰 유틸 (계획서 §5-B.1·§5-B.2)
 *  습관 = 반복이 켜진 할 일(repeat !== "none"). 별도 테이블 없음(결정사항).
 *  주간 그리드의 "이 요일이 이 습관에 적용되는가" 판정. 기준일 = endDate, 요일 0=일. */
import type { Task } from "../types";
import { parseDate } from "./calendar";

/** 반복이 켜진 할 일인가 = 습관 */
export function isHabit(t: Task): boolean {
  return t.repeat !== "none";
}

/** 습관만 추리기 */
export function habitsOf(tasks: Task[]): Task[] {
  return tasks.filter(isHabit);
}

/** iso 날짜가 이 습관의 반복 주기에 "적용되는 날"인가 */
export function isApplicableOn(t: Task, iso: string): boolean {
  if (t.repeat === "none") return false;
  const day = parseDate(iso);
  if (t.repeat === "daily") return true;
  if (t.repeat === "weekly_days") return t.repeatDays.includes(day.getDay());

  // weekly/monthly/yearly 는 기준일(endDate)과 맞춰 비교
  if (!t.endDate) return false;
  const base = parseDate(t.endDate);
  if (t.repeat === "weekly") return day.getDay() === base.getDay();
  if (t.repeat === "monthly") return day.getDate() === base.getDate();
  if (t.repeat === "yearly")
    return day.getDate() === base.getDate() && day.getMonth() === base.getMonth();
  return false;
}

/** 주간 그리드 한 칸 상태 (적용일 기준; 과거 달성이력은 서버 연동 후) */
export type HabitCell = "today" | "future" | "past" | "none";

export function habitCellState(t: Task, iso: string, todayIso: string): HabitCell {
  if (!isApplicableOn(t, iso)) return "none"; // 이 요일엔 해당 없음
  if (iso === todayIso) return "today"; // 오늘 = 체크 가능
  return iso > todayIso ? "future" : "past"; // 미래=예정 / 과거=기록없음
}
