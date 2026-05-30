import { useMemo, useState } from "react";
import type { TaskInput } from "../api";
import type { Category, Customer, Task, TimeType } from "../types";
import { TIME_OPTIONS, toSortKey } from "../utils/time";
import "./TaskForm.css";

interface Props {
  task: Task | null; // null = 새로 만들기, 값 있으면 수정
  categories: Category[];
  customers: Customer[];
  onSave: (input: TaskInput, id: string | null) => void;
  onClose: () => void;
  onDelete: (id: string) => void;
}

const DEFAULT_CATEGORY = "c0";

export default function TaskForm({
  task,
  categories,
  customers,
  onSave,
  onClose,
  onDelete,
}: Props) {
  const isEdit = task !== null;

  // ----- 폼 상태 (수정이면 기존 값, 새로 만들기면 기본값) -----
  const [title, setTitle] = useState(task?.title ?? "");
  const [customerId, setCustomerId] = useState<string | null>(
    task?.customerId ?? null
  );
  const [categoryId, setCategoryId] = useState(task?.categoryId ?? DEFAULT_CATEGORY);
  const [timeType, setTimeType] = useState<TimeType>(task?.timeType ?? "deadline");
  const [startDate, setStartDate] = useState(task?.startDate ?? "");
  const [startTime, setStartTime] = useState(task?.startTime ?? "09:00");
  const [endDate, setEndDate] = useState(task?.endDate ?? "");
  const [endTime, setEndTime] = useState(task?.endTime ?? "10:00");
  const [tags, setTags] = useState<string[]>(task?.tags ?? []);
  const [tagInput, setTagInput] = useState("");
  const [error, setError] = useState("");

  // 카테고리 드롭다운 옵션(부모>자식 들여쓰기)
  const catOptions = useMemo(() => {
    const parents = categories.filter((c) => c.parentId === null);
    const out: { id: string; label: string }[] = [];
    parents.forEach((p) => {
      out.push({ id: p.id, label: p.name });
      categories
        .filter((c) => c.parentId === p.id)
        .forEach((ch) => out.push({ id: ch.id, label: `— ${ch.name}` }));
    });
    return out;
  }, [categories]);

  function addTag() {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) setTags([...tags, t]);
    setTagInput("");
  }
  function removeTag(t: string) {
    setTags(tags.filter((x) => x !== t));
  }

  function handleSave() {
    if (!title.trim()) {
      setError("제목을 입력하세요.");
      return;
    }
    if (!endDate) {
      setError("마감 날짜를 선택하세요.");
      return;
    }
    if (timeType === "range") {
      if (!startDate) {
        setError("구간형은 시작 날짜를 선택하세요.");
        return;
      }
      if (toSortKey(startDate, startTime) > toSortKey(endDate, endTime)) {
        setError("시작이 종료보다 늦을 수 없습니다.");
        return;
      }
    }

    // 이번 스프린트에서 편집하지 않는 필드는 기존값(수정) 또는 기본값(생성) 유지
    const input: TaskInput = {
      customerId,
      title: title.trim(),
      categoryId,
      timeType,
      startDate: timeType === "range" ? startDate : null,
      startTime: timeType === "range" ? startTime : null,
      endDate,
      endTime,
      repeat: task?.repeat ?? "none",
      repeatDays: task?.repeatDays ?? [],
      autoRegen: task?.autoRegen ?? false,
      reminders: task?.reminders ?? [],
      tags,
      share: task?.share ?? { scope: "private", sharedWith: [], permission: {} },
      attachments: task?.attachments ?? [],
    };
    onSave(input, task?.id ?? null);
  }

  return (
    <div className="modal" onClick={onClose}>
      <div className="modal__panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal__head">
          <h2>{isEdit ? "할 일 수정" : "새 할 일"}</h2>
          <button className="modal__x" onClick={onClose} aria-label="닫기">
            ✕
          </button>
        </div>

        <div className="form">
          {/* 제목 */}
          <label className="field">
            <span className="field__label">제목 *</span>
            <input
              className="field__input"
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 홍길동 보장분석 준비"
            />
          </label>

          {/* 고객 + 카테고리 */}
          <div className="field-row">
            <label className="field">
              <span className="field__label">고객 (선택)</span>
              <select
                className="field__input"
                value={customerId ?? ""}
                onChange={(e) => setCustomerId(e.target.value || null)}
              >
                <option value="">— 없음 (일반 업무) —</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span className="field__label">카테고리</span>
              <select
                className="field__input"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
              >
                {catOptions.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {/* 시간 유형 토글 */}
          <div className="field">
            <span className="field__label">시간 유형</span>
            <div className="toggle">
              <button
                className={"toggle__btn" + (timeType === "deadline" ? " toggle__btn--on" : "")}
                onClick={() => setTimeType("deadline")}
                type="button"
              >
                마감형 (○시까지)
              </button>
              <button
                className={"toggle__btn" + (timeType === "range" ? " toggle__btn--on" : "")}
                onClick={() => setTimeType("range")}
                type="button"
              >
                구간형 (시작~종료)
              </button>
            </div>
          </div>

          {/* 구간형: 시작 */}
          {timeType === "range" && (
            <div className="field-row">
              <label className="field">
                <span className="field__label">시작 날짜</span>
                <input
                  type="date"
                  className="field__input"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </label>
              <label className="field">
                <span className="field__label">시작 시간</span>
                <select
                  className="field__input"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                >
                  {TIME_OPTIONS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}

          {/* 종료(마감) */}
          <div className="field-row">
            <label className="field">
              <span className="field__label">
                {timeType === "range" ? "종료 날짜" : "마감 날짜"} *
              </span>
              <input
                type="date"
                className="field__input"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </label>
            <label className="field">
              <span className="field__label">
                {timeType === "range" ? "종료 시간" : "마감 시간"}
              </span>
              <select
                className="field__input"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              >
                {TIME_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {/* 태그 */}
          <div className="field">
            <span className="field__label">태그</span>
            <div className="tags-edit">
              {tags.map((t) => (
                <button
                  key={t}
                  className="tag tag--removable"
                  onClick={() => removeTag(t)}
                  type="button"
                  title="클릭하면 삭제"
                >
                  #{t} ✕
                </button>
              ))}
              <input
                className="tag-input"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTag();
                  }
                }}
                placeholder="태그 입력 후 Enter"
              />
            </div>
          </div>

          {/* 다음 스프린트 자리표시 */}
          <p className="form__note">
            🔜 반복 · 알람 · 공유 · 첨부는 다음 단계에서 추가됩니다.
          </p>

          {error && <p className="form__error">{error}</p>}
        </div>

        <div className="modal__foot">
          {isEdit && (
            <button
              className="btn btn--danger"
              onClick={() => task && onDelete(task.id)}
            >
              삭제
            </button>
          )}
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
