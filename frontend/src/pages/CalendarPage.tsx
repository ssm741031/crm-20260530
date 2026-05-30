import { useEffect, useMemo, useState } from "react";
import { api, type TaskInput } from "../api";
import type { Category, Customer, Task } from "../types";
import TaskForm from "../components/TaskForm";
import {
  addDays,
  addMonths,
  applyFilters,
  clampMin,
  diffDays,
  minToTime,
  MONTH_LABELS,
  monthMatrix,
  parseDate,
  snap15,
  tasksOnDate,
  timeToMin,
  todayIso,
  WEEKDAY_LABELS,
  weekDates,
  ymd,
} from "../utils/calendar";
import { usePointerDrag } from "../hooks/usePointerDrag";
import "./CalendarPage.css";

type DragPayload = { kind: "date" | "time"; task: Task };
const DAY_LO = 7; // 운영시간 하한(시)
const DAY_HI = 21; // 운영시간 상한(시)

type View = "day" | "week" | "month" | "year";
const DAY_HOURS = Array.from({ length: 15 }, (_, i) => i + 7); // 운영시간 07~21시

export default function CalendarPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  const [view, setView] = useState<View>("month");
  const [cursor, setCursor] = useState<string>(todayIso());

  const [editing, setEditing] = useState<Task | "new" | null>(null);
  const [newDate, setNewDate] = useState<string | null>(null);

  // 보기 제어(§5.5)
  const [showDone, setShowDone] = useState(true);
  const [showRepeat, setShowRepeat] = useState(true);
  const [hiddenCats, setHiddenCats] = useState<string[]>([]);

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

  const filtered = useMemo(
    () => applyFilters(tasks, { showDone, showRepeat, hiddenCats }),
    [tasks, showDone, showRepeat, hiddenCats]
  );

  function handleSave(input: TaskInput, id: string | null) {
    const op = id ? api.updateTask(id, input) : api.createTask(input);
    op.then(refresh).then(() => {
      setEditing(null);
      setNewDate(null);
    });
  }
  function handleDelete(id: string) {
    if (!window.confirm("이 할 일을 삭제할까요?")) return;
    api.deleteTask(id).then(refresh).then(() => setEditing(null));
  }

  function openNew(date: string) {
    setNewDate(date);
    setEditing("new");
  }

  // ----- 드래그(Sprint 09): 칩 날짜 이동 / 일간 시각 이동 (Pointer Event) -----
  const [overDate, setOverDate] = useState<string | null>(null);
  const [overHour, setOverHour] = useState<number | null>(null);

  function onDragMove(x: number, y: number) {
    const el = document.elementFromPoint(x, y);
    const dc = el?.closest("[data-date]");
    setOverDate(dc ? dc.getAttribute("data-date") : null);
    const hr = el?.closest("[data-hour]");
    setOverHour(hr ? Number(hr.getAttribute("data-hour")) : null);
  }

  function onDragDrop(p: DragPayload, x: number, y: number) {
    setOverDate(null);
    setOverHour(null);
    const el = document.elementFromPoint(x, y);
    const t = p.task;
    if (p.kind === "date") {
      const target = el?.closest("[data-date]")?.getAttribute("data-date");
      if (!target) return;
      if (t.timeType === "range" && t.startDate && t.endDate) {
        const delta = diffDays(t.endDate, target);
        if (delta === 0) return;
        api
          .updateTask(t.id, {
            startDate: addDays(t.startDate, delta),
            endDate: addDays(t.endDate, delta),
          })
          .then(refresh);
      } else {
        if (t.endDate === target) return;
        api.updateTask(t.id, { endDate: target }).then(refresh);
      }
    } else {
      const row = el?.closest("[data-hour]");
      if (!row) return;
      const hour = Number(row.getAttribute("data-hour"));
      const rect = row.getBoundingClientRect();
      const frac = Math.min(0.999, Math.max(0, (y - rect.top) / rect.height));
      const min = clampMin(snap15(hour * 60 + frac * 60), DAY_LO, DAY_HI);
      if (t.timeType === "range" && t.startTime && t.endTime) {
        const delta = min - timeToMin(t.startTime);
        if (delta === 0) return;
        api
          .updateTask(t.id, {
            startTime: minToTime(timeToMin(t.startTime) + delta),
            endTime: minToTime(timeToMin(t.endTime) + delta),
          })
          .then(refresh);
      } else {
        api.updateTask(t.id, { endTime: minToTime(min) }).then(refresh);
      }
    }
  }

  const drag = usePointerDrag<DragPayload>(onDragDrop, onDragMove);

  // ----- 헤더 이동 -----
  function move(dir: -1 | 1) {
    if (view === "day") setCursor(addDays(cursor, dir));
    else if (view === "week") setCursor(addDays(cursor, dir * 7));
    else if (view === "month") setCursor(addMonths(cursor, dir));
    else setCursor(addMonths(cursor, dir * 12));
  }

  const cur = parseDate(cursor);
  const year = cur.getFullYear();
  const month0 = cur.getMonth();

  const label =
    view === "day"
      ? `${year}년 ${month0 + 1}월 ${cur.getDate()}일 (${WEEKDAY_LABELS[cur.getDay()]})`
      : view === "week"
      ? (() => {
          const wd = weekDates(cursor);
          return `${wd[0].slice(5)} ~ ${wd[6].slice(5)}`;
        })()
      : view === "month"
      ? `${year}년 ${month0 + 1}월`
      : `${year}년`;

  if (loading) return <p className="muted">불러오는 중…</p>;

  return (
    <div className="cal">
      {/* 헤더: 뷰 전환 + 날짜 이동 */}
      <div className="cal__head">
        <div className="cal__views">
          {(["day", "week", "month", "year"] as View[]).map((v) => (
            <button
              key={v}
              className={"cal__view-btn" + (view === v ? " is-on" : "")}
              onClick={() => setView(v)}
            >
              {{ day: "일", week: "주", month: "월", year: "연" }[v]}
            </button>
          ))}
        </div>
        <div className="cal__nav">
          <button className="cal__arrow" onClick={() => move(-1)} aria-label="이전">
            ‹
          </button>
          <button className="cal__today" onClick={() => setCursor(todayIso())}>
            오늘
          </button>
          <button className="cal__arrow" onClick={() => move(1)} aria-label="다음">
            ›
          </button>
          <span className="cal__label">{label}</span>
        </div>
      </div>

      {/* 보기 제어 필터(§5.5) */}
      <div className="cal__filters">
        <label className="cal__chk">
          <input
            type="checkbox"
            checked={showDone}
            onChange={(e) => setShowDone(e.target.checked)}
          />
          완료 표시
        </label>
        <label className="cal__chk">
          <input
            type="checkbox"
            checked={showRepeat}
            onChange={(e) => setShowRepeat(e.target.checked)}
          />
          반복 표시
        </label>
        <span className="cal__sep" />
        {categories.map((c) => {
          const off = hiddenCats.includes(c.id);
          return (
            <button
              key={c.id}
              className={"cal__cat" + (off ? " is-off" : "")}
              style={{ "--chip": catColor(c.id) } as React.CSSProperties}
              onClick={() =>
                setHiddenCats((prev) =>
                  prev.includes(c.id)
                    ? prev.filter((x) => x !== c.id)
                    : [...prev, c.id]
                )
              }
              title={off ? "켜기" : "끄기"}
            >
              {c.name}
            </button>
          );
        })}
      </div>

      {/* 본문 뷰 */}
      {view === "month" && renderMonth()}
      {view === "week" && renderWeek()}
      {view === "day" && renderDay()}
      {view === "year" && renderYear()}

      <p className="cal__note">
        🔜 항목 끌어 날짜·시간 이동(드래그)은 다음 단계. 반복 항목 자동 전개는 서버 연결 후 — 지금은 저장된 항목만 표시.
      </p>

      {editing !== null && (
        <TaskForm
          task={editing === "new" ? null : editing}
          categories={categories}
          customers={customers}
          initialDate={newDate ?? undefined}
          onSave={handleSave}
          onClose={() => {
            setEditing(null);
            setNewDate(null);
          }}
          onDelete={handleDelete}
        />
      )}
    </div>
  );

  // ===== 칩 (마감형 ● / 구간형 ▭) =====
  function chip(t: Task) {
    return (
      <button
        key={t.id}
        className={"cal-chip" + (t.done ? " is-done" : "")}
        style={{ "--chip": catColor(t.categoryId) } as React.CSSProperties}
        onPointerDown={(e) => drag.start(e, { kind: "date", task: t })}
        onClick={(e) => {
          e.stopPropagation();
          if (drag.didDrag()) return; // 드래그면 편집 열지 않음
          setEditing(t);
        }}
        title={`${catName(t.categoryId)} · ${t.title}`}
      >
        <span className="cal-chip__mark">{t.timeType === "range" ? "▭" : "●"}</span>
        <span className="cal-chip__t">{t.title}</span>
      </button>
    );
  }

  // ===== 월간 =====
  function renderMonth() {
    const weeks = monthMatrix(year, month0);
    const MAX = 3;
    return (
      <div className="cal-month">
        <div className="cal-month__head">
          {WEEKDAY_LABELS.map((w) => (
            <div key={w} className="cal-month__wd">
              {w}
            </div>
          ))}
        </div>
        {weeks.map((wk, i) => (
          <div className="cal-month__row" key={i}>
            {wk.map((cell) => {
              const dayTasks = tasksOnDate(filtered, cell.date);
              const isToday = cell.date === todayIso();
              return (
                <div
                  key={cell.date}
                  data-date={cell.date}
                  className={
                    "cal-cell" +
                    (cell.inMonth ? "" : " is-out") +
                    (isToday ? " is-today" : "") +
                    (drag.dragging && overDate === cell.date ? " is-dragover" : "")
                  }
                  onDoubleClick={() => openNew(cell.date)}
                  title="더블클릭하면 새 할 일"
                >
                  <div className="cal-cell__d">{parseDate(cell.date).getDate()}</div>
                  <div className="cal-cell__items">
                    {dayTasks.slice(0, MAX).map((t) => chip(t))}
                    {dayTasks.length > MAX && (
                      <span className="cal-cell__more">
                        +{dayTasks.length - MAX}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    );
  }

  // ===== 주간 =====
  function renderWeek() {
    const wd = weekDates(cursor);
    return (
      <div className="cal-week">
        {wd.map((date) => {
          const d = parseDate(date);
          const isToday = date === todayIso();
          return (
            <div className={"cal-week__col" + (isToday ? " is-today" : "")} key={date}>
              <button
                className="cal-week__head"
                onClick={() => {
                  setCursor(date);
                  setView("day");
                }}
                title="일간으로 보기"
              >
                {WEEKDAY_LABELS[d.getDay()]} {d.getDate()}
              </button>
              <div
                data-date={date}
                className={
                  "cal-week__body" +
                  (drag.dragging && overDate === date ? " is-dragover" : "")
                }
                onDoubleClick={() => openNew(date)}
              >
                {tasksOnDate(filtered, date).map((t) => chip(t))}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // ===== 일간 (운영시간 시간대 — 시간 비례 타임바) =====
  function renderDay() {
    const dayTasks = tasksOnDate(filtered, cursor);
    const PX_PER_HOUR = 48;
    const gridStartMin = DAY_LO * 60; // 07:00
    const gridEndMin = (DAY_HI + 1) * 60; // 22:00 (마지막 행 끝)
    const minToY = (min: number) =>
      ((Math.max(gridStartMin, Math.min(gridEndMin, min)) - gridStartMin) *
        PX_PER_HOUR) /
      60;
    // 표시 기준 분: 구간형=시작, 마감형=마감
    const baseMin = (t: Task) => {
      const s = t.timeType === "range" ? t.startTime : t.endTime;
      return s ? timeToMin(s) : null;
    };
    // 운영시간 밖이거나 시간 없음 → "그 외" 목록
    const other = dayTasks.filter((t) => {
      const m = baseMin(t);
      return m === null || m < gridStartMin || m >= gridEndMin;
    });
    const inGrid = dayTasks.filter((t) => !other.includes(t));

    return (
      <div className="cal-day">
        {other.length > 0 && (
          <div className="cal-day__other">
            <span className="cal-day__h">그 외</span>
            <div className="cal-day__otherlist">{other.map((t) => chip(t))}</div>
          </div>
        )}
        <div
          className="cal-day__grid"
          style={{ height: PX_PER_HOUR * DAY_HOURS.length }}
        >
          {/* 배경 시간 행 (드래그 드롭·더블클릭 새 할일) */}
          {DAY_HOURS.map((h) => (
            <div
              key={h}
              data-hour={h}
              className={
                "cal-day__hrow" +
                (drag.dragging && overHour === h ? " is-dragover" : "")
              }
              style={{ height: PX_PER_HOUR }}
              onDoubleClick={() => openNew(cursor)}
            >
              <span className="cal-day__h">{String(h).padStart(2, "0")}:00</span>
            </div>
          ))}
          {/* 막대 오버레이 (시간 비례 위치) */}
          <div className={"cal-day__bars" + (drag.dragging ? " is-dragging" : "")}>
            {inGrid.map((t) => {
              const isRange =
                t.timeType === "range" && !!t.startTime && !!t.endTime;
              const startMin = isRange
                ? timeToMin(t.startTime!)
                : timeToMin(t.endTime ?? "00:00");
              const endMin = isRange ? timeToMin(t.endTime!) : startMin;
              const top = minToY(startMin);
              const height = isRange ? Math.max(20, minToY(endMin) - top) : 22;
              return (
                <button
                  key={t.id}
                  className={
                    "cal-bar" +
                    (t.done ? " is-done" : "") +
                    (isRange ? " is-range" : " is-deadline")
                  }
                  style={
                    {
                      "--chip": catColor(t.categoryId),
                      top,
                      height,
                    } as React.CSSProperties
                  }
                  onPointerDown={(e) => drag.start(e, { kind: "time", task: t })}
                  onClick={() => {
                    if (drag.didDrag()) return;
                    setEditing(t);
                  }}
                >
                  {isRange
                    ? `${t.startTime}~${t.endTime} `
                    : `${t.endTime ?? ""} `}
                  {t.title}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ===== 연간 (12개월 카드) =====
  function renderYear() {
    return (
      <div className="cal-year">
        {MONTH_LABELS.map((ml, m0) => {
          const monthTasks = filtered.filter((t) => {
            const base = t.endDate ?? t.startDate;
            if (!base) return false;
            const d = parseDate(base);
            return d.getFullYear() === year && d.getMonth() === m0;
          });
          const dotColors = [
            ...new Set(monthTasks.map((t) => catColor(t.categoryId))),
          ].slice(0, 6);
          return (
            <button
              key={m0}
              className="cal-ycard"
              onClick={() => {
                setCursor(ymd(new Date(year, m0, 1)));
                setView("month");
              }}
            >
              <div className="cal-ycard__m">{ml}</div>
              <div className="cal-ycard__n">{monthTasks.length}건</div>
              <div className="cal-ycard__dots">
                {dotColors.map((c, i) => (
                  <span
                    key={i}
                    className="cal-dot"
                    style={{ background: c } as React.CSSProperties}
                  />
                ))}
              </div>
            </button>
          );
        })}
      </div>
    );
  }
}
