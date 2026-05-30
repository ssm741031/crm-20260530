import { useEffect, useState } from "react";
import { api } from "../api";
import type { Customer } from "../types";
import { maskPhone } from "../utils/mask";
import "./page.css";

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getCustomers().then((data) => {
      setCustomers(data);
      setLoading(false);
    });
  }, []);

  if (loading) return <p className="muted">불러오는 중…</p>;

  return (
    <div>
      <p className="muted">고객 {customers.length}명 (목 데이터)</p>
      <ul className="card-list">
        {customers.map((c) => (
          <li key={c.id} className="card">
            <div className="card__main">
              <div>
                <div className="card__title">{c.name}</div>
                <div className="card__sub">
                  {/* 연락처는 부분 마스킹 (계획서 §8.5) */}
                  {maskPhone(c.phone)} · {c.product} · {c.status}
                </div>
              </div>
            </div>
            <div className="card__sub">
              갱신일 {c.renewalDate ?? "-"} · 문자동의 {c.consent.smsConsent}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
