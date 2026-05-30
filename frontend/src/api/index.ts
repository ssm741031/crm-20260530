/* ============================================================
   API 레이어 — 화면이 데이터를 가져오는 "유일한 통로".
   지금은 목 데이터를 Promise로 반환(서버처럼 비동기).
   서버 완성 시: 각 함수 안을 fetch("/api/...") 호출로 교체하면 됨.
   화면 코드는 한 줄도 안 바꿔도 된다.  ← 이게 분리의 핵심

   ※ 카테고리·할 일은 추가/수정/삭제(CRUD)를 지원한다.
     지금은 메모리 안의 배열을 직접 바꾼다(목). 새로고침하면 초기화됨.
     서버 연결 시 같은 함수가 서버에 저장하도록 바뀐다.
   ============================================================ */
import { mockCategories, mockCustomers, mockTasks, mockUsers } from "../mock/data";
import type { Category, Customer, Task, User } from "../types";
import { addPeriod, canAutoRegen } from "../utils/regen";

// 서버 지연을 흉내내는 작은 헬퍼 (로딩 상태 테스트용)
function delay<T>(data: T, ms = 120): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(data), ms));
}

// 변경 가능한 복사본 (목 상태)
let categories: Category[] = mockCategories.map((c) => ({ ...c }));
let tasks: Task[] = mockTasks.map((t) => ({ ...t }));

// ID 생성용 카운터
let categorySeq = 1;
let taskSeq = 1;
const newCategoryId = () => `c-new-${categorySeq++}`;
const newTaskId = () => `t-new-${taskSeq++}`;

export const CARRY_DEFAULT_ID = "c0"; // 삭제 불가 '기본' 카테고리

/** 할 일 편집폼이 만들어 보내는 입력값 (id·완료상태·streak는 시스템이 채움) */
export type TaskInput = Omit<Task, "id" | "done" | "doneAt" | "streak">;

export const api = {
  getUsers: (): Promise<User[]> => delay(mockUsers),
  getCustomers: (): Promise<Customer[]> => delay(mockCustomers),

  // ----- 카테고리 -----
  getCategories: (): Promise<Category[]> =>
    delay(categories.map((c) => ({ ...c }))),

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

  // ----- 할 일 -----
  getTasks: (): Promise<Task[]> => delay(tasks.map((t) => ({ ...t }))),

  createTask: (input: TaskInput): Promise<Task> => {
    const created: Task = {
      ...input,
      id: newTaskId(),
      done: false,
      doneAt: null,
      streak: 0,
    };
    tasks = [...tasks, created];
    return delay({ ...created });
  },

  updateTask: (id: string, patch: Partial<Task>): Promise<Task> => {
    tasks = tasks.map((t) => (t.id === id ? { ...t, ...patch } : t));
    const updated = tasks.find((t) => t.id === id)!;
    return delay({ ...updated });
  },

  deleteTask: (id: string): Promise<void> => {
    tasks = tasks.filter((t) => t.id !== id);
    return delay(undefined);
  },

  /** 완료 토글 (작업완료는 사용자 확인 클릭으로만 — 계획서 §4.2)
   *  완료로 전환 + autoRegen + 주기형(매주/매월/매년)이면 다음 회차를 즉시 생성.
   *  (실제 '리드타임 전 미리 생성' 스케줄링은 서버 몫 — 계획서 §5-B.3) */
  toggleDone: (id: string, doneAtIso: string | null): Promise<Task> => {
    const before = tasks.find((t) => t.id === id);
    const willBeDone = before ? !before.done : false;

    tasks = tasks.map((t) =>
      t.id === id
        ? { ...t, done: !t.done, doneAt: !t.done ? doneAtIso : null }
        : t
    );
    const updated = tasks.find((t) => t.id === id)!;

    // 완료로 전환되는 순간에만 재생성 (해제 시엔 생성 안 함 → 무한 루프 방지)
    if (
      willBeDone &&
      updated.autoRegen &&
      canAutoRegen(updated.repeat) &&
      updated.endDate
    ) {
      const nextDue = addPeriod(updated.endDate, updated.repeat);
      const regenerated: Task = {
        ...updated,
        id: newTaskId(),
        endDate: nextDue,
        done: false,
        doneAt: null,
        streak: updated.streak + 1, // 연속 달성 누적
      };
      tasks = [...tasks, regenerated];
    }
    return delay({ ...updated });
  },

  /** 습관 오늘 체크 토글 (계획서 §5-B.2) — 완료 시 streak+1, 해제 시 −1(최소 0).
   *  공용 toggleDone과 분리해 할 일·캘린더 동작에 영향 주지 않는다. */
  toggleHabitDone: (id: string, doneAtIso: string | null): Promise<Task> => {
    tasks = tasks.map((t) => {
      if (t.id !== id) return t;
      const nowDone = !t.done;
      return {
        ...t,
        done: nowDone,
        doneAt: nowDone ? doneAtIso : null,
        streak: nowDone ? t.streak + 1 : Math.max(0, t.streak - 1),
      };
    });
    const updated = tasks.find((t) => t.id === id)!;
    return delay({ ...updated });
  },
};
