import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import type { Category, Customer, Task } from "../types";
import { useAuth } from "../hooks/useAuth";
import { canViewTask } from "../utils/permission";
import {
  byCategory,
  dailyDoneTrend,
  habitStreaks,
  pct,
  rangeProgress,
  shortDate,
  todayProgress,
} from "../utils/activity";
import "./ActivityPage.css";

export default function ActivityPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

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

  // 권한 범위 내 할 일만 집계 (§8 — 통계도 권한 우회 금지)
  const visible = useMemo(() => {
    if (!user) return [];
    return tasks.filter((t) => canViewTask(user, t, customers));
  }, [tasks, customers, user]);

  const catName = (id: string) =>
    categories.find((c) => c.id === id)?.name ?? "기본";
  const catColor = (id: string) =>
    categories.find((c) => c.id === id)?.color ?? "var(--cat-default)";

  const today = useMemo(() => todayProgress(visible), [visible]);
  const week = useMemo(() => rangeProgress(visible, 7), [visible]);
  const month = useMemo(() => rangeProgress(visible, 30), [visible]);
  const cats = useMemo(() => byCategory(visible), [visible]);
  const habits = useMemo(() => habitStreaks(visible), [visible]);
  const trend = useMemo(() => dailyDoneTrend(visible, 7), [visible]);

  const maxCat = Math.max(1, ...cats.map((c) => c.total));
  const maxTrend = Math.max(1, ...trend.map((d) => d.done));

  if (loading) return <p className="muted">불러오는 중…</p>;

  return (
    <div className="act">
      <p className="muted">
        활동량 · 실천 피드백 (목 데이터 기준) · {user?.name ?? ""} 권한 범위
      </p>

      {/* 오늘 처리율 — 큰 도넛 느낌의 원형 게이지 */}
      <div className="act-row">
        <div className="act-card act-today">
          <div className="act-card__label">오늘 처리율</div>
          <div
            className="act-gauge"
            style={
              {
                "--rate": today.rate,
              } as React.CSSProperties
            }
          >
            <span className="act-gauge__pct">{today.rate}%</span>
          </div>
          <div className="act-card__sub">
            오늘 마감 {today.total}건 중 {today.done}건 완료
          </div>
        </div>

        {/* 7일 / 30일 달성률 */}
        <div className="act-card">
          <div className="act-card__label">최근 7일 달성률</div>
          <div className="act-bignum">{week.rate}%</div>
          <div className="act-card__sub">
            {week.done} / {week.total}건 완료
          </div>
        </div>
        <div className="act-card">
          <div className="act-card__label">최근 30일 달성률</div>
          <div className="act-bignum">{month.rate}%</div>
          <div className="act-card__sub">
            {month.done} / {month.total}건 완료
          </div>
        </div>
      </div>

      {/* 최근 7일 완료 추이 (작은 막대) */}
      <div className="act-card">
        <div className="act-card__label">최근 7일 완료 추이</div>
        <div className="act-trend">
          {trend.map((d) => (
            <div key={d.date} className="act-trend__col">
              <div className="act-trend__barwrap">
                <div
                  className="act-trend__bar"
                  style={{ height: `${(d.done / maxTrend) * 100}%` }}
                  title={`${d.done}건`}
                />
              </div>
              <div className="act-trend__lab">{shortDate(d.date)}</div>
              <div className="act-trend__n">{d.done}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 카테고리별 완료 분포 */}
      <div className="act-card">
        <div className="act-card__label">카테고리별 완료 분포</div>
        {cats.length === 0 ? (
          <p className="muted">집계할 할 일이 없습니다.</p>
        ) : (
          <ul className="act-dist">
            {cats.map((c) => (
              <li key={c.categoryId} className="act-dist__row">
                <span className="act-dist__name">
                  <span
                    className="cat-dot"
                    style={{ background: catColor(c.categoryId) } as React.CSSProperties}
                  />
                  {catName(c.categoryId)}
                </span>
                <div className="act-dist__barwrap">
                  <div
                    className="act-dist__bar"
                    style={{
                      width: `${(c.total / maxCat) * 100}%`,
                      background: catColor(c.categoryId),
                    } as React.CSSProperties}
                  />
                </div>
                <span className="act-dist__num">
                  {c.done}/{c.total} ({pct(c.done, c.total)}%)
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* 습관 streak 요약 */}
      <div className="act-card">
        <div className="act-card__label">습관 연속 달성 (streak)</div>
        {habits.length === 0 ? (
          <p className="muted">반복(습관) 항목이 없습니다.</p>
        ) : (
          <ul className="act-habits">
            {habits.map((h) => (
              <li key={h.id} className="act-habits__row">
                <span className="act-habits__t">{h.title}</span>
                <span className="act-habits__s">🔥 {h.streak}일</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="cal__note">
        🔜 단계별 병목 분석(§3.3)·팀원별 비교는 SLA 기준시간·팀 모델·서버 완료이력 이후. 지금은 저장된 항목 기준.
      </p>
    </div>
  );
}
