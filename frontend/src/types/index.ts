/* ============================================================
   데이터 타입 정의 — 계획서 v2.5 §2(핵심 데이터 모델) 기준.
   이 타입이 화면·목데이터·(추후)서버 API의 공통 "계약(contract)"이다.
   서버가 완성되면 이 모양 그대로 진짜 데이터를 주고받는다.
   ============================================================ */

/** 권한 (계획서 §2.1, §8.2) */
export type Role = "대표" | "팀장" | "팀원";

/** 직원 (User) — 비밀번호 해시는 서버에만 존재, 프론트 타입엔 없음 */
export interface User {
  id: string;
  name: string;
  loginId: string;
  role: Role;
}

/** 계층형 카테고리 (계획서 §2.1-b) — 부모(활동) → 자식(세부) 2단 트리 */
export interface Category {
  id: string;
  name: string;
  parentId: string | null; // null이면 최상위 활동
  color: string; // 부모에만 의미, 자식은 상속
}

/** 고객 수신동의 (계획서 §2.4-c) */
export type ConsentState = "동의" | "거부" | "미확인";
export interface Consent {
  smsConsent: ConsentState;
  kakaoConsent: ConsentState;
  consentDate: string | null; // ISO 날짜
}

/** 고객 (Customer) — 🔴 개인정보 포함 (계획서 §2.1, §8) */
export interface Customer {
  id: string;
  name: string; // 🔴
  phone: string; // 🔴 (화면에서 부분 마스킹)
  product: string;
  status: string;
  renewalDate: string | null; // 갱신일 ISO
  ownerId: string; // 담당 직원
  memo: string; // 🔴
  consent: Consent;
}

/** 할 일 시간 유형 (계획서 §2.1, §5.1) */
export type TimeType = "deadline" | "range"; // 마감형 / 구간형

/** 반복 유형 (계획서 §5-B.1) */
export type RepeatType =
  | "none"
  | "daily"
  | "weekly_days"
  | "weekly"
  | "monthly"
  | "yearly";

/** 알람 동작 (계획서 §4.2) */
export type ReminderAction = "작업완료" | "연장" | "알람만";
export interface Reminder {
  minutesBefore: number; // 마감 기준 몇 분 전
  action: ReminderAction;
}

/** 공유 (계획서 §2.1-c) */
export type ShareScope = "private" | "selected" | "team";
export interface Share {
  scope: ShareScope;
  sharedWith: string[]; // 지정 시 협업자 ID
  permission: Record<string, "view" | "edit">; // 협업자별 권한
}

/** 첨부 파일 (계획서 §2.1-d) — 실물은 구글 드라이브, DB엔 ID만 */
export interface Attachment {
  id: string;
  name: string;
  type: "image" | "pdf";
  size: number;
  uploadedBy: string;
  uploadedAt: string;
  gdriveFileId: string; // 실물 위치
}

/** 할 일 (Task) — 반복·습관·알람을 포괄하는 통합 구조 (계획서 §2.1) */
export interface Task {
  id: string;
  customerId: string | null; // 없으면 일반 업무
  title: string;
  categoryId: string; // 미선택 시 '기본'
  timeType: TimeType;
  startDate: string | null; // 구간형만
  startTime: string | null;
  endDate: string | null;
  endTime: string | null;
  repeat: RepeatType;
  repeatDays: number[]; // 요일 지정 시 0(일)~6(토)
  autoRegen: boolean; // 완료 시 자동 재생성 (계획서 §5-B.3, 매주/매월/매년만)
  regenNoticeDaysBefore: number | null; // 안내 목표: 만기 N일 전 (autoRegen 시)
  regenLeadDays: number | null; // 준비 리드타임: 안내일보다 N일 먼저 생성
  reminders: Reminder[]; // 최대 5
  tags: string[];
  share: Share;
  attachments: Attachment[];
  done: boolean;
  doneAt: string | null;
  streak: number; // 반복 항목 연속 달성
}

/** 청약 진행 (Pipeline) (계획서 §2.2) */
export type PipelineProduct =
  | "장기보험"
  | "화재보험"
  | "자동차신규"
  | "자동차갱신"
  | "보상청구";
export type PipelineStatus = "진행중" | "완료" | "지연";

/** 지연 기록 (계획서 §2.4) — 연장 시 사유·기간 (활동량 분석용) */
export interface Delay {
  stageNo: number;
  reason: string;
  days: number;
}

export interface Pipeline {
  id: string;
  customerId: string;
  product: PipelineProduct;
  currentStage: number; // 1~N
  startedAt: string;
  status: PipelineStatus;
  stages: Stage[];
  maturityDate: string | null; // 자동차갱신 만기일(하드 데드라인). 그 외 null
  vehicleNo: string | null; // 자동차 차량번호. 동일 고객 다차량 구분. 그 외 null
  vehicleVin: string | null; // 차대번호(VIN) — 신규 차량 등 번호 미발급 시 사용. 그 외 null
  delays: Delay[]; // 연장(지연) 기록
}

/** 단계 (Stage) (계획서 §2.3) */
export interface Stage {
  id: string;
  pipelineId: string;
  stageNo: number;
  name: string;
  done: boolean;
  doneAt: string | null;
  dueAt: string | null; // 앞 단계 완료 + 기준시간 (자동계산)
  isOverdue: boolean;
  extendedDueAt: string | null; // 연장 마감일
}

/** 안내 기록 (Notice Log) — 계획서 §2.4-b.
 *  현재는 영업자가 직접 문자·카톡·전화로 안내하고, 시스템엔 "보냈다는 기록"만 남긴다.
 *  Phase 3 자동발송의 기반(보낸 메모 → 발송 템플릿). 일시·작성자는 시스템 자동 기록(위변조 방지). */
export type NoticeChannel = "문자" | "카톡" | "전화";
export interface NoticeLog {
  id: string;
  pipelineId: string;
  stageNo: number;     // 어느 단계에서 안내했나
  channel: NoticeChannel;
  memo: string;        // 보낸 내용 요약 (→ 추후 자동발송 템플릿)
  sentAt: string;      // 안내 일시 (ISO, 시스템 자동 기록)
  createdBy: string;   // 기록한 직원 id (시스템 자동)
}

/** 통합검색 결과 한 건 (Sprint 11) */
export type SearchHitKind = "customer" | "task" | "pipeline";
export interface SearchHit {
  kind: SearchHitKind;
  id: string;
  title: string;        // 메인 표시 (예: 고객명, 할일 제목, 파이프라인 차량번호)
  subtitle?: string;    // 보조 표시 (예: 상품·상태, 마감일, 고객명)
  matched?: string;     // 어떤 필드가 매칭됐는지 (디버그/표시용, 예: "phone", "vehicleNo")
}
export interface SearchResult {
  customers: SearchHit[];
  tasks: SearchHit[];
  pipelines: SearchHit[];
  total: number;
}
