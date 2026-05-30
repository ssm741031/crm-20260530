/** 아직 구현 전 화면의 임시 자리. 이후 스프린트에서 실제 화면으로 교체. */
export default function Placeholder({ title }: { title: string }) {
  return (
    <div>
      <h2 style={{ marginBottom: 8 }}>{title}</h2>
      <p className="muted">이 화면은 다음 스프린트에서 만듭니다. (토대 단계 자리표시)</p>
    </div>
  );
}
