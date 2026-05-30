import { useEffect, useState } from "react";
import { api, type TaskInput } from "../api";
import type { Category, Customer, Task } from "../types";
import TaskForm from "../components/TaskForm";
import "./page.css";

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  // 편집폼 상태: null=닫힘, "new"=새로 만들기, Task=수정
  const [editing, setEditing] = useState<Task | "new" | null>(null);

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

  const catName = (id: string) =>
    categories.find((c) => c.id === id)?.name ?? "기본";
  const catColor = (id: string) =>
    categories.find((c) => c.id === id)?.color ?? "var(--cat-default)";

  function handleSave(input: TaskInput, id: string | null) {
    const op = id ? api.updateTask(id, input) : api.createTask(input);
    op.then(refresh).then(() => setEditing(null));
  }

  function handleDelete(id: string) {
    if (!window.confirm("이 할 일을 삭제할까요?")) return;
    api.deleteTask(id).then(refresh).then(() => setEditing(null));
  }

  function handleToggle(e: React.MouseEvent, t: Task) {
    e.stopPropagation(); // 카드 클릭(수정 열기)과 분리
    api.toggleDone(t.id, new Date().toISOString()).then(refresh);
  }

  if (loading) return <p className="muted">불러오는 중…</p>;

  return (
    <div>
      <div className="page-head">
        <p className="muted">할 일 {tasks.length}건 (목 데이터)</p>
        <button className="btn btn--primary" onClick={() => setEditing("new")}>
          + 새 할 일
        </button>
      </div>

      <ul className="card-list">
        {tasks.map((t) => (
          <li key={t.id} className="card card--click" onClick={() => setEditing(t)}>
            <div className="card__main">
              <button
                className={"check" + (t.done ? " check--on" : "")}
                onClick={(e) => handleToggle(e, t)}
                title={t.done ? "완료 해제" : "완료로 표시"}
              >
                {t.done ? "✓" : ""}
              </button>
              <div>
                <div className={"card__title" + (t.done ? " card__title--done" : "")}>
                  {t.title}
                </div>
                <div className="card__sub">
                  <span
                    className="cat-chip"
                    style={{ "--chip": catColor(t.categoryId) } as React.CSSProperties}
                  >
                    {catName(t.categoryId)}
                  </span>
                  {" · "}
                  {t.timeType === "deadline" ? "마감형" : "구간형"}
                  {t.endDate ? ` · ${t.endDate} ${t.endTime ?? ""}` : ""}
                  {t.repeat !== "none" ? " · 반복" : ""}
                  {t.streak > 0 ? ` · 🔥${t.streak}` : ""}
                </div>
              </div>
            </div>
            <div className="tags">
              {t.tags.map((tag) => (
                <span key={tag} className="tag">
                  #{tag}
                </span>
              ))}
            </div>
          </li>
        ))}
      </ul>

      {editing !== null && (
        <TaskForm
          task={editing === "new" ? null : editing}
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
