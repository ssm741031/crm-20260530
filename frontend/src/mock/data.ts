/* ============================================================
   목(mock) 샘플 데이터 — 개발용 가짜 데이터.
   ⚠️ 실제 고객 개인정보 금지. 전부 가공의 샘플.
   서버 연결 시 이 파일은 더 이상 쓰이지 않는다.
   ============================================================ */
import type { Category, Customer, Task, User } from "../types";

export const mockUsers: User[] = [
  { id: "u1", name: "대표", loginId: "boss", role: "대표" },
  { id: "u2", name: "김팀장", loginId: "lead1", role: "팀장" },
  { id: "u3", name: "이영업", loginId: "sales1", role: "팀원" },
];

export const mockCategories: Category[] = [
  { id: "c0", name: "기본", parentId: null, color: "var(--cat-default)" },
  { id: "c1", name: "보험설계사 업무", parentId: null, color: "var(--cat-long)" },
  { id: "c1-1", name: "장기보험", parentId: "c1", color: "var(--cat-long)" },
  { id: "c1-2", name: "화재보험", parentId: "c1", color: "var(--cat-fire)" },
  { id: "c2", name: "BNI 활동", parentId: null, color: "var(--cat-claim)" },
];

export const mockCustomers: Customer[] = [
  {
    id: "cust1",
    name: "홍길동(샘플)",
    phone: "010-0000-1234",
    product: "장기보험",
    status: "진행중",
    renewalDate: "2026-08-15",
    ownerId: "u3",
    memo: "샘플 고객 메모",
    consent: { smsConsent: "동의", kakaoConsent: "미확인", consentDate: "2026-05-01" },
  },
  {
    id: "cust2",
    name: "김샘플",
    phone: "010-0000-5678",
    product: "자동차갱신",
    status: "갱신예정",
    renewalDate: "2026-07-30",
    ownerId: "u3",
    memo: "",
    consent: { smsConsent: "미확인", kakaoConsent: "미확인", consentDate: null },
  },
];

const emptyShare = {
  scope: "private" as const,
  sharedWith: [],
  permission: {},
};

export const mockTasks: Task[] = [
  {
    id: "t1",
    customerId: "cust1",
    title: "홍길동 보장분석 자료 준비",
    categoryId: "c1-1",
    timeType: "deadline",
    startDate: null,
    startTime: null,
    endDate: "2026-05-31",
    endTime: "14:00",
    repeat: "none",
    repeatDays: [],
    autoRegen: false,
    reminders: [{ minutesBefore: 60, action: "알람만" }],
    tags: ["보장분석"],
    share: emptyShare,
    attachments: [],
    done: false,
    doneAt: null,
    streak: 0,
  },
  {
    id: "t2",
    customerId: null,
    title: "매일 아침 고객 DB 점검",
    categoryId: "c0",
    timeType: "deadline",
    startDate: null,
    startTime: null,
    endDate: "2026-05-30",
    endTime: "09:00",
    repeat: "daily",
    repeatDays: [],
    autoRegen: false,
    reminders: [],
    tags: ["습관"],
    share: emptyShare,
    attachments: [],
    done: true,
    doneAt: "2026-05-30T09:05:00",
    streak: 5,
  },
  {
    id: "t3",
    customerId: "cust2",
    title: "김샘플 자동차 갱신 비교견적",
    categoryId: "c0",
    timeType: "range",
    startDate: "2026-06-01",
    startTime: "10:00",
    endDate: "2026-06-01",
    endTime: "11:30",
    repeat: "none",
    repeatDays: [],
    autoRegen: false,
    reminders: [],
    tags: ["갱신", "자동차"],
    share: emptyShare,
    attachments: [],
    done: false,
    doneAt: null,
    streak: 0,
  },
];
