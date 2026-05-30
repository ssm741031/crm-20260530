/** 반복·알람 입력용 상수 (계획서 §5-B.1 반복 5종 / §4.2 알람) */
import type { ReminderAction, RepeatType } from "../types";

/** 반복 5종 + 안 함 (드롭다운 순서 = 계획서 표 순서) */
export const REPEAT_OPTIONS: { value: RepeatType; label: string }[] = [
  { value: "none", label: "반복 안 함" },
  { value: "daily", label: "매일" },
  { value: "weekly_days", label: "요일 지정" },
  { value: "weekly", label: "매주" },
  { value: "monthly", label: "매월" },
  { value: "yearly", label: "매년" },
];

/** 요일 (repeatDays 값 = 0:일 ~ 6:토, JS Date.getDay()와 동일) */
export const WEEKDAYS: { value: number; label: string }[] = [
  { value: 0, label: "일" },
  { value: 1, label: "월" },
  { value: 2, label: "화" },
  { value: 3, label: "수" },
  { value: 4, label: "목" },
  { value: 5, label: "금" },
  { value: 6, label: "토" },
];

/** 알람 시점 프리셋 (마감 기준 분 전) — 계획서 §4.2 ① */
export const REMINDER_PRESETS: { value: number; label: string }[] = [
  { value: 0, label: "정시 (마감 시각)" },
  { value: 15, label: "15분 전" },
  { value: 30, label: "30분 전" },
  { value: 60, label: "1시간 전" },
  { value: 1440, label: "1일 전" },
];

/** 알람 동작 3종 — 계획서 §4.2 ② */
export const REMINDER_ACTIONS: ReminderAction[] = ["작업완료", "연장", "알람만"];

/** 알람 최대 개수 — 계획서 §4.2 (항목당 최대 5회) */
export const MAX_REMINDERS = 5;

/** 시점 분 → 사람이 읽는 라벨 (프리셋이면 라벨, 아니면 "N분 전") */
export function reminderLabel(minutesBefore: number): string {
  return (
    REMINDER_PRESETS.find((p) => p.value === minutesBefore)?.label ??
    `${minutesBefore}분 전`
  );
}
