/* ============================================================
   현재 로그인 사용자 (Sprint 11 — 검색 권한 필터용 mock)

   ⚠️ 임시 mock 입니다.
   - Sprint 01 (실제 인증·로그인) 완성 시 이 파일의 내부 구현만
     "세션/JWT 기반 currentUser 조회" 로 교체하면 됨.
   - api/ 단일 통로 결정에 따라, 화면 코드는 export 함수만 호출
     → 진짜 인증 붙어도 화면 변경 없음.

   결정사항(2026-05-31): mock currentUser = u3 (이영업, 팀원)
   - 권한 필터 효과가 즉시 보이도록 일반 팀원으로 시작
   - dev 토글로 대표(u1) 전환 가능 (setMockCurrentUserForDev)
   ============================================================ */
import { mockUsers } from "../mock/data";
import type { User } from "../types";

// dev 전환용 mutable 상태 (운영 코드 아님)
let _mockCurrentUserId: string = "u3";

/** 현재 로그인 사용자 (동기 — Sprint 01 완성 시 비동기로 바꿔도 됨) */
export function getCurrentUser(): User {
  const u = mockUsers.find((x) => x.id === _mockCurrentUserId);
  if (!u) {
    // mockUsers 가 비어있거나 ID가 잘못된 경우 — 안전한 폴백 (대표)
    return mockUsers[0];
  }
  return u;
}

/** dev 전용 — currentUser 를 다른 사용자로 전환해 권한 시나리오 검증
 *  ⚠️ 운영 인증이 붙으면 제거 대상 */
export function setMockCurrentUserForDev(userId: string): void {
  _mockCurrentUserId = userId;
}
