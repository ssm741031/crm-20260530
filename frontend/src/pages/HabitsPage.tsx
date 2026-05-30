import { useEffect, useState } from "react";
import { api, type TaskInput } from "../api";
import type { Category, Customer, Task } from "../types";
import TaskForm from "../components/TaskForm";
import { REPEAT_OPTIONS } from "../utils/repeat";
import { WEEKDAY_LABELS, parseDate, todayIso, weekDates } from "../utils/calendar";
import { habitCellState, habitsOf } from "../utils/habit";
import "./HabitsPage.css";

export default function HabitsPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Task | null>(null);

  function refresh() {
    return api.getTasks().then(setTasks);
  }
  useEffect(() => {
    Promise.all([api.getTasks(), api.getCategories(), api.getCustomers()]).then(
      ([t, c, cu]) => {
        setTasks(t);
        setCategories(c);
        setCustomers(cu);
        setLoading(false);
      }
    );
  }, []);

  const catColor = (id: string) =>
    categories.find((c) => c.id === id)?.color ?? "var(--cat-default)";
  const catName = (id: string) =>
    categories.find((c) => c.id === id)?.name ?? "기본";
  const repeatLabel = (t: Task) =>
    REPEAT_OPTIONS.find((o) => o.value === t.repeat)?.label ?? "반복";

  function handleSave(input: TaskInput, id: string | null) {
    const op = id ? api.updateTask(id, input) : api.createTask(input);
    op.then(refresh).then(() => setEditing(null));
  }
  function handleDelete(id: string) {
    if (!window.confirm("이 할 일을 삭제할까요?")) return;
    api.deleteTask(id).then(refresh).then(() => setEditing(null));
  }
  function toggleToday(e: React.MouseEvent, t: Task) {
    e.stopPropagation();
    api.toggleHabitDone(t.id, new Date().toISOString()).then(refresh);
  }

  if (loading) return <p className="muted">불러오는 중…</p>;

  const habits = habitsOf(tasks);
  const today = todayIso();
  const week = weekDates(today);

  return (
    <div className="habits">
      <div className="page-head">
        <p className="muted">습관 {habits.length}개 · 반복 켜진 할 일 (목 데이터)</p>
      </div>

      {habits.length === 0 ? (
        <p className="muted">
          반복이 켜진 할 일이 없습니다. 할 일 편집폼에서 반복을 켜면 여기에 나타납니다.
        </p>
      ) : (
        <div className="habit-table">
          {/* 요일 헤더 */}
          <div className="habit-row habit-row--head">
            <div className="habit-info habit-info--head">습관</div>
            <div className="habit-week">
              {week.map((d) => (
                <div key={d} className="habit-wd">
                  {WEEKDAY_LABELS[parseDate(d).getDay()]}
                  <span className="habit-wd__n">{parseDate(d).getDate()}</span>
                </div>
              ))}
            </div>
          </div>

          {habits.map((h) => (
            <div
              key={h.id}
              className="habit-row"
              onDoubleClick={() => setEditing(h)}
              title="더블클릭하면 수정"
            >
              <div className="habit-info">
                <span
                  className="cat-chip"
                  style={{ "--chip": catColor(h.categoryId) } as React.CSSProperties}
                >
                  {catName(h.categoryId)}
                </span>
                <span className="habit-title">{h.title}</span>
                <span className="habit-meta">
                  {repeatLabel(h)} · 🔥{h.streak}
                </span>
              </div>
              <div className="habit-week">
                {week.map((d) => {
                  const state = habitCellState(h, d, today);
                  if (state === "today") {
                    return (
                      <button
                        key={d}
                        className={"habit-cell habit-cell--today" + (h.done ? " is-done" : "")}
                        onClick={(e) => toggleToday(e, h)}
                        title={h.done ? "오늘 완료 해제" : "오늘 완료 체크"}
                      >
                        {h.done ? "✓" : "○"}
                      </button>
                    );
                  }
                  if (state === "future")
                    return (
                      <span key={d} className="habit-cell habit-cell--future" title="예정">
                        ·
                      </span>
                    );
                  if (state === "past")
                    return (
                      <span
                        key={d}
                        className="habit-cell habit-cell--past"
                        title="기록 없음 (서버 연동 후)"
                      >
                        ?
                      </span>
                    );
                  return (
                    <span key={d} className="habit-cell habit-cell--none" title="해당 없음">
                      —
                    </span>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="habits__note">
        🔜 주간 그리드의 과거 칸(?)은 일자별 완료 이력이 있어야 채워집니다 — 서버 연동 후. 지금은 오늘 체크와 적용 요일만 표시합니다.
      </p>

      {editing !== null && (
        <TaskForm
          task={editing}
          categories={categories}
          customers={customers}
          onSave={handleSave}
          onClose={() => setEditing(null)}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
