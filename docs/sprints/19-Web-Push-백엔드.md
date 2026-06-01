# Sprint 19: Web Push 백엔드 (백그라운드 알림 완성)

> 작성일: 2026-06-01 · 상태: **승인대기**
> 선행: Sprint 14 (포그라운드 알림) + Sprint 18 (PWA: manifest + SW)
> 결과: 페이지 닫혀있어도 OS 알림 — PC/Android 즉시 / iOS는 PWA 설치 후

## 목표
서버 측 cron 이 마감 임박/도래 task 를 감지해 **사용자 기기로 Web Push 발송** → Service Worker 가 OS 알림 표시. 페이지 안 켜져 있어도 작동.

## 완료 기준 (시나리오)
- [ ] **시나리오 1**: 사용자가 "알림 허용" → 백엔드 `crm_push_subscriptions` 에 endpoint 저장
- [ ] **시나리오 2**: 본인 owner task 의 reminder 시각 도래 → 1분 이내 OS 알림 (페이지 안 켜져 있어도)
- [ ] **시나리오 3**: 알림 클릭 → CRM 의 `/tasks?focus=<id>` 로 이동
- [ ] **시나리오 4**: 한 사용자가 PC + 모바일 둘 다 구독 → 양쪽 모두 동시 알림
- [ ] **시나리오 5**: 같은 알람이 두 번 발사 안 됨 (서버측 `notified_at` 표시)
- [ ] **시나리오 6**: iOS PWA 설치 후 알림 권한 허용 → 동일 동작
- [ ] **시나리오 7**: 사용자가 구독 해제 → 백엔드에서 endpoint 삭제 → 그 기기엔 더 이상 푸시 X

## 영향 받는 파일
**[고보험 backend]**
- `prisma/schema.prisma` — `CrmPushSubscription` 모델 (user_id, endpoint, p256dh, auth, ua)
- `prisma/schema.prisma` — `CrmTask.notified_reminders Json` (어느 reminder idx 가 이미 발사됐는지 — dedup)
- `package.json` — `web-push` 의존성 추가
- `routes/crmPush.js` (신규) — vapid-public-key / subscribe / unsubscribe
- `scripts/push-tick.js` (신규) — cron 진입점 — 미발사 reminder 찾아 push 발송
- `server.js` — crmPush 라우트 등록 + (선택) 자체 setInterval cron

**[CRM frontend]**
- `src/contexts/NotificationContext.tsx` — 권한 허용 후 push subscribe 흐름 추가
- `src/api/index.ts` — push subscribe/unsubscribe API 호출 함수 추가
- `src/sw-push.ts` (신규) — Service Worker push 이벤트 핸들러 (vite-plugin-pwa 의 injectManifest 모드 사용 또는 별도 SW)

## VAPID 키 (한 번 생성 후 env 영구)
- `npx web-push generate-vapid-keys` → `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` 출력
- Cloud Run env 에 저장. 공개 키는 프론트가 GET 으로 가져와 subscribe 시 사용

## 단계 (step → verify)
1. [ ] **web-push 의존성 + VAPID 키 생성** → env 설정
2. [ ] **Prisma**: CrmPushSubscription + CrmTask.notified_reminders 추가 → DB push
3. [ ] **백엔드 라우트 routes/crmPush.js**:
   - GET `/api/crm/push/vapid-public-key`
   - POST `/api/crm/push/subscribe` (PushSubscription 저장)
   - POST `/api/crm/push/unsubscribe` (endpoint 삭제)
4. [ ] **프론트 구독 흐름**:
   - 권한 허용 후 SW registration.pushManager.subscribe(...)
   - 결과 endpoint+keys 를 백엔드에 POST
5. [ ] **Service Worker push 핸들러** (vite-plugin-pwa injectManifest 모드로 src/sw-push.ts 추가)
   - 'push' 이벤트 → showNotification(title, body, data.taskId)
   - 'notificationclick' 이벤트 → clients.openWindow('/crm/tasks?focus=' + taskId)
6. [ ] **scripts/push-tick.js**:
   - 모든 미완료 task 의 reminders 중 fireAt <= now + 1분 인 것 추출
   - notified_reminders 에 이미 있는 idx 제외
   - 해당 task 의 owner(또는 customer.owner) 의 모든 push subscription 으로 발송
   - notified_reminders 에 idx 추가
7. [ ] **Cron 스케줄링**:
   - 옵션 A: server.js 내 `setInterval(() => require('./scripts/push-tick')(), 60_000)` (Cloud Run min-instances=1 필요)
   - 옵션 B: Cloud Scheduler → HTTP POST /api/crm/push/tick (별도 endpoint + secret)
8. [ ] **빌드/배포 + 시나리오 검증**

## 리스크 / 주의
- **VAPID 키 노출 금지** — private key 는 backend env 만, 절대 commit X
- **권한 거부 후**: Sprint 14 와 동일 — Toast fallback (포그라운드만)
- **dedup**: notified_reminders 로 한 reminder 가 두 번 발사 안 되게. 다중 인스턴스 동시 cron 실행도 트랜잭션으로 안전
- **iOS 한계**: PWA 설치 + 16.4+ 만. 안내 UI 별도 (후속)
- **Cloud Run idle scaling**: min-instances 0 이면 self-cron 못 함 → Cloud Scheduler 권장
- **개인정보**: 알림 본문에 고객명 포함 — 본인 폰/PC 만 보임 가정 (Sprint 14 동일)
- **endpoint 만료**: push 발송 시 410 Gone 응답 → 해당 endpoint 삭제 (자동 정리)

## 자기비판
- Cloud Scheduler 사용 시 인증/secret 필요 — 작업 좀 늘어남
- 다중 디바이스 가입 시 알림 N번 (UX 혼란 가능) — 한 사용자 N기기 = N alert 자연
- 알림 사운드/우선순위 OS 의존 — 커스터마이즈 한계
- Service Worker injectManifest 모드 = vite-plugin-pwa 설정 복잡도 증가
- iOS 미설치 사용자는 백그라운드 알림 안 받음 → 별도 안내 필요

## 사용자 결정 필요 (승인 전)
1. **Cron 방식** — (A) Cloud Scheduler (외부 트리거, 권장) / (B) Cloud Run self setInterval (min-instances=1, 비용↑)
2. **Cron 주기** — (A) **1분마다** (권장) / (B) 5분마다
3. **다중 기기 모두 발송** — (A) 모두 권장 / (B) 가장 최근 1개만
4. **알림 본문** — (A) Sprint 14 그대로 / (B) 다르게
5. **iOS 미설치 사용자 안내** — (A) 권한 배너에 "백그라운드 알림은 홈 화면 추가 필요" 문구 (권장) / (B) 후속 sprint

---
**승인**: ☐ 사용자 승인 받음 (승인 전 구현 금지)
