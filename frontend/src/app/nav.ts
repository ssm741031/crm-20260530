/** 내비게이션 항목 정의 — 사이드바(PC)와 하단탭바(모바일)가 공유한다. */
export interface NavItem {
  to: string;
  label: string;
  icon: string; // 임시 이모지 아이콘 (추후 아이콘 컴포넌트로 교체 가능)
}

export const NAV_ITEMS: NavItem[] = [
  { to: "/tasks", label: "할 일", icon: "✓" },
  { to: "/customers", label: "고객", icon: "👤" },
  { to: "/calendar", label: "캘린더", icon: "📅" },
  { to: "/habits", label: "습관", icon: "🔁" },
  { to: "/pipeline", label: "파이프라인", icon: "📊" },
  { to: "/notices", label: "안내기록", icon: "📨" },
  { to: "/categories", label: "카테고리", icon: "🏷️" },
];
