/* ============================================================
   AuthContext (Sprint 13 — 프론트 인증 골격)

   React Context 로 인증 상태 + login/logout 노출.
   화면 코드는 useAuth() 훅을 통해 user / login / logout 사용.
   api/auth.ts 의 mock 구현을 호출 — 백엔드 완성 시 api/auth.ts 내부만 교체.
   ============================================================ */
import { createContext, useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import * as authApi from "../api/auth";
import type { User } from "../types";

export interface AuthContextValue {
  user: User | null;
  loading: boolean; // 새로고침 직후 localStorage 복원 중 여부
  login: (loginId: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // 새로고침 시 백엔드 세션 확인 (Sprint 01 백엔드: GET /api/crm/me)
  // 이전 mock 구현은 동기 localStorage 였으나, 백엔드 fetch 는 비동기
  useEffect(() => {
    let cancelled = false;
    authApi.restoreSession().then((restored) => {
      if (cancelled) return;
      setUser(restored);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (loginId: string, password: string) => {
    const result = await authApi.login(loginId, password);
    if (result.ok && result.user) {
      setUser(result.user);
      return { ok: true };
    }
    return { ok: false, error: result.error };
  }, []);

  const logout = useCallback(() => {
    // 백엔드 fetch 는 fire-and-forget — 화면은 즉시 로그아웃 처리
    authApi.logout().catch((err) => console.warn("[logout] error:", err));
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
