import { useEffect, useState } from "react";
import { api, CARRY_DEFAULT_ID } from "../api";
import type { Category } from "../types";
import "./CategoriesPage.css";

const DEFAULT_COLOR = "#2563eb";

export default function CategoriesPage() {
  const [cats, setCats] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // 활동(부모) 추가 폼
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(DEFAULT_COLOR);

  // 세부(자식) 추가: 어느 부모에 추가 중인가 + 입력값
  const [childParentId, setChildParentId] = useState<string | null>(null);
  const [childName, setChildName] = useState("");

  // 인라인 이름 수정
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  function refresh() {
    return api.getCategories().then((data) => {
      setCats(data);
      setLoading(false);
    });
  }

  useEffect(() => {
    refresh();
  }, []);

  const parents = cats.filter((c) => c.parentId === null);
  const childrenOf = (parentId: string) =>
    cats.filter((c) => c.parentId === parentId);

  // ----- 활동(부모) 추가 -----
  function addParent() {
    const name = newName.trim();
    if (!name) return;
    api
      .createCategory({ name, parentId: null, color: newColor })
      .then(refresh)
      .then(() => {
        setNewName("");
        setNewColor(DEFAULT_COLOR);
      });
  }

  // ----- 세부(자식) 추가 -----
  function addChild(parentId: string) {
    const name = childName.trim();
    if (!name) return;
    const parent = cats.find((c) => c.id === parentId);
    api
      .createCategory({
        name,
        parentId,
        color: parent?.color ?? DEFAULT_COLOR, // 색상은 부모 상속
      })
      .then(refresh)
      .then(() => {
        setChildParentId(null);
        setChildName("");
      });
  }

  // ----- 이름 수정 -----
  function startEdit(c: Category) {
    setEditingId(c.id);
    setEditingName(c.name);
  }
  function saveEdit() {
    const name = editingName.trim();
    if (!editingId || !name) return;
    api.updateCategory(editingId, { name }).then(refresh).then(() => {
      setEditingId(null);
      setEditingName("");
    });
  }

  // ----- 삭제 -----
  function remove(c: Category) {
    const kids = childrenOf(c.id);
    const msg =
      kids.length > 0
        ? `'${c.name}' 활동과 하위 세부 ${kids.length}개도 함께 삭제됩니다. 삭제할까요?`
        : `'${c.name}'을(를) 삭제할까요?`;
    if (!window.confirm(msg)) return;
    api.deleteCategory(c.id).then(refresh);
  }

  if (loading) return <p className="muted">불러오는 중…</p>;

  return (
    <div className="cat">
      <p className="cat__notice">
        ⓘ 지금은 목(샘플) 데이터라 새로고침하면 변경이 초기화됩니다. 서버 연결
        후 실제 저장됩니다.
      </p>

      {/* 활동(부모) 추가 */}
      <div className="cat__add">
        <input
          type="color"
          value={newColor}
          onChange={(e) => setNewColor(e.target.value)}
          title="활동 색상"
        />
        <input
          className="cat__input"
          placeholder="새 활동 이름 (예: 보험설계사 업무)"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addParent()}
        />
        <button className="btn btn--primary" onClick={addParent}>
          활동 추가
        </button>
      </div>

      {/* 트리 */}
      <ul className="cat__tree">
        {parents.map((p) => {
          const isDefault = p.id === CARRY_DEFAULT_ID;
          return (
            <li key={p.id} className="cat__parent">
              <div className="cat__row">
                <span className="cat__dot" style={{ background: p.color }} />
                {editingId === p.id ? (
                  <EditField
                    value={editingName}
                    onChange={setEditingName}
                    onSave={saveEdit}
                    onCancel={() => setEditingId(null)}
                  />
                ) : (
                  <span className="cat__name">{p.name}</span>
                )}
                {isDefault && <span className="cat__badge">기본</span>}

                <span className="cat__actions">
                  {!isDefault && editingId !== p.id && (
                    <>
                      <button
                        className="btn"
                        onClick={() =>
                          setChildParentId(childParentId === p.id ? null : p.id)
                        }
                      >
                        + 세부
                      </button>
                      <button className="btn" onClick={() => startEdit(p)}>
                        수정
                      </button>
                      <button className="btn btn--danger" onClick={() => remove(p)}>
                        삭제
                      </button>
                    </>
                  )}
                </span>
              </div>

              {/* 세부(자식) 추가 입력줄 */}
              {childParentId === p.id && (
                <div className="cat__childadd">
                  <input
                    className="cat__input"
                    autoFocus
                    placeholder="세부 카테고리 이름 (예: 장기보험)"
                    value={childName}
                    onChange={(e) => setChildName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addChild(p.id)}
                  />
                  <button className="btn btn--primary" onClick={() => addChild(p.id)}>
                    추가
                  </button>
                  <button className="btn" onClick={() => setChildParentId(null)}>
                    취소
                  </button>
                </div>
              )}

              {/* 자식 목록 */}
              <ul className="cat__children">
                {childrenOf(p.id).map((ch) => (
                  <li key={ch.id} className="cat__row cat__row--child">
                    <span
                      className="cat__dot cat__dot--sm"
                      style={{ background: p.color }}
                    />
                    {editingId === ch.id ? (
                      <EditField
                        value={editingName}
                        onChange={setEditingName}
                        onSave={saveEdit}
                        onCancel={() => setEditingId(null)}
                      />
                    ) : (
                      <span className="cat__name">{ch.name}</span>
                    )}
                    {editingId !== ch.id && (
                      <span className="cat__actions">
                        <button className="btn" onClick={() => startEdit(ch)}>
                          수정
                        </button>
                        <button
                          className="btn btn--danger"
                          onClick={() => remove(ch)}
                        >
                          삭제
                        </button>
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** 인라인 이름 편집용 작은 컴포넌트 */
function EditField({
  value,
  onChange,
  onSave,
  onCancel,
}: {
  value: string;
  onChange: (v: string) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <span className="cat__edit">
      <input
        className="cat__input"
        autoFocus
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onSave();
          if (e.key === "Escape") onCancel();
        }}
      />
      <button className="btn btn--primary" onClick={onSave}>
        저장
      </button>
      <button className="btn" onClick={onCancel}>
        취소
      </button>
    </span>
  );
}
