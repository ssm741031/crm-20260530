/* in-app 토스트 (Sprint 14) — 우측 상단 스택
 * 권한 거부/미지원 환경의 알림 fallback + 일반 알림 큐 표시
 */
import { useNavigate } from "react-router-dom";
import { useNotification } from "../hooks/useNotification";
import "./ToastContainer.css";

export default function ToastContainer() {
  const { toasts, dismissToast } = useNotification();
  const navigate = useNavigate();

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container" role="region" aria-label="알림">
      {toasts.map((t) => (
        <div key={t.id} className="toast" role="alert">
          <div className="toast__body">
            <div className="toast__title">{t.title}</div>
            <div className="toast__msg">{t.body}</div>
          </div>
          <div className="toast__actions">
            {t.taskId ? (
              <button
                type="button"
                className="toast__btn"
                onClick={() => {
                  navigate(`/tasks?focus=${encodeURIComponent(t.taskId!)}`);
                  dismissToast(t.id);
                }}
              >
                보기
              </button>
            ) : null}
            <button
              type="button"
              className="toast__close"
              onClick={() => dismissToast(t.id)}
              aria-label="닫기"
            >
              ✕
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
