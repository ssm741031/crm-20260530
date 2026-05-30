/** 청약 진행 파이프라인 — 5종 단계 템플릿 + 마감 산출 (계획서 §2.5·§3.1)
 *  기준시간은 코드 고정이 아니라 템플릿 "초기값"(운영 중 조정은 후속 SLA 편집화면). */
import type { PipelineProduct, Stage } from "../types";
import { addDays, todayIso } from "./calendar";

/** 단계 마감 규칙 */
export type StageRule =
  | { kind: "start" } // 시작점(청약 시작일)
  | { kind: "after"; days: number } // 앞 단계 완료 + N일
  | { kind: "maturity"; daysBefore: number } // 만기 D-N (자동차갱신)
  | { kind: "manual" }; // 고객 요청일 등 수동 입력(미정)

export interface StageTemplate {
  name: string;
  rule: StageRule;
}

export const PRODUCT_LIST: PipelineProduct[] = [
  "장기보험",
  "화재보험",
  "자동차신규",
  "자동차갱신",
  "보상청구",
];

/** 자동차 상품(신규·갱신) — 차량번호/차대번호로 식별(동일 고객 다차량) */
export function isAutoProduct(p: PipelineProduct): boolean {
  return p === "자동차신규" || p === "자동차갱신";
}

/** 차량 식별 표시 라벨 — 차량번호 우선, 없으면 차대번호(신규 차량). 둘 다 없으면 null */
export function vehicleLabel(p: {
  vehicleNo: string | null;
  vehicleVin: string | null;
}): string | null {
  if (p.vehicleNo) return p.vehicleNo;
  if (p.vehicleVin) return `차대 ${p.vehicleVin}`;
  return null;
}

/** 5종 단계 템플릿 (계획서 §2.5 초기값) */
export const PIPELINE_TEMPLATES: Record<PipelineProduct, StageTemplate[]> = {
  장기보험: [
    { name: "고객 DB 수집", rule: { kind: "start" } },
    { name: "고객 연락·니즈 파악", rule: { kind: "after", days: 1 } },
    { name: "개인정보 수령 → 보장분석", rule: { kind: "after", days: 2 } },
    { name: "기본설계 + 고객 미팅", rule: { kind: "after", days: 3 } },
    { name: "수정설계·제안", rule: { kind: "after", days: 2 } },
    { name: "청약·고지(심사)", rule: { kind: "after", days: 2 } },
    { name: "증권 전달", rule: { kind: "after", days: 5 } },
    { name: "감사 인사·사후관리", rule: { kind: "after", days: 1 } },
  ],
  화재보험: [
    { name: "고객 DB 수집", rule: { kind: "start" } },
    { name: "고객 연락·목적물 확인", rule: { kind: "after", days: 1 } },
    { name: "물건 정보 수령 → 요율 산출", rule: { kind: "after", days: 1 } },
    { name: "설계·제안", rule: { kind: "after", days: 1 } },
    { name: "청약·증권 발행", rule: { kind: "after", days: 1 } },
    { name: "증권 전달·감사 인사", rule: { kind: "after", days: 2 } },
  ],
  자동차신규: [
    { name: "고객 DB 수집", rule: { kind: "start" } },
    { name: "고객 연락·차량정보 수령", rule: { kind: "after", days: 1 } },
    { name: "견적·비교 제안", rule: { kind: "after", days: 1 } },
    { name: "청약·결제", rule: { kind: "after", days: 1 } },
    { name: "증권 전달·감사 인사", rule: { kind: "after", days: 1 } },
  ],
  자동차갱신: [
    { name: "할인 활동 안내", rule: { kind: "maturity", daysBefore: 60 } },
    { name: "비교설계 및 안내", rule: { kind: "maturity", daysBefore: 30 } },
    { name: "재계약 (고객 요청일)", rule: { kind: "manual" } },
    { name: "증권 안내", rule: { kind: "after", days: 1 } },
  ],
  보상청구: [
    { name: "사고·청구 접수", rule: { kind: "start" } },
    { name: "필요 서류 안내", rule: { kind: "after", days: 1 } },
    { name: "서류 수령·확인", rule: { kind: "after", days: 3 } },
    { name: "손해사정·심사", rule: { kind: "after", days: 3 } },
    { name: "보험사 청구 접수", rule: { kind: "after", days: 1 } },
    { name: "지급 확인", rule: { kind: "after", days: 5 } },
    { name: "결과 안내·종결", rule: { kind: "after", days: 1 } },
  ],
};

/** 단계의 마감 규칙 라벨(상세 화면 안내용) */
export function ruleLabel(rule: StageRule): string {
  if (rule.kind === "start") return "시작점";
  if (rule.kind === "after") return `앞 단계 완료 +${rule.days}일`;
  if (rule.kind === "maturity") return `만기 D-${rule.daysBefore}`;
  return "고객 요청일(수동)";
}

/** 생성 시점의 초기 마감일 계산.
 *  - start: 시작일 / maturity: 만기-Nd(고정) / after·manual: 미정(null, 진행하며 산출) */
function initialDue(
  rule: StageRule,
  startedAt: string,
  maturityDate: string | null
): string | null {
  if (rule.kind === "start") return startedAt;
  if (rule.kind === "maturity" && maturityDate)
    return addDays(maturityDate, -rule.daysBefore);
  return null;
}

/** 템플릿으로 단계 배열 생성 (id는 호출측에서 부여) */
export function buildStages(
  pipelineId: string,
  product: PipelineProduct,
  startedAt: string,
  maturityDate: string | null
): Stage[] {
  return PIPELINE_TEMPLATES[product].map((tpl, i) => ({
    id: `${pipelineId}-s${i + 1}`,
    pipelineId,
    stageNo: i + 1,
    name: tpl.name,
    done: false,
    doneAt: null,
    dueAt: initialDue(tpl.rule, startedAt, maturityDate),
    isOverdue: false,
    extendedDueAt: null,
  }));
}

/** 단계 완료 시 "다음 단계" 마감 산출: after면 완료시점+N일, 그 외(maturity 고정/manual)는 유지 */
export function nextDueAt(
  product: PipelineProduct,
  nextStageNo: number,
  doneAtIso: string,
  current: string | null
): string | null {
  const tpl = PIPELINE_TEMPLATES[product][nextStageNo - 1];
  if (!tpl) return current;
  if (tpl.rule.kind === "after") return addDays(doneAtIso.slice(0, 10), tpl.rule.days);
  return current; // maturity 고정 / manual(미정) / start
}

/** 유효 마감(연장 우선) */
export function effectiveDue(stage: Stage): string | null {
  return stage.extendedDueAt ?? stage.dueAt;
}

/** 미완료 + 유효마감 경과 = 지연 */
export function isOverdue(stage: Stage, today = todayIso()): boolean {
  const due = effectiveDue(stage);
  return !stage.done && due !== null && today > due;
}
