import { useEffect, useState } from "react";
import { api } from "../api";
import type { Consent, Customer } from "../types";
import { maskPhone } from "../utils/mask";
import ConsentForm from "../components/ConsentForm";
import "./page.css";

/** 동의 상태에 따른 작은 색 배지 */
function consentBadge(label: string, state: string) {
  const cls =
    state === "동의"
      ? "consent-badge consent-badge--ok"
      : state === "거부"
      ? "consent-badge consent-badge--no"
      : "consent-badge";
  return <span className={cls}>{label} {state}</span>;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Customer | null>(null);

  function refresh() {
    return api.getCustomers().then(setCustomers);
  }

  useEffect(() => {
    api.getCustomers().then((data) => {
      setCustomers(data);
      setLoading(false);
    });
  }, []);

  function handleSaveConsent(customerId: string, consent: Consent) {
    api.updateConsent(customerId, consent).then(refresh).then(() => setEditing(null));
  }

  if (loading) return <p className="muted">불러오는 중…</p>;

  return (
    <div>
      <p className="muted">고객 {customers.length}명 (목 데이터) · 카드 클릭 → 수신동의 편집</p>
      <ul className="card-list">
        {customers.map((c) => (
          <li
            key={c.id}
            className="card card--click"
            onClick={() => setEditing(c)}
          >
            <div className="card__main">
              <div>
                <div className="card__title">{c.name}</div>
                <div className="card__sub">
                  {/* 연락처는 부분 마스킹 (계획서 §8.5) */}
                  {maskPhone(c.phone)} · {c.product} · {c.status}
                </div>
              </div>
            </div>
            <div className="card__sub consent-row">
              <span>갱신일 {c.renewalDate ?? "-"}</span>
              {consentBadge("문자", c.consent.smsConsent)}
              {consentBadge("카톡", c.consent.kakaoConsent)}
            </div>
          </li>
        ))}
      </ul>

      {editing && (
        <ConsentForm
          customer={editing}
          onSave={handleSaveConsent}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
