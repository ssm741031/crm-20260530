# Sprint 14: 알람 Phase 1 — 포그라운드 알림 + 클라이언트 스케줄러

> 작성일: 2026-05-31 · 상태: **승인대기**
> 관련 계획서: 사내CRM_개발계획서_v2.5.md §4 (알림), §3.2 (마감), §4.2 (알람 설정)
> 후속: Sprint 15 (PWA), Sprint 16 (Push 백엔드), Sprint 17 (강한 푸시·정책)

## 목표
사용자가 페이지를 열어둔 동안 `Task.reminders` 도래 시 **OS 알림** (Notification API) + 클릭 시 해당 Task 이동. 권한 거부 시 in-app 토스트 fallback. 백엔드 무관, 작업자 단독.

## 왜 Phase 1 부터
- 알람 기능은 PC·모바일 동시 (계획서 §4.1) 가 최종이지만 백그라운드 푸시는 백엔드+VAPID+Service Worker 필요 → 일정 김
- 사용자가 실제로 페이지를 열어두는 시간이 길어 포그라운드만으로도 즉시 가치 있음
- Phase 1로 알림 흐름·UX 검증 후 Phase 2(SW+Push)에서 백그라운드 확장

## 완료 기준 (테스트 가능하게)
- [ ] **시나리오 1**: 알림 권한 `default` 상태에서 헤더 또는 우측 상단에 "알림 허용" 배너 표시
- [ ] **시나리오 2**: 배너의 "허용" 클릭 → `Notification.requestPermission()` 호출 → `granted` 시 배너 사라짐
- [ ] **시나리오 3**: 권한 `granted` + Task.reminders 의 알람 시점 도래 → **OS 알림** (제목: Task title, 본문: "N분 후 마감" 또는 동작별 메시지) + 기본 시스템 알림음
- [ ] **시나리오 4**: 알림 클릭 → 앱 포커스 + `/tasks?focus=<taskId>` 이동
- [ ] **시나리오 5**: 권한 `denied` → in-app 토스트 (우측 상단 또는 하단)로 동일 메시지 표시
- [ ] **시나리오 6**: 같은 알람이 한 페이지 세션 동안 **두 번 발사되지 않음** (메모리 dedup)
- [ ] **시나리오 7**: 페이지 이탈 / 라우트 변경 / 컴포넌트 unmount → 미발사 setTimeout 모두 clear (메모리 누수 X)
- [ ] **시나리오 8**: 알람 동작별 메시지 분기 — `작업완료` / `연장` / `알람만` 각각 다른 본문/버튼 안내 (실제 버튼은 Phase 2에서 SW로)
- [ ] **시나리오 9**: 권한 거부 후 사용자가 브라우저 설정에서 풀 때 대비 — 페이지 재방문 시 자동 재감지

## Phase 1 의도된 한계 (Phase 2/3 에서 해소)
- 페이지 닫으면 알람 X
- 알림 action 버튼 (작업완료 즉시 처리) X — Notification API 의 actions 는 Service Worker 필요
- 다중 탭 중복 알람 가능 (탭마다 자체 스케줄러)
- 새로고침 시 dedup 초기화 (이미 발사된 알람이 시간 안에 있으면 재발사 가능 — 1차는 허용)
- 시계 변화·절전모드 시 정확도 떨어짐

## 영향 받는 파일
- `frontend/src/utils/reminders.ts` (신규) — Task → upcoming reminder times 계산 헬퍼
- `frontend/src/contexts/NotificationContext.tsx` (신규) — Provider + 권한 상태 + 스케줄러
- `frontend/src/hooks/useNotification.ts` (신규) — Context wrapper
- `frontend/src/components/NotificationPermissionBanner.tsx` + `.css` (신규)
- `frontend/src/components/Toast.tsx` + `.css` (신규) — in-app fallback
- `frontend/src/main.tsx` — NotificationProvider 감싸기
- `frontend/src/app/AppShell.tsx` — 배너 + ToastContainer 마운트

