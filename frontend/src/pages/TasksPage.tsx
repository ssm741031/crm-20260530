import { useEffect, useState } from "react";
import { api } from "../api";
import type { Task } from "../types";
import "./page.css";

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // api 레이어를 통해서만 데이터를 가져온다 (서버 교체 지점)
    api.getTasks().then((data) => {
      setTasks(data);
      setLoading(false);
    });
  }, []);

  if (loading) return <p className="muted">불러오는 중…</p>;

  return (
    <div>
      <p className="muted">할 일 {tasks.length}건 (목 데이터)</p>
      <ul className="card-list">
        {tasks.map((t) => (
          <li key={t.id} className="card">
            <div className="card__main">
              <span className={"check" + (t.done ? " check--on" : "")}>
                {t.done ? "✓" : ""}
              </span>
              <div>
                <div className={"card__title" + (t.done ? " card__title--done" : "")}>
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
    </div>
  );
}
