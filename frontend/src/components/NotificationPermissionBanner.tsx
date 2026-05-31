/* 알림 권한 요청 배너 (Sprint 14)
 * 권한 default 일 때만 표시. AppShell 헤더 아래.
 */
import { useState } from "react";
import { useNotification } from "../hooks/useNotification";
import "./NotificationPermissionBanner.css";

export default function NotificationPermissionBanner() {
  const { permission, requestPermission } = useNotification();
  const [dismissed, setDismissed] = useState(false);

  // default 가 아니면 표시 안 함 (granted = 이미 켜짐, denied = 차단, unsupported = 브라우저 미지원)
  if (permission !== "default" || dismissed) return null;

  const handleAllow = async () => {
    const result = await requestPermission();
    if (result === "denied") {
      // 거부 후엔 같은 세션에선 더 안 묻기
      setDismissed(true);
    }
    // granted 면 permission 자체가 바뀌어 자동 숨김
  };

  return (
    <div className="notif-banner">
      <span className="notif-banner__icon" aria-hidden="true">🔔</span>
      <span className="notif-banner__text">
        할 일 알람을 OS 알림으로 받으려면 권한이 필요합니다.
      </span>
      <button type="button" className="notif-banner__allow" onClick={handleAllow}>
        허용
      </button>
      <button
        type="button"
        className="notif-banner__dismiss"
        onClick={() => setDismissed(true)}
        aria-label="배너 닫기"
        title="배너 닫기"
      >
        ✕
      </button>
    </div>
  );
}
