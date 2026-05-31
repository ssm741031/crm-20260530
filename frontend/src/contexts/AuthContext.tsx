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

  // 새로고침 시 localStorage 복원
  useEffect(() => {
    const restored = authApi.restoreSession();
    setUser(restored);
    setLoading(false);
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
    authApi.logout();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
