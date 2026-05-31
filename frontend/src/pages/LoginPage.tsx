/* LoginPage (Sprint 13)
 * mock 로그인 폼 — DEV ONLY 안내 포함
 * 로그인 성공 시 from 으로 이동 (없으면 /tasks)
 */
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import "./LoginPage.css";

interface FromState {
  from?: string;
}

export default function LoginPage() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as FromState | null)?.from || "/tasks";

  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // 이미 로그인 상태면 from 으로 이동 (함수 본체에서 navigate 호출은 안티패턴 → useEffect)
  useEffect(() => {
    if (user) {
      navigate(from, { replace: true });
    }
  }, [user, from, navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError("");
    setSubmitting(true);
    try {
      const result = await login(loginId.trim(), password);
      if (result.ok) {
        navigate(from, { replace: true });
      } else {
        setError(result.error || "로그인에 실패했습니다.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <h1 className="login-title">사내 CRM 로그인</h1>
        <p className="login-subtitle">
          ⚠️ <strong>DEV mock</strong> — 백엔드 완성 전 임시 인증입니다.
        </p>
        <form onSubmit={handleSubmit} className="login-form">
          <label className="login-field">
            <span className="login-field__label">아이디</span>
            <input
              type="text"
              autoComplete="username"
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              placeholder="예: sales1"
              required
              autoFocus
              className="login-input"
            />
          </label>
          <label className="login-field">
            <span className="login-field__label">비밀번호</span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="DEV: 1234"
              required
              className="login-input"
            />
          </label>
          {error ? <div className="login-error">{error}</div> : null}
          <button
            type="submit"
            className="login-submit"
            disabled={submitting || !loginId || !password}
          >
            {submitting ? "로그인 중…" : "로그인"}
          </button>
        </form>
        <div className="login-hint">
          <p className="login-hint__title">DEV 계정 (모두 pw: 1234)</p>
          <ul className="login-hint__list">
            <li><code>boss</code> — 대표 (전체 권한)</li>
            <li><code>lead1</code> — 김팀장</li>
            <li><code>sales1</code> — 이영업 (팀원)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
