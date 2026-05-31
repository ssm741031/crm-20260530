/* ============================================================
   통합검색 결과 페이지 (Sprint 11)

   - URL: /search?q=...
   - 입력: 쿼리스트링 q
   - api.searchAll(q) 호출 (내부에서 currentUser 권한 필터 적용)
   - 표시: 3그룹(고객/할일/파이프라인) 카드
   - 클릭: 해당 목록 페이지로 ?focus=id 강조 이동
     · 고객 → /customers?focus=id
     · 할 일 → /tasks?focus=id
     · 파이프라인 → /pipeline?focus=id
   ============================================================ */
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../api";
import type { SearchHit, SearchResult } from "../types";
import "./SearchPage.css";

const KIND_LABEL: Record<SearchHit["kind"], string> = {
  customer: "고객",
  task: "할 일",
  pipeline: "파이프라인",
};

const KIND_ROUTE: Record<SearchHit["kind"], string> = {
  customer: "/customers",
  task: "/tasks",
  pipeline: "/pipeline",
};

interface SectionProps {
  title: string;
  hits: SearchHit[];
  onClick: (hit: SearchHit) => void;
}

function Section({ title, hits, onClick }: SectionProps) {
  if (hits.length === 0) return null;
  return (
    <section className="search-section">
      <h3 className="search-section__title">
        {title} <span className="search-section__count">{hits.length}</span>
      </h3>
      <ul className="search-list">
        {hits.map((h) => (
          <li key={`${h.kind}-${h.id}`}>
            <button
              type="button"
              className="search-hit"
              onClick={() => onClick(h)}
            >
              <div className="search-hit__title">{h.title}</div>
              {h.subtitle ? (
                <div className="search-hit__subtitle">{h.subtitle}</div>
              ) : null}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function SearchPage() {
  const [params] = useSearchParams();
  const q = params.get("q") ?? "";
  const navigate = useNavigate();
  const [result, setResult] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let aborted = false;
    if (!q.trim()) {
      setResult(null);
      return;
    }
    setLoading(true);
    api.searchAll(q).then((r) => {
      if (aborted) return;
      setResult(r);
      setLoading(false);
    });
    return () => {
      aborted = true;
    };
  }, [q]);

  const handleClick = (hit: SearchHit) => {
    const target = KIND_ROUTE[hit.kind];
    navigate(`${target}?focus=${encodeURIComponent(hit.id)}`);
  };

  if (!q.trim()) {
    return (
      <div className="search-page search-page--empty">
        <p>검색어를 입력하세요.</p>
      </div>
    );
  }
  if (loading) {
    return (
      <div className="search-page search-page--loading">
        <p>검색 중…</p>
      </div>
    );
  }
  if (!result || result.total === 0) {
    return (
      <div className="search-page search-page--empty">
        <p>“{q}” 검색 결과가 없습니다.</p>
        <p className="search-page__hint">
          (권한이 없는 항목은 결과에 표시되지 않습니다.)
        </p>
      </div>
    );
  }

  return (
    <div className="search-page">
      <h2 className="search-page__title">
        “{q}” 검색 결과 <span className="search-page__total">{result.total}건</span>
      </h2>
      <Section
        title={KIND_LABEL.customer}
        hits={result.customers}
        onClick={handleClick}
      />
      <Section title={KIND_LABEL.task} hits={result.tasks} onClick={handleClick} />
      <Section
        title={KIND_LABEL.pipeline}
        hits={result.pipelines}
        onClick={handleClick}
      />
    </div>
  );
}
