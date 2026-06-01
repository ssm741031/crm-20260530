/* ============================================================
   API 레이어 — 화면이 데이터를 가져오는 "유일한 통로".
   Sprint 02: mock → fetch /api/crm/* 일괄 교체 (백엔드 PostgreSQL CRUD).

   유지된 mock:
   - getUsers (백엔드 없음 — Sprint 03 후속)
   - 카테고리 CRUD (결정사항 §Sprint 02: mock 유지)

   교체된 fetch:
   - customers / tasks / pipelines / notice-logs CRUD (cookie 자동 첨부)
   - searchAll: GET 3개 받아서 프론트 측 substring 매칭 (결정사항 §)
   ============================================================ */
import { mockCategories, mockUsers } from "../mock/data";
import type {
  Category,
  Consent,
  Customer,
  NoticeChannel,
  NoticeLog,
  Pipeline,
  PipelineProduct,
  SearchHit,
  SearchResult,
  Task,
  User,
} from "../types";
import { buildStages } from "../utils/pipeline";
import { getCurrentUser } from "./auth";
import {
  canViewCustomer,
  canViewPipeline,
  canViewTask,
} from "../utils/permission";

const API_BASE = "/api/crm";

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(API_BASE + path, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    let msg = `${res.status}`;
    try {
      const j = await res.json();
      msg = (j && j.error) || msg;
    } catch {
      // noop
    }
    throw new Error(`API ${path}: ${msg}`);
  }
  if (res.status === 204) return undefined as unknown as T;
  return res.json() as Promise<T>;
}

// ── 카테고리 (mock 유지) ──
let categories: Category[] = mockCategories.map((c) => ({ ...c }));
let categorySeq = 1;
const newCategoryId = () => `c-new-${categorySeq++}`;
export const CARRY_DEFAULT_ID = "c0";

/** 할 일 편집폼이 만들어 보내는 입력값 */
export type TaskInput = Omit<Task, "id" | "done" | "doneAt" | "streak">;

