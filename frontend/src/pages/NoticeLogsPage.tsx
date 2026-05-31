import { useEffect, useState } from "react";
import { api } from "../api";
import type { Customer, NoticeLog, Pipeline, User } from "../types";
import "./page.css";
import "../components/NoticeLogPanel.css";

function fmt(iso: string): string {
  return iso.replace("T", " ").slice(0, 16);
}

/** 안내 기록 모아보기 (계획서 §2.4-b) — 전체 안내 기록을 한 화면에서 조회·메모 수정·삭제 */
export default function NoticeLogsPage() {
  const [logs, setLogs] = useState<NoticeLog[]>([]);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // 메모 인라인 수정
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editMemo, setEditMemo] = useState("");

  function refresh() {
    return api.getNoticeLogs().then(setLogs);
  }

  useEffect(() => {
    Promise.all([
      api.getNoticeLogs(),
      api.getPipelines(),
      api.getCustomers(),
      api.getUsers(),
    ]).then(([nl, p, cu, us]) => {
      setLogs(nl);
      setPipelines(p);
      setCustomers(cu);
      setUsers(us);
      setLoading(false);
    });
  }, []);

  const userName = (id: string) =>
    users.find((u) => u.id === id)?.name ?? "(직원)";

  // 안내가 어느 고객·상품·단계인지 라벨
  function context(n: NoticeLog): string {
    const p = pipelines.find((x) => x.id === n.pipelineId);
    if (!p) return `${n.stageNo}단계`;
    const cust = customers.find((c) => c.id === p.customerId)?.name ?? "(고객)";
    const stage = p.stages.find((s) => s.stageNo === n.stageNo)?.name ?? `${n.stageNo}단계`;
    return `${cust} · ${p.product} · ${stage}`;
  }

  function startEdit(n: NoticeLog) {
    setEditingId(n.id);
    setEditMemo(n.memo);
  }
  function saveEdit() {
    if (!editingId || !editMemo.trim()) return;
    api.updateNoticeLog(editingId, editMemo).then(refresh).then(() => {
      setEditingId(null);
      setEditMemo("");
    });
  }
  function remove(id: string) {
    if (!window.confirm("이 안내 기록을 삭제할까요?")) return;
    api.deleteNoticeLog(id).then(refresh);
  }

  if (loading) return <p className="muted">불러오는 중…</p>;

  return (
    <div>
      <p className="muted">
        안내 기록 {logs.length}건 (목 데이터) · 단계에서 보낸 안내를 모아봅니다
      </p>

      {logs.length === 0 ? (
        <p className="muted">아직 안내 기록이 없습니다. 파이프라인 단계에서 추가하세요.</p>
      ) : (
        <ul className="card-list">
          {logs.map((n) => (
            <li key={n.id} className="card">
              <div className="card__main" style={{ flex: 1, alignItems: "flex-start" }}>
                <span className={"nl__ch nl__ch--" + n.channel}>{n.channel}</span>
                <div style={{ flex: 1 }}>
                  {editingId === n.id ? (
                    <div className="nl__add">
                      <input
                        className="field__input"
                        autoFocus
                        value={editMemo}
                        onChange={(e) => setEditMemo(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveEdit();
                          if (e.key === "Escape") setEditingId(null);
                        }}
                      />
                      <button className="btn btn--primary btn--sm" onClick={saveEdit}>
                        저장
                      </button>
                      <button className="btn btn--sm" onClick={() => setEditingId(null)}>
                        취소
                      </button>
                    </div>
                  ) : (
                    <div className="card__title" style={{ fontWeight: 500 }}>
                      {n.memo}
                    </div>
                  )}
                  <div className="card__sub">
                    {context(n)} · {fmt(n.sentAt)} · {userName(n.createdBy)}
                  </div>
                </div>
              </div>
              {editingId !== n.id && (
                <div className="tags">
                  <button className="btn btn--sm" onClick={() => startEdit(n)}>
                    수정
                  </button>
                  <button className="btn btn--sm btn--danger" onClick={() => remove(n.id)}>
                    삭제
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
