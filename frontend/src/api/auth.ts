/* ============================================================
   인증 API — Sprint 01 백엔드 fetch (Sprint 13 mock 교체)

   백엔드: /api/crm/{login,logout,me} (Express, JWT in httpOnly cookie)
   - 쿠키 자동 첨부 위해 fetch credentials: 'include'
   - getCurrentUser() 는 동기 (메모리 캐시) — AuthContext 가 restoreSession() 으로 초기화

   - dev 토글 setMockCurrentUserForDev: import.meta.env.DEV 가드 유지하나,
     백엔드 인증이 있을 땐 의미 없음 (서버 세션이 진실의 원천)
   ============================================================ */
import type { User } from "../types";

const API_BASE = "/api/crm";

// 메모리 캐시 — restoreSession/login 성공 시 채워짐
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
      try {
        data = (await res.json()) as T;
      } catch {
        data = null;
      }
    }
    return { ok: res.ok, status: res.status, data };
  } catch {
    return { ok: false, status: 0, data: null };
  }
}

/** 새로고침 시 백엔드에 세션 확인 (cookie 자동 첨부)
 *  성공(200) → user 반환 + 캐시 / 401 → null + 캐시 비움
 */
export async function restoreSession(): Promise<User | null> {
  const res = await jsonFetch<User>("/me");
  if (res.ok && res.data) {
    _currentUser = res.data;
    return res.data;
  }
  _currentUser = null;
  return null;
}

export interface LoginResult {
  ok: boolean;
  user?: User;
  error?: string;
}

/** 로그인 — 성공 시 쿠키 자동 설정 + 메모리 캐시 */
export async function login(loginId: string, password: string): Promise<LoginResult> {
  const res = await jsonFetch<{ user?: User; error?: string }>("/login", {
    method: "POST",
    body: JSON.stringify({ loginId, password }),
  });
  if (res.ok && res.data && res.data.user) {
    _currentUser = res.data.user;
    return { ok: true, user: res.data.user };
  }
  const message = (res.data && (res.data as { error?: string }).error) || "로그인에 실패했습니다.";
  return { ok: false, error: message };
}

/** 로그아웃 — 백엔드가 쿠키 만료 + 메모리 캐시 클리어 */
export async function logout(): Promise<void> {
  await jsonFetch("/logout", { method: "POST" });
  _currentUser = null;
}

/** 현재 사용자 (동기) — Sprint 11 권한 헬퍼(canViewCustomer 등)에서 사용
 *  진짜 출처는 백엔드 me 응답. 메모리 캐시 반환.
 *  AuthContext 가 마운트 시 restoreSession 으로 캐시 채움.
 */
export function getCurrentUser(): User | null {
  return _currentUser;
}

/** dev 전용 — 운영 모드(import.meta.env.DEV=false)에선 no-op
 *  백엔드 인증 시대엔 실제 세션이 진실의 원천 — 이 함수는 dev에서만 의미 있음
 */
export function setMockCurrentUserForDev(_userId: string): void {
  if (!import.meta.env.DEV) {
    console.warn("[auth] setMockCurrentUserForDev is dev-only — ignored in production");
    return;
  }
  console.warn("[auth][dev] setMockCurrentUserForDev: 백엔드 인증이 활성화돼 있어 효과 제한적");
}
