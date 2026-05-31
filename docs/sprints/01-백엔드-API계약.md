# Sprint 01 — 백엔드 API 계약 (이팀장 인계 문서)

> 작성일: 2026-05-31 · 작성자: 작업자(프론트) · 대상: 이팀장(백엔드)
> 상태: **백엔드 작업 시작 전 검토·확정 필요**
> 관련: 기존 `01-프로젝트기초-인증권한.md` (전체 plan), 본 문서는 **API 계약 상세**

## 1. 왜 이 문서가 필요한가

프론트 측은 Sprint 11(권한 필터) + Sprint 13(mock 인증 골격)까지 완성되어 있고, **이팀장 백엔드 완성 시 `api/auth.ts` 와 `api/index.ts` 의 함수 내부 mock 만 fetch 로 교체하면** 즉시 진짜 인증·데이터 분리로 전환됩니다.

전환을 깔끔하게 하려면 백엔드가 **프론트가 이미 가정한 API 형태**로 만들어주는 게 가장 빠릅니다. 이 문서는 그 가정을 명세화합니다.

> 이팀장이 다르게 만들어도 작업자가 어댑터 추가하면 되지만, 처음부터 맞추면 작업 절약.

## 2. 프론트 현재 가정 — Quick Reference

```
1. /api/* 는 백엔드 (Express 또는 FastAPI)
2. 인증 = 로그인 → 서버가 식별자 발급 → 이후 요청에 자동 첨부
3. 권한 = ownerId / share.scope (Sprint 11 권한 헬퍼 기준)
4. 데이터 모델 = frontend/src/types/index.ts 그대로 (camelCase)
5. 에러는 HTTP status code + JSON body { error: "메시지" }
```

## 3. 인증 API (필수, Sprint 01)

### 3.1 POST /api/login
**요청**:
```json
{ "loginId": "sales1", "password": "평문" }
```
**응답 200** (성공):
```json
{
  "user": { "id": "u3", "loginId": "sales1", "name": "이영업", "role": "팀원" }
}
```
**응답 401** (인증 실패):
```json
{ "error": "아이디 또는 비밀번호가 올바르지 않습니다." }
```
**중요**:
- 비밀번호는 bcrypt 또는 argon2 해시 비교
- 401 응답 시 평문 비밀번호를 로그에 남기지 말 것 (금지사항 §개인정보)
- 세션/JWT 발급은 **응답 헤더** 또는 **Set-Cookie** 로 (3.4 결정)
- timing attack 방지: 사용자 없어도 해시 비교 더미 실행 권장

### 3.2 POST /api/logout
**요청**: body 없음 (또는 빈 객체), 인증 헤더/쿠키 필요
**응답 204** (No Content)
**중요**: 세션/토큰 무효화 (서버 측 블랙리스트 또는 쿠키 만료)

### 3.3 GET /api/me
**요청**: 인증 헤더/쿠키 필요
**응답 200**:
```json
{ "id": "u3", "loginId": "sales1", "name": "이영업", "role": "팀원" }
```
**응답 401** (비로그인 또는 토큰 무효):
```json
{ "error": "인증이 필요합니다" }
```
**용도**: 페이지 새로고침 시 프론트가 호출해 currentUser 복원

### 3.4 ⚠️ 결정 필요 — 인증 방식

| 옵션 | 장점 | 단점 |
|---|---|---|
| **A. 세션 쿠키 (httpOnly)** | XSS 안전 / 자동 첨부 / 무효화 쉬움 | CORS·CSRF 신경 / 서버 세션 저장소 필요 |
| **B. JWT (Authorization 헤더)** | 무상태 / 모바일 친화 | XSS 시 localStorage 토큰 탈취 위험 / 무효화 복잡 |
| **C. JWT (httpOnly 쿠키)** | A의 보안 + B의 무상태 | 가장 복잡, CSRF 토큰 필요 |

**작업자 권장**: **A (세션 쿠키 httpOnly)** — 20인 사내용이라 무상태 이점 적고, XSS 안전이 우선.

→ 이팀장 결정 후 프론트가 fetch 옵션(`credentials: 'include'` vs Authorization 헤더) 맞춰 교체.

## 4. 데이터 모델 (User 테이블 — Sprint 01 필수)

