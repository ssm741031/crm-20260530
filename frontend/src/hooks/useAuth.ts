/* useAuth — AuthContext wrapper (Sprint 13)
 * 사용: const { user, login, logout } = useAuth()
 * Provider 밖에서 호출 시 에러로 빠르게 잡음
 */
import { useContext } from "react";
import { AuthContext } from "../contexts/AuthContext";
import type { AuthContextValue } from "../contexts/AuthContext";

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an <AuthProvider>");
  }
  return ctx;
}
