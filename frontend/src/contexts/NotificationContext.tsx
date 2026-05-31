/* ============================================================
   NotificationContext (Sprint 14 — 알람 Phase 1)

   - 권한 상태 관리 (default | granted | denied)
   - Task.reminders 도래 시 OS 알림(Notification) 또는 in-app 토스트
   - 페이지 단위 스케줄러: tasks 변화 감지 → setTimeout 등록/clear
   - dedup: (taskId, reminderIdx) 키로 한 세션에 한 번만 발사
   ============================================================ */
import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../hooks/useAuth";
import {
  buildReminderText,
  computeAllUpcoming,
  reminderKey,
  type UpcomingReminder,
} from "../utils/reminders";

export type PermissionState = "default" | "granted" | "denied" | "unsupported";

export interface ToastItem {
  id: number;
  title: string;
  body: string;
  taskId?: string;
}

export interface NotificationContextValue {
  permission: PermissionState;
  requestPermission: () => Promise<PermissionState>;
  /** 현재 토스트 큐 + 닫기 */
  toasts: ToastItem[];
  dismissToast: (id: number) => void;
}

export const NotificationContext = createContext<NotificationContextValue | null>(null);

function detectPermission(): PermissionState {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  return window.Notification.permission as PermissionState;
}

let _toastSeq = 1;

export function NotificationProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [permission, setPermission] = useState<PermissionState>(detectPermission);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  // 발사된 알람 dedup (페이지 세션 단위)
  const firedRef = useRef<Set<string>>(new Set());
  // 등록된 setTimeout id 들 (cleanup 용)
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // ── 토스트 enqueue / dismiss ──
  const enqueueToast = useCallback((title: string, body: string, taskId?: string) => {
    const id = _toastSeq++;
    setToasts((prev) => [...prev, { id, title, body, taskId }]);
    // 5초 후 자동 닫기
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // ── 권한 요청 ──
  const requestPermission = useCallback(async (): Promise<PermissionState> => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return "unsupported";
    }
    try {
      const result = await window.Notification.requestPermission();
      const state = result as PermissionState;
      setPermission(state);
      return state;
    } catch {
      return "denied";
    }
  }, []);

  // ── 알람 발사 ──
  const fireReminder = useCallback(
    (upcoming: UpcomingReminder) => {
      const key = reminderKey(upcoming.taskId, upcoming.reminderIdx);
      if (firedRef.current.has(key)) return;
      firedRef.current.add(key);

      const { title, body } = buildReminderText(upcoming);

      if (permission === "granted" && typeof window !== "undefined" && "Notification" in window) {
        try {
          const notif = new window.Notification(title, {
            body,
            tag: key,         // 같은 키 알림 덮어쓰기 (브라우저 표준)
            requireInteraction: false,
          });
          notif.onclick = () => {
            window.focus();
            navigate(`/tasks?focus=${encodeURIComponent(upcoming.taskId)}`);
            notif.close();
          };
        } catch (err) {
          console.warn("[notification] failed, fallback to toast:", err);
          enqueueToast(title, body, upcoming.taskId);
        }
      } else {
        // 권한 default/denied/unsupported → toast fallback
        enqueueToast(title, body, upcoming.taskId);
      }
    },
    [permission, navigate, enqueueToast],
  );

  // ── 스케줄러: tasks 변화 시 setTimeout 재등록 ──
  useEffect(() => {
    if (!user) {
      // 비로그인이면 스케줄링 X (RequireAuth 가 있지만 안전 가드)
      timersRef.current.forEach((id) => clearTimeout(id));
      timersRef.current.clear();
      return;
    }

    let cancelled = false;

    const schedule = async () => {
      const tasks = await api.getTasks();
      if (cancelled) return;

      // 기존 타이머 모두 클리어 (재스케줄)
      timersRef.current.forEach((id) => clearTimeout(id));
      timersRef.current.clear();

      const upcoming = computeAllUpcoming(tasks);
      const now = Date.now();
      upcoming.forEach((u) => {
        const key = reminderKey(u.taskId, u.reminderIdx);
        if (firedRef.current.has(key)) return;
        const delay = Math.max(0, u.fireAt.getTime() - now);
        // setTimeout 은 ~24.8일(2^31ms) 한도 — 그보다 멀면 skip (다음 재진입 시 잡힘)
        if (delay > 2_000_000_000) return;
        const tid = setTimeout(() => fireReminder(u), delay);
        timersRef.current.set(key, tid);
      });
    };

    schedule();

    return () => {
      cancelled = true;
      timersRef.current.forEach((id) => clearTimeout(id));
      timersRef.current.clear();
    };
  }, [user, fireReminder]);

  const value = useMemo<NotificationContextValue>(
    () => ({ permission, requestPermission, toasts, dismissToast }),
    [permission, requestPermission, toasts, dismissToast],
  );

  return (
    <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>
  );
}
