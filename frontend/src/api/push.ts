/* Sprint 19: Web Push 구독 API
 * - getVapidPublicKey: 서버에서 VAPID 공개키 가져옴
 * - subscribePush: 현재 권한 + SW 등록 상태에서 pushManager.subscribe → 서버 저장
 * - unsubscribePush: 서버 + 로컬 모두 해제
 */
const API_BASE = "/api/crm/push";

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
      /* noop */
    }
    throw new Error(`Push ${path}: ${msg}`);
  }
  return res.json() as Promise<T>;
}

// Base64URL → Uint8Array (web push applicationServerKey 요구사항)
// TS 6 의 좁은 ArrayBuffer 타이핑 회피를 위해 명시적 ArrayBuffer 백킹
function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const buf = new ArrayBuffer(raw.length);
  const out = new Uint8Array(buf);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export async function getVapidPublicKey(): Promise<string> {
  const r = await http<{ key: string }>("/vapid-public-key");
  return r.key;
}

export async function subscribePush(): Promise<boolean> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return false;
  }
  if (Notification.permission !== "granted") return false;

  const reg = await navigator.serviceWorker.ready;
  const existing = await reg.pushManager.getSubscription();

  // 이미 구독돼있다면 그 endpoint 를 서버에 다시 등록(다중기기 또는 첫 등록 누락 대비)
  const sub = existing || await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(await getVapidPublicKey()),
  });

  const j = sub.toJSON();
  await http("/subscribe", {
    method: "POST",
    body: JSON.stringify({
      endpoint: j.endpoint,
      keys: j.keys,
      userAgent: navigator.userAgent,
    }),
  });
  return true;
}

export async function unsubscribePush(): Promise<void> {
  if (!("serviceWorker" in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (!sub) return;
    await http("/unsubscribe", {
      method: "POST",
      body: JSON.stringify({ endpoint: sub.endpoint }),
    }).catch(() => undefined);
    await sub.unsubscribe();
  } catch (e) {
    console.warn("[push] unsubscribe failed", e);
  }
}