`frontend/src/types/index.ts` 의 `User` 인터페이스와 일치:
```sql
CREATE TABLE users (
  id            TEXT PRIMARY KEY,           -- UUID 또는 'u1','u2',... (mockUsers와 호환되는 짧은 ID 권장)
  login_id      TEXT UNIQUE NOT NULL,        -- 로그인용 (예: sales1)
  name          TEXT NOT NULL,               -- 표시명 (이영업)
  role          TEXT NOT NULL,               -- '대표' | '팀장' | '팀원'
  password_hash TEXT NOT NULL,               -- bcrypt
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);
```
**중요**:
- 프론트는 `User { id, loginId, name, role }` (snake_case → camelCase 변환은 백엔드 응답 시점에)
- 또는 백엔드도 camelCase 응답으로 통일 권장
- `password_hash`는 절대 응답에 포함하지 말 것

**시드 (개발용)**: mockUsers 와 동일하게 3명 (id u1·u2·u3) — pw는 이팀장이 직접 설정·전달

## 5. 데이터 API (Sprint 01 이후, 권한 미들웨어 포함)

### 5.1 GET /api/customers
**응답 200**: `Customer[]` (currentUser 권한으로 자동 필터 — 대표는 전체, 그 외는 ownerId === me.id)
프론트 타입: `frontend/src/types/index.ts` 의 `Customer`

### 5.2 GET /api/tasks
**응답 200**: `Task[]` (Sprint 11 `canViewTask` 와 동일 규칙으로 필터)

### 5.3 GET /api/pipelines
**응답 200**: `Pipeline[]` (Sprint 11 `canViewPipeline` 와 동일 규칙)

### 5.4 POST / PUT / DELETE
프론트 `api/index.ts` 의 mock 함수 시그니처 기준:
- `POST /api/customers` (body: 새 고객)
- `PUT /api/customers/:id` (body: 변경 필드)
- `DELETE /api/customers/:id`
- 동일 패턴: tasks, pipelines

**중요**:
- 모든 변경 작업도 권한 검증 (자기 owner 아니면 403)
- 응답은 변경된 객체 또는 204

## 6. 권한 미들웨어 규칙 (Sprint 11 권한 헬퍼와 일치)

| 엔티티 | 보임 조건 |
|---|---|
| Customer | `me.role === '대표'` OR `customer.ownerId === me.id` |
| Task | 대표 OR `share.scope === 'team'` OR (`scope === 'selected'` AND `me.id ∈ sharedWith`) OR (customerId 있고 customer.ownerId === me.id) |
| Pipeline | customer 권한 상속 (customer.ownerId === me.id 또는 대표) |

**1차 한계** (프론트 결정사항 누적 §Sprint 11):
- `User.teamId` 없음 → 팀장도 본인 owner만 (팀 모델은 후속 sprint)
- `Task.ownerId` 없음 → customerId 의 owner 를 task owner 로 간주

## 7. 에러 응답 표준

```
HTTP 400 Bad Request    — 요청 검증 실패
HTTP 401 Unauthorized   — 인증 안 됨/토큰 무효
HTTP 403 Forbidden      — 인증됐으나 권한 없음
HTTP 404 Not Found
HTTP 409 Conflict       — 중복 loginId 등
HTTP 500 Internal Server Error
```
**Body 형식 통일**:
```json
{ "error": "사람이 읽을 메시지", "code": "OPTIONAL_MACHINE_CODE" }
```
프론트는 `error` 만 화면에 표시.

## 8. 환경 (고보험 서버 재활용 — 결정사항 §2026-05-30)

- **현재 고보험 Cloud Run**: asia-northeast3, `goboheom` 서비스, Node Express (CRM 정적 서빙 중)
- **CRM 백엔드 옵션**:
  - **A. 같은 Express 컨테이너에 `/api/crm/*` 추가** (단일 서비스, 가장 단순)
  - **B. 별도 Cloud Run 서비스** + Firebase rewrite (자원 격리)
- **DB**: PostgreSQL (고보험과 같은 인스턴스 + 별도 DB 또는 별도 인스턴스 — 이팀장 결정)
- **환경변수**: `.env` (gitignore). 시크릿은 Cloud Run env 또는 Secret Manager