## 단계별 작업 (step → verify)
1. [ ] **utils/reminders.ts**: `computeReminderTimes(task)` — Task.endDate + endTime - minutesBefore 로 미래 알람 시각(Date) 배열 반환. 검증: 단위 테스트 (Node native TS)
2. [ ] **NotificationContext + useNotification 훅**: 권한 상태(`default|granted|denied`), `requestPermission()`, `notify({title, body, taskId})` 메서드. notify 는 권한 granted 면 Notification API, 아니면 Toast 큐 push. 검증: tsc 통과
3. [ ] **스케줄러**: Provider 안 useEffect 가 `api.getTasks()` 호출 후 모든 미래 알람을 setTimeout 등록 (task id + reminderIdx 키로 Map 보관, 중복 방지). 라우트 변경/언마운트 시 clear. 검증: 콘솔 로그로 스케줄링 시점 확인
4. [ ] **NotificationPermissionBanner**: 권한 default 일 때만 표시 + "허용" 버튼. AppShell 상단 띠. 검증: 화면 노출/숨김
5. [ ] **Toast / ToastContainer**: 우측 상단 스택, 5초 후 자동 닫기, 클릭 시 taskId 있으면 navigate. 검증: 권한 denied 환경 + notify() 호출 시 토스트 표시
6. [ ] **AppShell + main.tsx 통합**: Provider 감싸기 + 배너·ToastContainer 마운트
7. [ ] **dev preview 시나리오 검증** — 짧은 minutesBefore (예: 1분) 로 mock task 추가 후 1분 기다림 (또는 시간 조정)
8. [ ] **빌드 + tsc + 작업로그 + 커밋**

## 리스크 / 주의
- **권한 거부 후**: 브라우저 설정에서 풀어야 함 — UI 에서 "권한이 거부되어 OS 알림 X, 화면 토스트만 표시" 안내 (오해 방지)
- **dedup 한계**: 새로고침 시 동일 알람 재발사 가능 (1차 의도, 후속에서 localStorage 로 확장 가능)
- **다중 탭**: 각 탭이 자체 스케줄러 → 중복 알람 — Phase 2 SW 로 단일화
- **시간 정확도**: setTimeout 은 절전·시계조정 영향. Phase 1 한계 명시
- **HMR 금지사항**: import 먼저 → 사용처
- **OneDrive Write 규칙**: 순차 작성 + head/grep 검증
- **개인정보 마스킹**: 알림 본문에 고객 이름·연락처 들어갈 수 있음 → 마스킹은 1차 미적용 (사용자 폰/PC 본인만 보임 가정), 후속 sprint 에서 §8 규정 따라 마스킹 정책 결정

## 자기비판 (이 계획의 약점)
- 페이지 닫으면 알람 X — 진짜 가치는 Phase 2 백그라운드 푸시에서 나옴
- 알림 action 버튼 없음 — "작업완료" 액션은 사용자가 앱으로 가서 직접 눌러야
- 푸시 시점 정확도: setTimeout 누적 오차 (긴 대기 시 수십 초 지연 가능)
- 마감 초과 강한 푸시 (§3.2) 은 Phase 3 로 이월
- 파이프라인 단계 마감(Stage.dueAt) 알림은 1차 미포함 — Task 한정

## 사용자 결정 필요 (승인 전)
1. **알림 클릭 이동 경로** — (A) `/tasks?focus=<id>` 추천 / (B) Task 상세 페이지 (현재 없음 — 후속) / (C) 캘린더 해당 일
2. **in-app 토스트 위치** — (A) 우측 상단 추천 / (B) 우측 하단 / (C) 화면 중앙 상단
3. **권한 배너 위치** — (A) AppShell 헤더 바로 아래 띠 추천 / (B) 우측 상단 작은 배지
4. **알람 본문 양식 (기본)** — (A) "{Task title} — 마감 {N분 전}" + 동작 안내 추천 / (B) 더 상세 (고객명 포함)
5. **자동 권한 요청 시점** — (A) 사용자가 "허용" 버튼 누를 때만 추천 (정중) / (B) 첫 로그인 직후 자동 요청 (적극, 거부 시 영구 차단 위험)

---
**승인**: ☐ 사용자 승인 받음 (승인 전 구현 금지)
