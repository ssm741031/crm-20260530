# Sprint 02: 백엔드 데이터 CRUD (Customer/Task/Pipeline)

> 작성일: 2026-06-01 · 상태: **승인대기**
> 선행: Sprint 01(백엔드 인증) ✅ 완료. 본 sprint 가 끝나면 CRM 화면의 모든 데이터가 진짜 DB 기반 + 사용자별 분리.

## 목표
mock 데이터(메모리)를 PostgreSQL로 이전. CRUD API 추가 + 권한 미들웨어 적용 → CRM 프론트 `api/index.ts` 의 fetch 교체. **새로고침해도 데이터 유지 + 다중 디바이스 동기화 + 사용자별 격리 완성.**

## 완료 기준 (시나리오)
- [ ] **시나리오 1**: sales1 로그인 → 고객 목록에 본인 owner cust 만 표시 (cust1·cust2 — DB 시드 기준)
- [ ] **시나리오 2**: boss 로그인 → 전체 고객 표시 (cust1·cust2·cust3)
- [ ] **시나리오 3**: sales1 이 새 고객 추가 → owner=u3 자동 + DB 저장 → 다른 PC에서 sales1 로그인해도 그대로 보임
- [ ] **시나리오 4**: sales1 가 cust3(u2 owner) 직접 ID로 PUT/DELETE 시도 → **403** (서버 권한 차단, 프론트 우회 시도도 차단)
- [ ] **시나리오 5**: 할일·파이프라인·안내기록도 동일 규칙 (권한 + DB 영속성)
- [ ] **시나리오 6**: 통합검색(Sprint 11)·활동량(Sprint 17) 등 모든 화면 정상 작동
- [ ] **시나리오 7**: 새로고침 → 모든 변경 그대로 유지

## 영향 받는 파일
**[고보험 health_insure-main]**
- `prisma/schema.prisma` — CrmCustomer, CrmTask, CrmPipeline, CrmStage, CrmNoticeLog 등 5개 모델 추가
- `scripts/seed-crm-data.js` (신규) — mock data.ts 와 동일한 샘플로 DB 시드
- `routes/crmCustomers.js`, `routes/crmTasks.js`, `routes/crmPipelines.js`, `routes/crmNoticeLogs.js` (신규)
- `server.js` — 신규 라우트 등록

**[CRM crm-20260530]**
- `frontend/src/api/index.ts` — 모든 mock 함수 → fetch 교체 (`api/` 단일 통로 결정 덕에 다른 화면 변경 0)
- `frontend/src/api/index.ts` 의 `searchAll` 도 백엔드 위임 또는 클라이언트 측 권한 필터 제거 (서버가 이미 필터)
- (선택) `frontend/src/mock/data.ts` → dev fallback 또는 삭제 검토

## 권한 규칙 (Sprint 11 헬퍼와 일치)
서버 미들웨어에서 적용:
- GET 목록: `role==='대표'` ? 전체 : `ownerId === req.crmUser.id`
- POST 생성: ownerId 자동 설정 = `req.crmUser.id` (사용자가 보낸 ownerId 무시)
- PUT/DELETE: owner 본인 또는 대표만 허용, 그 외 **403**
- Task share.scope 추가 검토 (selected/team)

## 단계 (step → verify)
1. [ ] **데이터 모델 + DB push + 시드**
   - Prisma schema 추가 (snake_case, 관계 명시)
   - `prisma db push` → 5개 테이블 생성
   - `scripts/seed-crm-data.js` 실행 → mock data 와 동일한 샘플 적재
2. [ ] **/api/crm/customers CRUD** (GET, POST, PUT, DELETE + 권한)
3. [ ] **/api/crm/tasks CRUD**
4. [ ] **/api/crm/pipelines** (+ stages 중첩 처리, completeStage/extendStage 등 mock 동등 시그니처)
5. [ ] **/api/crm/notice-logs CRUD**
6. [ ] **CRM 프론트 api/index.ts** 의 함수들 fetch 교체 (한꺼번에)
7. [ ] tsc + build + 배포 + 라이브 시나리오 검증

## 리스크 / 주의
- **API 시그니처 호환**: 프론트 `api.getCustomers()` 등이 기대하는 응답 형태 유지 (camelCase user-facing)
- **카테고리(Category)**는 사용자 데이터 아니라 전역 메타 — 별도 처리 (1차는 mock data 안에 두거나 별도 테이블)
- **검색(searchAll) 백엔드 위임**: 1차는 프론트가 GET customers + tasks + pipelines 3개 받아서 substring 매칭 유지 (간단). 운영 데이터 늘면 후속에서 GET /api/crm/search 추가
- **마이그레이션 전략**: mock data.ts 의 샘플과 DB 시드 일치시켜 화면 회귀 0
- **트랜잭션**: completeStage 등 여러 행 동시 변경은 Prisma `$transaction` 사용
- **개인정보**: 로그에 phone/memo 평문 노출 금지 (계획서 §8)
- **HMR/OneDrive 금지사항** 유지

## 자기비판
- 5개 모델 + CRUD 한 sprint = 분량 큼. 단계별로 끊어서 진행 권장 (1→2→3...)
- searchAll 백엔드 이전 1차 미포함 — 데이터 규모 작아 OK
- mock data.ts 폐기 시점은 후속 sprint (1차는 dev fallback 유지)

## 사용자 결정 필요 (승인 전)
1. **단계별 vs 일괄** — (A) 단계 1~7 통째로 진행 (큰 커밋 1~2개) / (B) 모델·각 라우트·프론트 교체를 별도 커밋
2. **카테고리** — (A) 1차 mock data.ts 그대로 (전역 메타) / (B) 즉시 DB로
3. **searchAll** — (A) 프론트 측에서 GET 3개 → 클라이언트 substring (현재 유지) / (B) 백엔드 /api/crm/search 신규
4. **mock data.ts** — (A) 유지 (dev 회귀 안전) / (B) 폐기

---
**승인**: ☐ 사용자 승인 받음 (승인 전 구현 금지)
