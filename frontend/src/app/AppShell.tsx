import { NavLink, Outlet, useLocation } from "react-router-dom";
import { NAV_ITEMS } from "./nav";
import "./AppShell.css";

/**
 * 앱 공통 레이아웃(셸).
 * - PC: 왼쪽 사이드바 + 본문
 * - 모바일(≤768px): 하단 탭바 + 본문 (CSS 미디어쿼리로 자동 전환)
 * 각 화면(페이지)은 <Outlet /> 자리에 렌더된다.
 */
export default function AppShell() {
  const location = useLocation();
  const current =
    NAV_ITEMS.find((n) => location.pathname.startsWith(n.to))?.label ?? "";

  return (
    <div className="shell">
      {/* ===== 사이드바 (PC) ===== */}
      <aside className="shell__sidebar">
        <div className="shell__brand">사내 CRM</div>
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              "navlink" + (isActive ? " navlink--active" : "")
            }
          >
            <span className="navlink__icon">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </aside>

      {/* ===== 본문 ===== */}
      <div className="shell__main">
        <header className="shell__header">{current}</header>
        <main className="shell__content">
          <Outlet />
        </main>
      </div>

      {/* ===== 하단 탭바 (모바일) ===== */}
      <nav className="shell__bottomnav">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              "bottomnav__item" + (isActive ? " bottomnav__item--active" : "")
            }
          >
            <span className="bottomnav__icon">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
