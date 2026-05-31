import { useState } from "react";
import type { FormEvent } from "react";
import {
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { NAV_ITEMS } from "./nav";
import { useAuth } from "../hooks/useAuth";
import { NotificationProvider } from "../contexts/NotificationContext";
import NotificationPermissionBanner from "../components/NotificationPermissionBanner";
import ToastContainer from "../components/ToastContainer";
import "./AppShell.css";

/** 헤더 우측의 사용자명 + 로그아웃 (Sprint 13) */
function UserBadge() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  if (!user) return null;
  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };
  return (
    <div className="user-badge">
      <span className="user-badge__name">{user.name}</span>
      <span className="user-badge__role">{user.role}</span>
      <button type="button" className="user-badge__logout" onClick={handleLogout}>
        로그아웃
      </button>
    </div>
  );
}

/** 통합검색 입력바 — PC 사이드바 상단 + 모바일 헤더에서 공유 (Sprint 11) */
function SearchBar() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [shake, setShake] = useState(false);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = q.trim();
    if (!trimmed) {
      // 빈 입력 가드 — 흔들림 피드백 (시나리오 3)
      setShake(true);
      setTimeout(() => setShake(false), 350);
      return;
    }
    navigate(`/search?q=${encodeURIComponent(trimmed)}`);
  };

  return (
    <form className="search-bar" onSubmit={submit} role="search">
      <input
        type="search"
        className={
          "search-bar__input" + (shake ? " search-bar__input--shake" : "")
        }
        placeholder="고객·할일·차량번호 검색"
        aria-label="통합검색"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <button type="submit" className="search-bar__btn" aria-label="검색">
        🔍
      </button>
    </form>
  );
}

/**
 * 앱 공통 레이아웃(셸).
 * - PC: 왼쪽 사이드바 + 본문
 * - 모바일(≤768px): 하단 탭바 + 본문 (CSS 미디어쿼리로 자동 전환)
 * 각 화면(페이지)은 <Outlet /> 자리에 렌더된다.
 */
function ShellInner() {
  const location = useLocation();
  const current =
    NAV_ITEMS.find((n) => location.pathname.startsWith(n.to))?.label ?? "";

  return (
    <div className="shell">
      {/* Sprint 14: 알림 권한 배너 (default 일 때만 표시) */}
      <NotificationPermissionBanner />
      {/* ===== 사이드바 (PC) ===== */}
      <aside className="shell__sidebar">
        <div className="shell__brand">사내 CRM</div>
        <SearchBar />
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
        <header className="shell__header">
          <span className="shell__header-title">{current}</span>
          {/* 모바일 헤더에서만 보이는 검색바 */}
          <div className="shell__header-search">
            <SearchBar />
          </div>
          {/* 우측: 로그인 사용자명 + 로그아웃 (Sprint 13) */}
          <UserBadge />
        </header>
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
      {/* Sprint 14: in-app 토스트 컨테이너 (전역 fixed) */}
      <ToastContainer />
    </div>
  );
}

/**
 * 앱 공통 레이아웃(셸).
 * - PC: 왼쪽 사이드바 + 본문
 * - 모바일(≤768px): 하단 탭바 + 본문 (CSS 미디어쿼리로 자동 전환)
 * - Sprint 14: NotificationProvider 로 알림 컨텍스트 제공 (Router 안이어야 useNavigate 동작)
 */
export default function AppShell() {
  return (
    <NotificationProvider>
      <ShellInner />
    </NotificationProvider>
  );
}
