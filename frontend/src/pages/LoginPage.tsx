/* LoginPage (B안: 고보험 SSO 안내 페이지)
 * id/pw 폼 제거 — 고보험에서 로그인하고 사내CRM 버튼으로 진입하라는 안내
 */
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import * as authApi from "../api/auth";
import "./LoginPage.css";

const GOBOHEOM_URL = "https://goboheom.com/";

export default function LoginPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // 이미 로그인된 상태면 /tasks 로
  useEffect(() => {
    if (user) navigate("/tasks", { replace: true });
  }, [user, navigate]);

  // 페이지 진입 시 SSO 자동 시도 (고보험 토큰이 있는 경우)
  useEffect(() => {
    let cancelled = false;
    authApi.ssoLogin().then((u) => {
      if (cancelled) return;
      if (u) navigate("/tasks", { replace: true });
    });
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <div className="login-page">
      <div className="login-card">
        <h1 className="login-title">사내 CRM</h1>
        <p className="login-subtitle">
          고보험 로그인 후 헤더의 <strong>사내CRM</strong> 버튼으로 진입하세요.
        </p>
        <ol className="login-steps">
          <li>
            <a href={GOBOHEOM_URL} target="_blank" rel="noopener noreferrer">
              고보험 사이트
            </a>
            에서 로그인
          </li>
          <li>화면 상단의 <strong>사내CRM ↗</strong> 클릭</li>
          <li>화이트리스트(사내 사용자)에 등록된 휴대폰이면 자동 진입</li>
        </ol>
        <div className="login-actions">
          <a
            href={GOBOHEOM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="login-submit"
            style={{ textDecoration: "none", textAlign: "center", display: "block" }}
          >
            고보험으로 이동
          </a>
        </div>
        <p className="login-hint" style={{ marginTop: 16 }}>
          접근 권한이 없다는 메시지가 뜬다면 관리자에게 문의 (휴대폰번호 등록 필요).
        </p>
      </div>
    </div>
  );
}
