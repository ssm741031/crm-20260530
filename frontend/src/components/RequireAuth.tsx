/* RequireAuth — 라우트 가드 (Sprint 13)
 * 비로그인 → /login 으로 리다이렉트 (현재 URL 을 state.from 에 저장)
 * loading 중엔 잠깐 빈 화면 (깜빡임 방지)
 */
import { Navigate, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "../hooks/useAuth";

export default function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return null; // 또는 로딩 인디케이터
  }

  if (!user) {
    // 로그인 후 원래 페이지로 돌아갈 수 있도록 from 저장
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }

  return <>{children}</>;
}
