/* useNotification — NotificationContext wrapper (Sprint 14) */
import { useContext } from "react";
import { NotificationContext } from "../contexts/NotificationContext";
import type { NotificationContextValue } from "../contexts/NotificationContext";

export function useNotification(): NotificationContextValue {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error("useNotification must be used within <NotificationProvider>");
  }
  return ctx;
}
