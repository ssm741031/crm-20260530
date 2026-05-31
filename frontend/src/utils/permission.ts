/* ============================================================
   권한 필터 헬퍼 (Sprint 11)

   결정사항 (2026-05-31, 01_결정사항_누적.md):
   - 대표(role: "대표") → 전체 보임
   - 그 외(팀장/팀원) → 본인이 owner 인 항목만
   - 1차 한계: User.teamId 없음·Task.ownerId 없음
     · 팀장 권한 = 1차는 본인 owner 만 (후속 sprint 에서 팀 모델 추가)
     · Task = customerId 의 customer.ownerId 를 task owner 로 간주
       customerId 가 null 이면 share 만으로 판단

   이 헬퍼는 순수 함수 — currentUser 와 데이터를 받아 boolean 반환.
   ============================================================ */
import type { Customer, Pipeline, Task, User } from "../types";

/** 대표 권한 — 전체 데이터 접근 가능 */
function isOwner(user: User): boolean {
  return user.role === "대표";
}

/** 고객 보임 여부
 *  - 대표 OR customer.ownerId === user.id
 */
export function canViewCustomer(user: User, customer: Customer): boolean {
  if (isOwner(user)) return true;
  return customer.ownerId === user.id;
}

/** 할 일 보임 여부
 *  규칙(우선순위):
 *   1) 대표 → true
 *   2) share.scope === "team"          → true  (전사 공유로 1차 해석)
 *   3) share.scope === "selected" 이고 sharedWith.includes(user.id) → true
 *   4) task.customerId 가 있으면 그 고객의 ownerId === user.id → true
 *      (Task 자체 ownerId 가 없으므로 customer owner 를 task owner 로 간주)
 *   5) customerId === null 이면 share.scope === "private" 인 경우
 *      현재 사용자가 만든 task 인지 알 길이 없음(생성자 필드 부재)
 *      → 1차: 모두 false (보수적). 후속 sprint 에서 Task.createdBy 추가
 *   그 외 → false
 *  customers 인자 = api.getCustomers() 결과를 전달받아 owner 조회용
 */
export function canViewTask(
  user: User,
  task: Task,
  customers: readonly Customer[],
): boolean {
  if (isOwner(user)) return true;

  const scope = task.share?.scope;
  if (scope === "team") return true;
  if (scope === "selected" && task.share.sharedWith.includes(user.id)) {
    return true;
  }

  if (task.customerId) {
    const owner = customers.find((c) => c.id === task.customerId)?.ownerId;
    if (owner === user.id) return true;
  }

  return false;
}

/** 파이프라인 보임 여부 — customer 권한 그대로 상속
 *  customers 인자 = api.getCustomers() 결과
 */
export function canViewPipeline(
  user: User,
  pipeline: Pipeline,
  customers: readonly Customer[],
): boolean {
  if (isOwner(user)) return true;
  const customer = customers.find((c) => c.id === pipeline.customerId);
  if (!customer) return false; // 고객을 못 찾으면 보수적으로 false
  return canViewCustomer(user, customer);
}
