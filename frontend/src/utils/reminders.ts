/* ============================================================
   알람 시각 계산 헬퍼 (Sprint 14)

   Task.reminders 의 각 minutesBefore 를 마감 시각에서 빼서
   실제 알림이 발사돼야 할 Date 들을 반환한다.

   1차 한계 (Phase 1):
   - 마감형(deadline): endDate + endTime 기준
   - 구간형(range): endDate + endTime (종료) 기준 — start 기준 알림은 후속
   - 시점이 과거면 제외 (이미 지난 알람은 발사 안 함)
   - 시간(endTime) 없으면 자정(00:00)으로 간주
   ============================================================ */
import type { Reminder, Task } from "../types";

export interface UpcomingReminder {
  taskId: string;
  reminderIdx: number; // task.reminders 안의 인덱스 (dedup 키)
  fireAt: Date;        // 발사 시각
  reminder: Reminder;
  task: Task;          // 알림 본문에 사용
}

/** 'YYYY-MM-DD' + 'HH:mm' → Date. 시간 없으면 00:00 */
export function deadlineToDate(endDate: string | null, endTime: string | null): Date | null {
  if (!endDate) return null;
  const time = endTime && /^\d{2}:\d{2}$/.test(endTime) ? endTime : "00:00";
  // 로컬 타임존 기준
  const d = new Date(`${endDate}T${time}:00`);
  return isNaN(d.getTime()) ? null : d;
}

/** 한 Task 의 미래 알람들을 계산 */
export function computeReminderTimes(task: Task, now: Date = new Date()): UpcomingReminder[] {
  if (task.done) return []; // 이미 완료된 task 는 알람 X
  const due = deadlineToDate(task.endDate, task.endTime);
  if (!due) return [];

  const upcoming: UpcomingReminder[] = [];
  task.reminders.forEach((reminder, idx) => {
    const fireAt = new Date(due.getTime() - reminder.minutesBefore * 60_000);
    if (fireAt.getTime() > now.getTime()) {
      upcoming.push({ taskId: task.id, reminderIdx: idx, fireAt, reminder, task });
    }
  });
  return upcoming;
}

/** 여러 Task 의 미래 알람 일괄 계산 + 발사 시각 오름차순 정렬 */
export function computeAllUpcoming(tasks: Task[], now: Date = new Date()): UpcomingReminder[] {
  const all: UpcomingReminder[] = [];
  tasks.forEach((t) => {
    all.push(...computeReminderTimes(t, now));
  });
  all.sort((a, b) => a.fireAt.getTime() - b.fireAt.getTime());
  return all;
}

/** dedup 키 — 같은 (taskId, reminderIdx) 조합은 한 세션에서 한 번만 발사 */
export function reminderKey(taskId: string, reminderIdx: number): string {
  return `${taskId}::${reminderIdx}`;
}

/** 알람 본문 텍스트 — 결정사항(2026-05-31): "{title} — 마감 N분 전" + 동작별 안내 */
export function buildReminderText(upcoming: UpcomingReminder): { title: string; body: string } {
  const { task, reminder } = upcoming;
  const beforeText = formatBefore(reminder.minutesBefore);
  let body = `마감 ${beforeText} 전`;
  if (reminder.action === "작업완료") {
    body += " · 앱에서 [작업완료] 확인하세요";
  } else if (reminder.action === "연장") {
    body += " · 필요 시 [연장] 처리하세요";
  }
  return { title: task.title, body };
}

function formatBefore(minutes: number): string {
  if (minutes === 0) return "정시";
  const d = Math.floor(minutes / (60 * 24));
  const h = Math.floor((minutes - d * 60 * 24) / 60);
  const m = minutes - d * 60 * 24 - h * 60;
  const parts: string[] = [];
  if (d) parts.push(`${d}일`);
  if (h) parts.push(`${h}시간`);
  if (m) parts.push(`${m}분`);
  return parts.join(" ") || "0분";
}
