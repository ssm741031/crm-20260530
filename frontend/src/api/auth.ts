/* ============================================================
   인증 API — B안: 고보험 SSO + 화이트리스트

   흐름:
   1. restoreSession() → GET /api/crm/me
      · 200 → 인증된 user 캐시
      · 401 → ssoLogin() 자동 시도
   2. ssoLogin() → localStorage 의 고보험 access_token 을
      Authorization: Bearer 로 POST /api/crm/sso-login
      · 200 → __session cookie 발급됨, user 반환
      · 401/403 → 안내 페이지 (LoginPage)
   3. 이후 /api/crm/* 는 cookie 자동 첨부 (credentials: include)
   ============================================================ */
import type { User } from "../types";

const API_BASE = "/api/crm";

// 메모리 캐시 — restoreSession/ssoLogin 성공 시 채워짐
let _currentUser: User | null = null;

async function jsonFetch<T = unknown>(
  path: string,
  init?: RequestInit,
): Promise<{ ok: boolean; status: number; data: T | null }> {
  try {
    const res = await fetch(API_BASE + path, {
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      ...init,
    });
    let data: T | null = null;
    if (res.status !== 204) {
      try { data = (await res.json()) as T; } catch { data = null; }
    }
    return { ok: res.ok, status: res.status, data };
  } catch {
    return { ok: false, status: 0, data: null };
  }
}

/** 고보험 access_token 가져오기 — localStorage 또는 session 어느 쪽이든 */
function getGoboheomToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return (
      window.localStorage.getItem("access_token") ||
      window.localStorage.getItem("accessToken") ||
      window.sessionStorage.getItem("access_token") ||
      null
    );
  } catch {
    return null;
  }
}

/** 고보험 SSO 로그인 — 고보험 토큰으로 CRM __session 발급 받기 */
export async function ssoLogin(): Promise<User | null> {
  const goboheomToken = getGoboheomToken();
  if (!goboheomToken) return null;
  const res = await jsonFetch<{ user?: User; error?: string }>("/sso-login", {
    method: "POST",
    headers: { Authorization: `Bearer ${goboheomToken}` },
  });
  if (res.ok && res.data && res.data.user) {
    _currentUser = res.data.user;
    return res.data.user;
  }
  return null;
}

/** 새로고침 시 세션 확인 — 401 이면 SSO 자동 시도 */
export async function restoreSession(): Promise<User | null> {
  const res = await jsonFetch<User>("/me");
  if (res.ok && res.data) {
    _currentUser = res.data;
    return res.data;
  }
  // 401 — 고보험 SSO 자동 시도
  const sso = await ssoLogin();
  if (sso) return sso;
  _currentUser = null;
  return null;
}

export interface LoginResult {
  ok: boolean;
  user?: User;
  error?: string;
}

/** (B안) login 은 ssoLogin 으로 위임 — id/pw 폼은 제거됨 */
export async function login(_loginId: string, _password: string): Promise<LoginResult> {
  const user = await ssoLogin();
  if (user) return { ok: true, user };
  return { ok: false, error: "고보험 로그인이 필요합니다." };
}

/** 로그아웃 — __session 만료 + 메모리 캐시 클리어 (고보험 세션은 그대로) */
export async function logout(): Promise<void> {
  await jsonFetch("/logout", { method: "POST" });
  _currentUser = null;
}

export function getCurrentUser(): User | null {
  return _currentUser;
}

export function setMockCurrentUserForDev(_userId: string): void {
  if (!import.meta.env.DEV) {
    console.warn("[auth] setMockCurrentUserForDev is dev-only — ignored in production");
    return;
  }
  console.warn("[auth][dev] B안(SSO) 활성화 상태 — 실제 세션이 진실의 원천");
}
