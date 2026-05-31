import { useState } from "react";
import { api } from "../api";
import type { NoticeChannel, NoticeLog } from "../types";
import "./NoticeLogPanel.css";

const CHANNELS: NoticeChannel[] = ["문자", "카톡", "전화"];

function fmt(iso: string): string {
  // "2026-05-31T09:15:00" → "2026-05-31 09:15"
  return iso.replace("T", " ").slice(0, 16);
}

interface Props {
  pipelineId: string;
  stageNo: number;
  logs: NoticeLog[]; // 이 단계의 기록만 (부모가 필터해서 전달)
  userName: (id: string) => string;
  onChanged: () => void; // 추가/삭제 후 부모 새로고침
}

/** 한 단계의 안내 기록 — 추가 폼 + 목록. 파이프라인 단계 패널에서 사용. */
export default function NoticeLogPanel({
  pipelineId,
  stageNo,
  logs,
  userName,
  onChanged,
}: Props) {
  const [adding, setAdding] = useState(false);
  const [channel, setChannel] = useState<NoticeChannel>("문자");
  const [memo, setMemo] = useState("");

  function submit() {
    api
      .addNoticeLog({ pipelineId, stageNo, channel, memo })
      .then(() => {
        setAdding(false);
        setChannel("문자");
        setMemo("");
        onChanged();
      });
  }

  function remove(id: string) {
    if (!window.confirm("이 안내 기록을 삭제할까요?")) return;
    api.deleteNoticeLog(id).then(onChanged);
  }

  return (
    <div className="nl">
      {logs.length > 0 && (
        <ul className="nl__list">
          {logs.map((n) => (
            <li key={n.id} className="nl__item">
              <span className={"nl__ch nl__ch--" + n.channel}>{n.channel}</span>
              <span className="nl__memo">{n.memo}</span>
              <span className="nl__meta muted">
                {fmt(n.sentAt)} · {userName(n.createdBy)}
              </span>
              <button
                className="nl__del"
                title="삭제"
                onClick={() => remove(n.id)}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      {adding ? (
        <div className="nl__add">
          <div className="nl__channels">
            {CHANNELS.map((ch) => (
              <button
                key={ch}
                type="button"
                className={"seg__btn" + (channel === ch ? " seg__btn--on" : "")}
                onClick={() => setChannel(ch)}
              >
                {ch}
              </button>
            ))}
          </div>
          <input
            className="field__input"
            autoFocus
            placeholder="보낸 내용 요약 (예: 갱신 견적 안내)"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && memo.trim() && submit()}
          />
          <button className="btn btn--primary btn--sm" onClick={submit} disabled={!memo.trim()}>
            기록
          </button>
          <button className="btn btn--sm" onClick={() => setAdding(false)}>
            취소
          </button>
        </div>
      ) : (
        <button className="btn btn--sm nl__addbtn" onClick={() => setAdding(true)}>
          + 안내 기록 추가
        </button>
      )}
    </div>
  );
}
