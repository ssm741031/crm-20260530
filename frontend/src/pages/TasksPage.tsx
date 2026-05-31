import { useEffect, useMemo, useState } from "react";
import { api, type TaskInput } from "../api";
import type { Category, Customer, Task } from "../types";
import TaskForm from "../components/TaskForm";
import { usePointerDrag } from "../hooks/usePointerDrag";
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

  // 카테고리별 그룹 (카테고리 정의 순서대로, 빈 그룹도 드롭 대상으로 표시)
  const groups = useMemo(() => {
    return categories.map((c) => ({
      cat: c,
      items: tasks.filter((t) => t.categoryId === c.id),
    }));
  }, [categories, tasks]);

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

  // ----- 드래그(Sprint 16): 순서 변경 + 다른 카테고리로 이동 -----
  const [overTaskId, setOverTaskId] = useState<string | null>(null);
  const [overCatId, setOverCatId] = useState<string | null>(null);

  function onDragMove(x: number, y: number) {
    const el = document.elementFromPoint(x, y);
    const card = el?.closest("[data-task]");
    setOverTaskId(card ? card.getAttribute("data-task") : null);
    const grp = el?.closest("[data-cat]");
    setOverCatId(grp ? grp.getAttribute("data-cat") : null);
  }

  function onDragDrop(t: Task, x: number, y: number) {
    setOverTaskId(null);
    setOverCatId(null);
    const el = document.elementFromPoint(x, y);
    const grp = el?.closest("[data-cat]");
    if (!grp) return;
    const toCat = grp.getAttribute("data-cat")!;
    const card = el?.closest("[data-task]");
    const beforeId = card?.getAttribute("data-task") ?? null;
    if (beforeId === t.id) return; // 자기 위 = 변화 없음
    // 같은 카테고리 + 대상 없음(그룹 끝) + 이미 끝이면 스킵은 api가 처리
    api.moveTask(t.id, toCat, beforeId === t.id ? null : beforeId).then(refresh);
  }

  const drag = usePointerDrag<Task>(onDragDrop, onDragMove);

  if (loading) return <p className="muted">불러오는 중…</p>;

  return (
    <div>
      <div className="page-head">
        <p className="muted">
          할 일 {tasks.length}건 (목 데이터) · 카드를 끌어 순서 변경 / 다른 카테고리로 이동
        </p>
        <button className="btn btn--primary" onClick={() => setEditing("new")}>
          + 새 할 일
        </button>
      </div>

      {groups.map((g) => (
        <section
          key={g.cat.id}
          data-cat={g.cat.id}
          className={
            "task-group" +
            (drag.dragging && overCatId === g.cat.id ? " is-dragover" : "")
          }
        >
          <div className="task-group__head">
            <span
              className="cat-dot"
              style={{ background: catColor(g.cat.id) } as React.CSSProperties}
            />
            <span className="task-group__name">{catName(g.cat.id)}</span>
            <span className="task-group__count">{g.items.length}</span>
          </div>

          <ul className="card-list">
            {g.items.length === 0 && (
              <li className="task-group__empty muted">
                여기로 끌어다 놓으면 이 카테고리로 이동
              </li>
            )}
            {g.items.map((t) => (
              <li
                key={t.id}
                data-task={t.id}
                className={
                  "card card--click card--drag" +
                  (drag.dragging && overTaskId === t.id ? " is-dropbefore" : "")
                }
                onPointerDown={(e) => {
                  // 완료 체크 버튼 위에서 시작한 포인터는 드래그로 안 잡음
                  if ((e.target as HTMLElement).closest(".check")) return;
                  drag.start(e, t);
                }}
                onClick={() => {
                  if (drag.didDrag()) return; // 드래그였으면 편집 안 열기
                  setEditing(t);
                }}
              >
                <div className="card__main">
                  <button
                    className={"check" + (t.done ? " check--on" : "")}
                    onClick={(e) => handleToggle(e, t)}
                    title={t.done ? "완료 해제" : "완료로 표시"}
                  >
                    {t.done ? "✓" : ""}
                  </button>
                  <div>
                    <div
                      className={"card__title" + (t.done ? " card__title--done" : "")}
                    >
                      {t.title}
                    </div>
                    <div className="card__sub">
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
        </section>
      ))}

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
