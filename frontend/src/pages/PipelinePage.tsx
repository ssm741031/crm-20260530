import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import type { Customer, Pipeline, PipelineProduct, Stage } from "../types";
import {
  PRODUCT_LIST,
  effectiveDue,
  isAutoProduct,
  isOverdue,
  ruleLabel,
} from "../utils/pipeline";
import { PIPELINE_TEMPLATES } from "../utils/pipeline";
import { todayIso } from "../utils/calendar";
import "./PipelinePage.css";

export default function PipelinePage() {
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // 새 청약 폼
  const [showNew, setShowNew] = useState(false);
  const [newCustomer, setNewCustomer] = useState("");
  const [newProduct, setNewProduct] = useState<PipelineProduct>("장기보험");
  const [newMaturity, setNewMaturity] = useState("");
  const [newVehicle, setNewVehicle] = useState("");

  // 연장 폼 (현재 단계)
  const [extendNo, setExtendNo] = useState<number | null>(null);
  const [extReason, setExtReason] = useState("");
  const [extDays, setExtDays] = useState(3);

  function refresh() {
    return api.getPipelines().then(setPipelines);
  }
  useEffect(() => {
    Promise.all([api.getPipelines(), api.getCustomers()]).then(([p, cu]) => {
      setPipelines(p);
      setCustomers(cu);
      setLoading(false);
    });
  }, []);

  const custName = (id: string) =>
    customers.find((c) => c.id === id)?.name ?? "(고객)";

  const selected = useMemo(
    () => pipelines.find((p) => p.id === selectedId) ?? null,
    [pipelines, selectedId]
  );

  function progress(p: Pipeline) {
    const done = p.stages.filter((s) => s.done).length;
    return { done, total: p.stages.length };
  }

  function handleComplete(p: Pipeline, stageNo: number) {
    api.completeStage(p.id, stageNo, todayIso()).then(refresh);
  }
  function submitExtend(p: Pipeline, stageNo: number) {
    if (!extReason.trim()) return; // 사유 없는 연장 금지(§3.2)
    api.extendStage(p.id, stageNo, extReason, extDays).then(() => {
      refresh();
      setExtendNo(null);
      setExtReason("");
      setExtDays(3);
    });
  }
  function startNew() {
    if (!newCustomer) return;
    api
      .createPipeline({
        customerId: newCustomer,
        product: newProduct,
        maturityDate: newProduct === "자동차갱신" ? newMaturity || null : null,
        vehicleNo: isAutoProduct(newProduct) ? newVehicle.trim() || null : null,
      })
      .then(refresh)
      .then(() => {
        setShowNew(false);
        setNewCustomer("");
        setNewMaturity("");
        setNewVehicle("");
      });
  }

  if (loading) return <p className="muted">불러오는 중…</p>;

  // ===== 상세 =====
  if (selected) return renderDetail(selected);

  // ===== 목록 =====
  return (
    <div className="pl">
      <div className="page-head">
        <p className="muted">청약 {pipelines.length}건 (목 데이터)</p>
        <button className="btn btn--primary" onClick={() => setShowNew((v) => !v)}>
          + 새 청약
        </button>
      </div>

      {showNew && (
        <div className="pl-new">
          <div className="field-row">
            <label className="field">
              <span className="field__label">고객</span>
              <select
                className="field__input"
                value={newCustomer}
                onChange={(e) => setNewCustomer(e.target.value)}
              >
                <option value="">— 고객 선택 —</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="field__label">상품 (단계 템플릿)</span>
              <select
                className="field__input"
                value={newProduct}
                onChange={(e) => setNewProduct(e.target.value as PipelineProduct)}
              >
                {PRODUCT_LIST.map((p) => (
                  <option key={p} value={p}>
                    {p} ({PIPELINE_TEMPLATES[p].length}단계)
                  </option>
                ))}
              </select>
            </label>
            {isAutoProduct(newProduct) && (
              <label className="field">
                <span className="field__label">차량번호</span>
                <input
                  className="field__input"
                  placeholder="예: 12가 3456"
                  value={newVehicle}
                  onChange={(e) => setNewVehicle(e.target.value)}
                />
              </label>
            )}
            {newProduct === "자동차갱신" && (
              <label className="field">
                <span className="field__label">만기일 (역산 기준)</span>
                <input
                  type="date"
                  className="field__input"
                  value={newMaturity}
                  onChange={(e) => setNewMaturity(e.target.value)}
                />
              </label>
            )}
          </div>
          <div className="pl-new__foot">
            <button className="btn" onClick={() => setShowNew(false)}>
              취소
            </button>
            <button
              className="btn btn--primary"
              onClick={startNew}
              disabled={
                !newCustomer ||
                (newProduct === "자동차갱신" && !newMaturity) ||
                (isAutoProduct(newProduct) && !newVehicle.trim())
              }
            >
              청약 시작
            </button>
          </div>
        </div>
      )}

      <ul className="card-list">
        {pipelines.map((p) => {
          const { done, total } = progress(p);
          const overdue = p.stages.some((s) => isOverdue(s));
          return (
            <li
              key={p.id}
              className="card card--click"
              onClick={() => setSelectedId(p.id)}
            >
              <div className="pl-row">
                <div>
                  <div className="pl-row__title">
                    {custName(p.customerId)} · {p.product}
                    {p.vehicleNo ? ` · 🚗 ${p.vehicleNo}` : ""}
                  </div>
                  <div className="pl-bar">
                    <div
                      className="pl-bar__fill"
                      style={{ width: `${(done / total) * 100}%` }}
                    />
                  </div>
                  <div className="muted pl-row__sub">
                    {done}/{total} 단계 · 현재 {p.stages[p.currentStage - 1]?.name ?? "—"}
                  </div>
                </div>
                <span
                  className={
                    "pl-status" +
                    (p.status === "완료" ? " is-done" : overdue ? " is-late" : "")
                  }
                >
                  {p.status === "완료" ? "완료" : overdue ? "지연" : "진행중"}
                </span>
              </div>
            </li>
          );
        })}
      </ul>

      <p className="pl__note">
        🔜 마감 임박/초과 실제 알림(푸시)·SLA 기준시간 편집·병목 분석은 다음 단계 / 서버 연결 후.
      </p>
    </div>
  );

  // ===== 상세 렌더 =====
  function renderDetail(p: Pipeline) {
    const { done, total } = progress(p);
    return (
      <div className="pl">
        <div className="page-head">
          <button className="btn" onClick={() => setSelectedId(null)}>
            ← 목록
          </button>
          <span className="modal__spacer" />
          <span
            className={
              "pl-status" +
              (p.status === "완료"
                ? " is-done"
                : p.stages.some((s) => isOverdue(s))
                ? " is-late"
                : "")
            }
          >
            {p.status}
          </span>
        </div>

        <h2 className="pl-detail__title">
          {custName(p.customerId)} · {p.product}
          {p.vehicleNo ? ` · 🚗 ${p.vehicleNo}` : ""}
        </h2>
        <div className="pl-bar pl-bar--lg">
          <div
            className="pl-bar__fill"
            style={{ width: `${(done / total) * 100}%` }}
          />
        </div>
        <p className="muted">
          {done}/{total} 단계 완료
          {p.maturityDate && (
            <span className="pl-maturity">
              {" · "}🔴 만기일 {p.maturityDate} (하드 데드라인 — 초과 시 무보험 공백)
            </span>
          )}
        </p>

        <ol className="pl-stages">
          {p.stages.map((s) => renderStage(p, s))}
        </ol>

        {p.delays.length > 0 && (
          <div className="pl-delays">
            <div className="field__label">지연 기록</div>
            {p.delays.map((d, i) => (
              <div key={i} className="pl-delay">
                {s_label(p, d.stageNo)} · +{d.days}일 · {d.reason}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  function s_label(p: Pipeline, stageNo: number) {
    return p.stages.find((s) => s.stageNo === stageNo)?.name ?? `${stageNo}단계`;
  }

  function renderStage(p: Pipeline, s: Stage) {
    const isCurrent = !s.done && s.stageNo === p.currentStage;
    const overdue = isOverdue(s);
    const due = effectiveDue(s);
    const tpl = PIPELINE_TEMPLATES[p.product][s.stageNo - 1];
    return (
      <li
        key={s.id}
        className={
          "pl-stage" +
          (s.done ? " is-done" : "") +
          (isCurrent ? " is-current" : "") +
          (overdue ? " is-late" : "")
        }
      >
        <div className="pl-stage__no">{s.done ? "✓" : s.stageNo}</div>
        <div className="pl-stage__body">
          <div className="pl-stage__name">{s.name}</div>
          <div className="pl-stage__meta muted">
            {ruleLabel(tpl.rule)}
            {s.done
              ? ` · 완료 ${s.doneAt}`
              : due
              ? ` · 마감 ${due}${s.extendedDueAt ? " (연장됨)" : ""}`
              : tpl.rule.kind === "manual"
              ? " · 요청일 입력 필요"
              : " · 마감 미정"}
            {overdue && <span className="pl-late-badge">지연</span>}
          </div>

          {isCurrent && (
            <div className="pl-stage__actions">
              <button
                className="btn btn--primary btn--sm"
                onClick={() => handleComplete(p, s.stageNo)}
              >
                단계 완료
              </button>
              <button
                className="btn btn--sm"
                onClick={() =>
                  setExtendNo(extendNo === s.stageNo ? null : s.stageNo)
                }
              >
                연장
              </button>
            </div>
          )}

          {isCurrent && extendNo === s.stageNo && (
            <div className="pl-extend">
              <input
                className="field__input"
                placeholder="지연 사유 (예: 고객 응답 지연)"
                value={extReason}
                onChange={(e) => setExtReason(e.target.value)}
              />
              <input
                type="number"
                min={1}
                className="field__input pl-extend__days"
                value={extDays}
                onChange={(e) => setExtDays(Math.max(1, Number(e.target.value)))}
              />
              <span className="muted">일</span>
              <button
                className="btn btn--primary btn--sm"
                onClick={() => submitExtend(p, s.stageNo)}
                disabled={!extReason.trim()}
              >
                적용
              </button>
            </div>
          )}
        </div>
      </li>
    );
  }
}
