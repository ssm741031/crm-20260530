/* LoginPage (B안 + 무한 루프 방지)
 * - 자동 ssoLogin 제거 (AuthContext 가 마운트 시 1회 자동 시도)
 * - 로그아웃 후엔 "지금 진입 시도" 버튼으로 사용자 명시적 재시도
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import "./LoginPage.css";

const GOBOHEOM_URL = "https://goboheom.com/";

export default function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [tryingSso, setTryingSso] = useState(false);

  // user 있으면 /tasks 로 자동 이동 (다른 경로에서 user 채워졌을 때)
  useEffect(() => {
    if (user) navigate("/tasks", { replace: true });
  }, [user, navigate]);

  const handleEnter = async () => {
    if (tryingSso) return;
    setError("");
    setTryingSso(true);
    try {
      const res = await login("", ""); // ssoLogin (id/pw 무시)
      if (!res.ok) {
        setError(res.error || "고보험 로그인 후 다시 시도하세요.");
      }
      // 성공 시 user state 업데이트 → 위 useEffect 가 /tasks 이동
    } finally {
      setTryingSso(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <h1 className="login-title">사내 CRM</h1>
        <p className="login-subtitle">
          고보험 로그인 후 헤더의 <strong>사내CRM</strong> 버튼으로 진입하세요.
        </p>
        <ol className="login-steps">
          <li>
            <a href={GOBOHEOM_URL}>고보험 사이트</a>에서 로그인
          </li>
          <li>화면 상단의 <strong>사내CRM ↗</strong> 클릭</li>
          <li>화이트리스트(사내 사용자)에 등록된 휴대폰이면 자동 진입</li>
        </ol>
        {error ? <div className="login-error">{error}</div> : null}
        <div className="login-actions">
          <button
            type="button"
            className="login-submit"
            onClick={handleEnter}
            disabled={tryingSso}
          >
            {tryingSso ? "진입 시도 중…" : "지금 진입 시도"}
          </button>
          <a
            href={GOBOHEOM_URL}
            className="login-secondary"
            style={{ display: "block", textAlign: "center", marginTop: 8, fontSize: 13 }}
          >
            고보험으로 이동
          </a>
        </div>
        <p className="login-hint" style={{ marginTop: 16 }}>
          "접근 권한이 없습니다" 메시지가 뜨면 관리자에게 휴대폰 등록을 요청하세요.
        </p>
      </div>
    </div>
  );
}
