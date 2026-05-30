/* ============================================================
   API 레이어 — 화면이 데이터를 가져오는 "유일한 통로".
   지금은 목 데이터를 Promise로 반환(서버처럼 비동기).
   서버 완성 시: 각 함수 안을 fetch("/api/...") 호출로 교체하면 됨.
   화면 코드는 한 줄도 안 바꿔도 된다.  ← 이게 분리의 핵심
   ============================================================ */
import { mockCategories, mockCustomers, mockTasks, mockUsers } from "../mock/data";
import type { Category, Customer, Task, User } from "../types";

// 서버 지연을 흉내내는 작은 헬퍼 (로딩 상태 테스트용)
function delay<T>(data: T, ms = 150): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(data), ms));
}

export const api = {
  getUsers: (): Promise<User[]> => delay(mockUsers),
  getCategories: (): Promise<Category[]> => delay(mockCategories),
  getCustomers: (): Promise<Customer[]> => delay(mockCustomers),
  getTasks: (): Promise<Task[]> => delay(mockTasks),
};
