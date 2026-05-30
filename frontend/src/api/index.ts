/* ============================================================
   API 레이어 — 화면이 데이터를 가져오는 "유일한 통로".
   지금은 목 데이터를 Promise로 반환(서버처럼 비동기).
   서버 완성 시: 각 함수 안을 fetch("/api/...") 호출로 교체하면 됨.
   화면 코드는 한 줄도 안 바꿔도 된다.  ← 이게 분리의 핵심

   ※ 카테고리는 추가/수정/삭제(CRUD)를 지원한다.
     지금은 메모리 안의 배열을 직접 바꾼다(목). 새로고침하면 초기화됨.
     서버 연결 시 같은 함수가 서버에 저장하도록 바뀐다.
   ============================================================ */
import { mockCategories, mockCustomers, mockTasks, mockUsers } from "../mock/data";
import type { Category, Customer, Task, User } from "../types";

// 서버 지연을 흉내내는 작은 헬퍼 (로딩 상태 테스트용)
function delay<T>(data: T, ms = 120): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(data), ms));
}

// 카테고리만 변경 가능하므로 별도의 변경 가능한 복사본을 둔다.
let categories: Category[] = mockCategories.map((c) => ({ ...c }));

// 새 카테고리 ID 생성용 카운터
let categorySeq = 1;
function newCategoryId(): string {
  return `c-new-${categorySeq++}`;
}

export const CARRY_DEFAULT_ID = "c0"; // 삭제 불가 '기본' 카테고리

export const api = {
  getUsers: (): Promise<User[]> => delay(mockUsers),
  getCustomers: (): Promise<Customer[]> => delay(mockCustomers),
  getTasks: (): Promise<Task[]> => delay(mockTasks),

  // ----- 카테고리 -----
  getCategories: (): Promise<Category[]> =>
    delay(categories.map((c) => ({ ...c }))),

  /** 카테고리 추가. parentId=null이면 활동(부모), 값이 있으면 세부(자식) */
  createCategory: (input: {
    name: string;
    parentId: string | null;
    color: string;
  }): Promise<Category> => {
    const created: Category = {
      id: newCategoryId(),
      name: input.name.trim(),
      parentId: input.parentId,
      color: input.color,
    };
    categories = [...categories, created];
    return delay({ ...created });
  },

  /** 이름·색상 수정 */
  updateCategory: (
    id: string,
    patch: { name?: string; color?: string }
  ): Promise<Category> => {
    categories = categories.map((c) =>
      c.id === id
        ? {
            ...c,
            ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
            ...(patch.color !== undefined ? { color: patch.color } : {}),
          }
        : c
    );
    const updated = categories.find((c) => c.id === id)!;
    return delay({ ...updated });
  },

  /** 삭제. 부모를 지우면 그 자식들도 함께 삭제된다. '기본'은 삭제 불가 */
  deleteCategory: (id: string): Promise<{ deletedIds: string[] }> => {
    if (id === CARRY_DEFAULT_ID) {
      return Promise.reject(new Error("'기본' 카테고리는 삭제할 수 없습니다."));
    }
    const childIds = categories
      .filter((c) => c.parentId === id)
      .map((c) => c.id);
    const deletedIds = [id, ...childIds];
    categories = categories.filter((c) => !deletedIds.includes(c.id));
    return delay({ deletedIds });
  },
};
