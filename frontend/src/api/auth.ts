/* ============================================================
   인증 API (Sprint 13 — mock 기반 골격)

   ⚠️ DEV ONLY mock 구현입니다.
   - Sprint 01 (이팀장 백엔드) 완성 시 이 파일의 함수 내부만
     "fetch('/api/login')" 등으로 교체 → 화면 코드 변경 0.
   - api/ 단일 통로 결정에 따라, 다른 모든 화면은 useAuth()/getCurrentUser()
     를 호출만 함.

   결정사항(2026-05-31):
   - mock pw 전부 "1234" 통일 (boss/lead1/sales1) — DEV ONLY
   - 세션 저장: localStorage (백엔드 완성 시 httpOnly 쿠키 재결정)
   - dev 토글 setMockCurrentUserForDev 유지 + import.meta.env.DEV 가드
   ============================================================ */
import { mockUsers } from "../mock/data";
import type { User } from "../types";

const STORAGE_KEY = "crm.session.v1"; // { userId: string }
const MOCK_DEV_PASSWORD = "1234";       // DEV ONLY — 백엔드 완성 시 폐기

// 메모리 캐시 (페이지 단위) — 인증된 user OR dev 토글로 설정된 user
let _currentUser: User | null = null;

/** 새로고침 시 localStorage 에서 세션 복원 (AuthProvider 초기 useEffect 에서 호출) */
export function restoreSession(): User | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { userId?: string };
    if (!parsed.userId) return null;
    const user = mockUsers.find((u) => u.id === parsed.userId);
    if (user) {
      _currentUser = user;
      return user;
    }
    // 저장된 ID 가 mockUsers 와 불일치 → 손상 → 클리어
    window.localStorage.removeItem(STORAGE_KEY);
    return null;
  } catch {
    return null;
  }
}

export interface LoginResult {
  ok: boolean;
  user?: User;
  error?: string;
}

/** mock 로그인 — loginId + password 매칭, 성공 시 localStorage 저장 */
export async function login(loginId: string, password: string): Promise<LoginResult> {
  // mock 지연 (서버 응답 흉내 — 백엔드 완성 시 fetch 로 교체)
  await new Promise((r) => setTimeout(r, 200));

  const user = mockUsers.find((u) => u.loginId === loginId);
  if (!user || password !== MOCK_DEV_PASSWORD) {
    return { ok: false, error: "아이디 또는 비밀번호가 올바르지 않습니다." };
  }

  _currentUser = user;
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ userId: user.id }),
    );
  } catch {
    // localStorage 차단 시에도 메모리 세션은 유지
  }
  return { ok: true, user };
}

/** 로그아웃 — 세션 클리어 */
export function logout(): void {
  _currentUser = null;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // noop
  }
}

/** 현재 로그인 사용자 — Sprint 11 권한 필터(canViewCustomer 등) 가 호출
 *  반환: User OR null (비로그인). 1차 한계로 호출 측에서 null 처리 필요.
 *  Sprint 11 시점엔 항상 mock u3 반환했으나, Sprint 13부터 진짜 인증 기반.
 */
export function getCurrentUser(): User | null {
  return _currentUser;
}

/** dev 전용 — 운영 모드(import.meta.env.DEV=false)에선 no-op */
export function setMockCurrentUserForDev(userId: string): void {
  if (!import.meta.env.DEV) {
    console.warn("[auth] setMockCurrentUserForDev is dev-only — ignored in production");
    return;
  }
  const u = mockUsers.find((x) => x.id === userId);
  if (u) {
    _currentUser = u;
    console.log("[auth][dev] currentUser set to", u.loginId);
  }
}