## 9. 마이그레이션 (mock → 실제) — 작업자 영역

이팀장 백엔드 완성 시 작업자가 해야 할 것:
1. `frontend/src/api/auth.ts`:
   - `login()`: `mockUsers.find()` → `fetch('/api/login', { credentials:'include', body: {loginId, password} })`
   - `logout()`: `fetch('/api/logout', { method:'POST', credentials:'include' })`
   - `restoreSession()` / `getCurrentUser()`: `fetch('/api/me', { credentials:'include' })`
2. `frontend/src/api/index.ts`:
   - 모든 함수의 `mockXxx` 참조를 `fetch('/api/...')` 로 교체
   - 권한 필터(`canViewCustomer` 등) 호출 제거 — 서버에서 이미 필터
3. `frontend/src/mock/data.ts`: 삭제 or dev-only로 격하
4. localStorage 키 `crm.session.v1` 정리 (쿠키 방식이면 불필요)

→ **단일 통로(api/) 결정 덕에 다른 화면 코드 변경 0건**

## 10. 결정 필요 체크리스트 (이팀장)

- ☐ 백엔드 프레임워크: **FastAPI vs Express** (개발계획서 §2.1 = "Python FastAPI" 인데 고보험은 Express. 같은 컨테이너 옵션이면 Express 통일 권장)
- ☐ 인증 방식: **A. 세션 쿠키 / B. JWT(헤더) / C. JWT(쿠키)** — §3.4
- ☐ 배포 구조: **A. 고보험 컨테이너 통합 / B. 별도 Cloud Run 서비스** — §8
- ☐ DB: **고보험과 같은 PostgreSQL 인스턴스 (별도 DB) / 별도 인스턴스**
- ☐ User ID 체계: **mockUsers 와 호환되는 'u1','u2','u3' / 새 UUID로 시드**
- ☐ User.teamId 추가 여부 (Sprint 11 한계 해소) — 이번 Sprint 01에 포함 vs 후속
- ☐ password 정책 (8자/숫자+영문 등) — 고보험과 통일 vs 별도

## 11. 권장 작업 순서 (이팀장)

```
1. 결정 체크리스트 답변 → 작업자에게 공유
2. PostgreSQL 연결 + users 테이블 + 시드 3명 (pw 직접 설정)
3. POST /api/login (해시 비교 + 인증 발급)
4. POST /api/logout + GET /api/me
5. 인증 미들웨어 (모든 보호 라우트 공통)
6. 프론트 측 마이그레이션 시도 (작업자) — 로그인·로그아웃 동작 확인
7. customers/tasks/pipelines 테이블 + 시드
8. GET 라우트 (권한 미들웨어 적용)
9. POST/PUT/DELETE (권한 검증)
10. 프론트 측 데이터 fetch 마이그레이션 (작업자)
```

각 단계는 작업자가 즉시 프론트에서 검증 가능 (mock 교체 → 동작 확인 → 다음 단계).

## 12. 보안 의무 (계획서 §8, 금지사항 체크리스트)

- 비밀번호 평문 저장 금지 (bcrypt/argon2)
- 비밀번호·고객 PII 로그 노출 금지
- 모든 데이터 API에 권한 미들웨어 (프론트 필터에 의존 금지)
- HTTPS (고보험 서버 이미 적용)
- CORS: 같은 도메인이면 불필요, 별도 서비스면 신중하게
- 마스킹: 화면 표시 시 연락처·청약서 등 (프론트 책임)

---

## 13. 작업자 → 이팀장 소통 포인트

1. **결정 체크리스트 (§10)** 답변
2. 백엔드 작업 1단계(users 테이블 + /api/login) 완성 시 **작업자에게 알림** → 작업자가 mock 인증을 진짜 fetch로 1차 교체 시도
3. CORS·쿠키 도메인 등 환경 이슈는 양측 같이 확인
4. 권한 미들웨어 시나리오 검증 (sales1 로 다른 사용자 데이터 시도 → 403)

---

**문서 위치**: `docs/sprints/01-백엔드-API계약.md`
**관련**: `01-프로젝트기초-인증권한.md` (전체 plan), `docs/기준/01_결정사항_누적.md` (확정사항)
