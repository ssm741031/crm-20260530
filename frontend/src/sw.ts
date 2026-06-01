/// <reference lib="webworker" />
/* Sprint 19: 커스텀 Service Worker
 * - workbox precache (자산 캐시)
 * - push 이벤트 핸들러 (백그라운드 OS 알림)
 * - notificationclick 핸들러 (알림 클릭 → /crm/tasks?focus=<id>)
 *
 * vite-plugin-pwa injectManifest 모드:
 * - self.__WB_MANIFEST 가 빌드 시 자동 주입됨
 * - precacheAndRoute 로 자산 캐시
 */
import {
  precacheAndRoute,
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
} from "workbox-precaching";
import { NavigationRoute, registerRoute } from "workbox-routing";

declare const self: ServiceWorkerGlobalScope;

// ===== Precache =====
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST || []);

// SPA fallback — /crm/tasks 같은 클라이언트 라우트 새로고침 시 index.html
const navHandler = createHandlerBoundToURL("/crm/index.html");
const navRoute = new NavigationRoute(navHandler, {
  denylist: [/^\/api\//],
});
registerRoute(navRoute);

// ===== Skip waiting / Claim =====
self.addEventListener("install", () => {
  self.skipWaiting();
});
self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// ===== Push 핸들러 (Sprint 19 핵심) =====
self.addEventListener("push", (event) => {
  const data = (() => {
    try {
      return event.data?.json() || {};
    } catch {
      return { title: "사내 CRM", body: event.data?.text() || "" };
    }
  })();

  const title = data.title || "사내 CRM 알림";
  const options: NotificationOptions = {
    body: data.body || "",
    icon: data.icon || "/crm/icons/pwa-192x192.png",
    badge: data.badge || "/crm/icons/pwa-192x192.png",
    data: { taskId: data.taskId || null, url: data.url || null },
    tag: data.taskId ? `task-${data.taskId}` : undefined, // 같은 task 알림 중복 방지
    requireInteraction: false,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ===== Notification click =====
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const url = data.url
    ? data.url
    : data.taskId
    ? `/crm/tasks?focus=${data.taskId}`
    : "/crm/";

  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      // 이미 열린 CRM 창 있으면 focus
      for (const c of all) {
        if (c.url.includes("/crm/")) {
          c.focus();
          // navigate (postMessage 로 라우터 알림) — 단순화: 리로드
          c.navigate?.(url);
          return;
        }
      }
      await self.clients.openWindow(url);
    })()
  );
});
