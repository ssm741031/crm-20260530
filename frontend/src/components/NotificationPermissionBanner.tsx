/* 알림 권한 요청 배너 (Sprint 14 + Sprint 19 iOS 안내)
 * 권한 default 일 때만 표시. AppShell 헤더 아래.
 * Sprint 19: iOS 사용자에겐 "홈 화면 추가 필요" 문구 추가 (PWA 설치 안 하면 백그라운드 푸시 불가)
 */
import { useState } from "react";
import { useNotification } from "../hooks/useNotification";
import "./NotificationPermissionBanner.css";

// iOS Safari / iPadOS 감지 (PWA 설치 전엔 Notification API 자체가 없음 → 'unsupported')
function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  // iPad on iPadOS 13+ 는 Mac 처럼 보이지만 touch 지원 + maxTouchPoints 로 구분
  const iOSDevice = /iPad|iPhone|iPod/.test(ua);
  const iPadOS = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  return iOSDevice || iPadOS;
}

// PWA(standalone) 모드 감지
function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window.navigator as any).standalone === true
  );
}

export default function NotificationPermissionBanner() {
  const { permission, requestPermission } = useNotification();
  const [dismissed, setDismissed] = useState(false);

  const ios = isIOS();
  const standalone = isStandalone();

  // iOS + PWA 미설치 → 알림 API 자체가 없음 → 'unsupported' 인 상태에서도 안내 띄움
  const showIOSGuide = ios && !standalone && (permission === "unsupported" || permission === "default");

  // default 가 아니면 표시 안 함 (단 iOS 미설치 케이스는 위에서 처리)
  if (!showIOSGuide && (permission !== "default" || dismissed)) return null;
  if (dismissed) return null;

  const handleAllow = async () => {
    const result = await requestPermission();
    if (result === "denied") {
      // 거부 후엔 같은 세션에선 더 안 묻기
      setDismissed(true);
    }
    // granted 면 permission 자체가 바뀌어 자동 숨김
  };

  // iOS PWA 미설치 안내 (Sprint 19)
  if (showIOSGuide) {
    return (
      <div className="notif-banner">
        <span className="notif-banner__icon" aria-hidden="true">📲</span>
        <span className="notif-banner__text">
          백그라운드 알림은 <strong>홈 화면 추가</strong> 후 사용 가능합니다.
          Safari 공유 버튼 → "홈 화면에 추가" → 추가된 앱에서 다시 열어주세요.
        </span>
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

  return (
    <div className="notif-banner">
      <span className="notif-banner__icon" aria-hidden="true">🔔</span>
      <span className="notif-banner__text">
        할 일 알람을 OS 알림으로 받으려면 권한이 필요합니다.
        {ios ? " (백그라운드 알림은 홈 화면 추가 후 가능)" : ""}
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
