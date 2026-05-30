import { useCallback, useRef, useState } from "react";

/** 네이티브 Pointer Event 드래그 (계획서 §5.7 — PC 마우스·모바일 터치 단일 코드).
 *  - 이동 임계값(threshold)을 넘어야 드래그로 간주(클릭과 구분).
 *  - onDrop(payload, clientX, clientY): 드롭 지점에서 호출(이동했을 때만).
 *  - onMove(clientX, clientY): 드래그 중 매 이동(하이라이트용).
 *  - didDrag(): 직전 상호작용이 드래그였는지 — onClick에서 편집 열기 억제에 사용. */
export function usePointerDrag<T>(
  onDrop: (payload: T, clientX: number, clientY: number) => void,
  onMove?: (clientX: number, clientY: number) => void,
  threshold = 6
) {
  // 콜백을 ref에 담아 리스너 재등록 없이 최신값 사용
  const cbRef = useRef({ onDrop, onMove });
  cbRef.current = { onDrop, onMove };

  const stateRef = useRef<{ payload: T; x: number; y: number } | null>(null);
  const movedRef = useRef(false);
  const [dragging, setDragging] = useState(false);

  const handleMove = useCallback(
    (e: PointerEvent) => {
      const s = stateRef.current;
      if (!s) return;
      if (
        !movedRef.current &&
        Math.hypot(e.clientX - s.x, e.clientY - s.y) > threshold
      ) {
        movedRef.current = true;
        setDragging(true);
      }
      if (movedRef.current) cbRef.current.onMove?.(e.clientX, e.clientY);
    },
    [threshold]
  );

  const handleUp = useCallback(
    (e: PointerEvent) => {
      const s = stateRef.current;
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      stateRef.current = null;
      setDragging(false);
      if (s && movedRef.current) cbRef.current.onDrop(s.payload, e.clientX, e.clientY);
      // 직후의 click 이벤트가 끝난 다음 리셋(클릭 억제용)
      setTimeout(() => {
        movedRef.current = false;
      }, 0);
    },
    [handleMove]
  );

  const start = useCallback(
    (e: React.PointerEvent, payload: T) => {
      stateRef.current = { payload, x: e.clientX, y: e.clientY };
      movedRef.current = false;
      window.addEventListener("pointermove", handleMove);
      window.addEventListener("pointerup", handleUp);
    },
    [handleMove, handleUp]
  );

  /** 직전 동작이 드래그였는지(클릭 핸들러에서 편집 열기 억제용) */
  const didDrag = useCallback(() => movedRef.current, []);

  return { start, dragging, didDrag };
}
