import { useState } from "react";
import type { Consent, ConsentState, Customer } from "../types";
import { maskPhone } from "../utils/mask";
import "./ConsentForm.css";

interface Props {
  customer: Customer;
  onSave: (customerId: string, consent: Consent) => void;
  onClose: () => void;
}

const STATES: ConsentState[] = ["동의", "거부", "미확인"];

/** 고객 수신동의 편집 모달 (계획서 §2.4-c)
 *  ⚠️ 신규/미설정은 "미확인" 유지 — 함부로 "동의"로 만들지 않음(정보통신망법 근거). */
export default function ConsentForm({ customer, onSave, onClose }: Props) {
  const [sms, setSms] = useState<ConsentState>(customer.consent.smsConsent);
  const [kakao, setKakao] = useState<ConsentState>(customer.consent.kakaoConsent);
  const [date, setDate] = useState(customer.consent.consentDate ?? "");

  function handleSave() {
    // 둘 중 하나라도 '동의'인데 동의일이 없으면 오늘로 자동 기록
    const anyAgree = sms === "동의" || kakao === "동의";
    const consentDate = anyAgree ? date || new Date().toISOString().slice(0, 10) : date || null;
    onSave(customer.id, {
      smsConsent: sms,
      kakaoConsent: kakao,
      consentDate: consentDate || null,
    });
  }

  return (
    <div className="modal" onClick={onClose}>
      <div className="modal__panel modal__panel--sm" onClick={(e) => e.stopPropagation()}>
        <div className="modal__head">
          <h2>수신동의 — {customer.name}</h2>
          <button className="modal__x" onClick={onClose} aria-label="닫기">
            ✕
          </button>
        </div>

        <div className="form">
          <p className="muted" style={{ marginBottom: 0 }}>
            {maskPhone(customer.phone)} · 광고성 정보 발송 시 사전 수신동의 필수(정보통신망법)
          </p>

          {/* 문자 */}
          <div className="field">
            <span className="field__label">문자(SMS) 수신동의</span>
            <div className="seg">
              {STATES.map((s) => (
                <button
                  key={s}
                  type="button"
                  className={"seg__btn" + (sms === s ? " seg__btn--on" : "")}
                  onClick={() => setSms(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* 카톡 */}
          <div className="field">
            <span className="field__label">카카오톡 수신동의</span>
            <div className="seg">
              {STATES.map((s) => (
                <button
                  key={s}
                  type="button"
                  className={"seg__btn" + (kakao === s ? " seg__btn--on" : "")}
                  onClick={() => setKakao(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* 동의일 */}
          <label className="field">
            <span className="field__label">동의 받은 날짜</span>
            <input
              type="date"
              className="field__input"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
        </div>

        <div className="modal__foot">
          <span className="modal__spacer" />
          <button className="btn" onClick={onClose}>
            취소
          </button>
          <button className="btn btn--primary" onClick={handleSave}>
            저장
          </button>
        </div>
      </div>
    </div>
  );
}