export const api = {
  // ===== Users / Customers =====
  getUsers: (): Promise<User[]> => Promise.resolve(mockUsers),

  getCustomers: (): Promise<Customer[]> => http<Customer[]>("/customers"),

  updateConsent: (customerId: string, consent: Consent): Promise<Customer> =>
    http<Customer>(`/customers/${customerId}`, {
      method: "PATCH",
      body: JSON.stringify({ consent }),
    }),

  // ===== Categories (mock 유지) =====
  getCategories: (): Promise<Category[]> =>
    Promise.resolve(categories.map((c) => ({ ...c }))),

  createCategory: (input: { name: string; parentId: string | null; color: string }): Promise<Category> => {
    const created: Category = { id: newCategoryId(), name: input.name.trim(), parentId: input.parentId, color: input.color };
    categories = [...categories, created];
    return Promise.resolve({ ...created });
  },

  updateCategory: (id: string, patch: { name?: string; color?: string }): Promise<Category> => {
    categories = categories.map((c) =>
      c.id === id
        ? { ...c, ...(patch.name !== undefined ? { name: patch.name.trim() } : {}), ...(patch.color !== undefined ? { color: patch.color } : {}) }
        : c,
    );
    return Promise.resolve({ ...categories.find((c) => c.id === id)! });
  },

  deleteCategory: (id: string): Promise<{ deletedIds: string[] }> => {
    if (id === CARRY_DEFAULT_ID) return Promise.reject(new Error("'기본' 카테고리는 삭제할 수 없습니다."));
    const childIds = categories.filter((c) => c.parentId === id).map((c) => c.id);
    const deletedIds = [id, ...childIds];
    categories = categories.filter((c) => !deletedIds.includes(c.id));
    return Promise.resolve({ deletedIds });
  },

  // ===== Tasks =====
  getTasks: (): Promise<Task[]> => http<Task[]>("/tasks"),

  createTask: (input: TaskInput): Promise<Task> =>
    http<Task>("/tasks", { method: "POST", body: JSON.stringify(input) }),

  updateTask: (id: string, patch: Partial<Task>): Promise<Task> =>
    http<Task>(`/tasks/${id}`, { method: "PUT", body: JSON.stringify(patch) }),

  deleteTask: (id: string): Promise<void> =>
    http<void>(`/tasks/${id}`, { method: "DELETE" }),

  toggleDone: (id: string, doneAtIso: string | null): Promise<Task> =>
    http<Task>(`/tasks/${id}/toggle-done`, { method: "POST", body: JSON.stringify({ doneAt: doneAtIso }) }),

  toggleHabitDone: (id: string, doneAtIso: string | null): Promise<Task> =>
    http<Task>(`/tasks/${id}/toggle-habit`, { method: "POST", body: JSON.stringify({ doneAt: doneAtIso }) }),

  moveTask: (id: string, toCategoryId: string, beforeId: string | null): Promise<Task> =>
    http<Task>(`/tasks/${id}/move`, { method: "POST", body: JSON.stringify({ toCategoryId, beforeId }) }),

  // ===== Pipelines =====
  getPipelines: (): Promise<Pipeline[]> => http<Pipeline[]>("/pipelines"),

  createPipeline: (input: {
    customerId: string;
    product: PipelineProduct;
    maturityDate?: string | null;
    vehicleNo?: string | null;
    vehicleVin?: string | null;
  }): Promise<Pipeline> => {
    // stage 템플릿은 프론트 utils/pipeline 의 buildStages 결과를 그대로 전달
    const tempId = "tmp"; // 백엔드가 진짜 id 할당
    const today = new Date().toISOString().slice(0, 10);
    const stages = buildStages(tempId, input.product, today, input.maturityDate ?? null).map((s) => ({
      stage_no: s.stageNo,
      name: s.name,
      due_at: s.dueAt,
    }));
    return http<Pipeline>("/pipelines", {
      method: "POST",
      body: JSON.stringify({
        customerId: input.customerId,
        product: input.product,
        maturityDate: input.maturityDate ?? null,
        vehicleNo: input.vehicleNo ?? null,
        vehicleVin: input.vehicleVin ?? null,
        stages,
      }),
    });
  },

  completeStage: (pipelineId: string, stageNo: number, doneAtIso: string): Promise<Pipeline> =>
    http<Pipeline>(`/pipelines/${pipelineId}/stages/${stageNo}/complete`, {
      method: "POST",
      body: JSON.stringify({ doneAt: doneAtIso }),
    }),

  extendStage: (pipelineId: string, stageNo: number, reason: string, days: number): Promise<Pipeline> =>
    http<Pipeline>(`/pipelines/${pipelineId}/stages/${stageNo}/extend`, {
      method: "POST",
      body: JSON.stringify({ reason, days }),
    }),

  // ===== Notice Logs =====
  getNoticeLogs: (pipelineId?: string): Promise<NoticeLog[]> =>
    http<NoticeLog[]>(`/notice-logs${pipelineId ? `?pipelineId=${encodeURIComponent(pipelineId)}` : ""}`),

  addNoticeLog: (input: {
    pipelineId: string;
    stageNo: number;
    channel: NoticeChannel;
    memo: string;
  }): Promise<NoticeLog> =>
    http<NoticeLog>("/notice-logs", { method: "POST", body: JSON.stringify(input) }),

  updateNoticeLog: (id: string, memo: string): Promise<NoticeLog> =>
    http<NoticeLog>(`/notice-logs/${id}`, { method: "PUT", body: JSON.stringify({ memo }) }),

  deleteNoticeLog: (id: string): Promise<void> =>
    http<void>(`/notice-logs/${id}`, { method: "DELETE" }),

  // ===== Search (프론트 측 substring, 결정사항 §) =====
  searchAll: async (query: string): Promise<SearchResult> => {
    const q = (query ?? "").trim().toLowerCase();
    if (!q) return { customers: [], tasks: [], pipelines: [], total: 0 };
    const user = getCurrentUser();
    if (!user) return { customers: [], tasks: [], pipelines: [], total: 0 };

    // 서버가 이미 권한 필터를 적용한 데이터만 반환 → 추가 권한 체크 불필요
    // (안전 가드로 프론트도 한 번 더 — 통일성)
    const [allCustomers, allTasks, allPipelines] = await Promise.all([
      api.getCustomers(),
      api.getTasks(),
      api.getPipelines(),
    ]);
    const contains = (v: string | null | undefined): boolean => !!v && v.toLowerCase().includes(q);

    const customerHits: SearchHit[] = allCustomers
      .filter((c) => canViewCustomer(user, c))
      .map<SearchHit | null>((c) => {
        if (contains(c.name)) return { kind: "customer", id: c.id, title: c.name, subtitle: c.product, matched: "name" };
        if (contains(c.phone)) return { kind: "customer", id: c.id, title: c.name, subtitle: c.phone, matched: "phone" };
        return null;
      })
      .filter((h): h is SearchHit => h !== null);

    const taskHits: SearchHit[] = allTasks
      .filter((t) => canViewTask(user, t, allCustomers))
      .map<SearchHit | null>((t) => {
        if (contains(t.title)) {
          const cust = t.customerId ? allCustomers.find((c) => c.id === t.customerId) : null;
          return { kind: "task", id: t.id, title: t.title, subtitle: cust ? cust.name : (t.endDate ?? undefined), matched: "title" };
        }
        return null;
      })
      .filter((h): h is SearchHit => h !== null);

    const pipelineHits: SearchHit[] = allPipelines
      .filter((p) => canViewPipeline(user, p, allCustomers))
      .map<SearchHit | null>((p) => {
        const cust = allCustomers.find((c) => c.id === p.customerId);
        if (contains(p.vehicleNo)) {
          return { kind: "pipeline", id: p.id, title: `🚗 ${p.vehicleNo}`, subtitle: cust ? `${cust.name} · ${p.product}` : p.product, matched: "vehicleNo" };
        }
        if (contains(p.vehicleVin)) {
          return { kind: "pipeline", id: p.id, title: `🚗 차대 ${p.vehicleVin}`, subtitle: cust ? `${cust.name} · ${p.product}` : p.product, matched: "vehicleVin" };
        }
        if (cust && contains(cust.name)) {
          return { kind: "pipeline", id: p.id, title: `${cust.name} · ${p.product}`, subtitle: `단계 ${p.currentStage}/${p.stages.length}`, matched: "customerName" };
        }
        return null;
      })
      .filter((h): h is SearchHit => h !== null);

    return {
      customers: customerHits,
      tasks: taskHits,
      pipelines: pipelineHits,
      total: customerHits.length + taskHits.length + pipelineHits.length,
    };
  },
};
