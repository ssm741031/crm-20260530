# Sprint 18: PWA 전환 (manifest + Service Worker + 아이콘)

> 작성일: 2026-05-31 · 상태: **승인대기**
> 관련 계획서: §4 (알림 인프라), §4.3 (모바일 절전 시 지연 → 앱 내 알림 + 푸시 이중 구조)
> 선행: Sprint 14 (포그라운드 알림 완성) · 후속: Sprint 16 (Push 백엔드 + VAPID)

## 목표
CRM 을 PWA(Progressive Web App)로 만들어 **"홈 화면에 추가" 가능 + Service Worker 등록**. iOS 사용자도 푸시 받을 수 있는 토대 마련 (실제 백그라운드 푸시는 Sprint 16).

## 왜 지금
- Sprint 14는 페이지 열린 동안만 알림 — 사용자가 다른 일 하면 알림 X
- 백그라운드 푸시는 **Service Worker 필수** (Sprint 16 전제조건)
- iOS Safari Web Push (16.4+)는 **PWA 설치된 경우만** 동작 — 이를 가능하게 하려면 PWA 전환 먼저

## 완료 기준 (테스트 가능하게)
- [ ] **시나리오 1**: `/crm` 접속 시 Chrome DevTools → Application → Manifest 정상 인식 (이름, 아이콘, theme_color)
- [ ] **시나리오 2**: Chrome PC/Android 주소창에 **"설치" 아이콘** 노출 → 클릭 시 PWA 설치 가능
- [ ] **시나리오 3**: 설치된 PWA 열기 → 주소창·탭 없이 **standalone 모드**
- [ ] **시나리오 4**: iOS Safari → 공유 → **"홈 화면에 추가"** → 홈에 CRM 아이콘 + 이름 표시
- [ ] **시나리오 5**: Service Worker 등록 성공 (DevTools → Application → Service Workers, status: activated)
- [ ] **시나리오 6**: PWA 아이콘이 maskable + 일반 양쪽 정상 표시 (192/512px)
- [ ] **시나리오 7 (오프라인 안전 가드)**: 오프라인 상태에서 새로고침 시 빈 화면 대신 fallback 또는 캐시된 화면. 1차는 minimal — 정적 자산만 캐시, API 호출은 항상 network
- [ ] **시나리오 8**: 새 버전 배포 시 SW 자동 업데이트 (사용자가 보이게 강제 아님 — 다음 방문 시 자연스럽게)

## 영향 받는 파일
- `frontend/package.json` — `vite-plugin-pwa` 의존성 추가
- `frontend/vite.config.ts` — VitePWA 플러그인 설정 (manifest + workbox)
- `frontend/public/icons/icon-192.png` (신규, 임시 또는 사용자 제공)
- `frontend/public/icons/icon-512.png` (신규)
- `frontend/public/icons/icon-maskable-512.png` (신규)
- `frontend/index.html` — theme-color meta, apple-touch-icon link 등 (필요 시 플러그인이 자동)
- `frontend/src/main.tsx` — `import { registerSW } from 'virtual:pwa-register'` (자동 업데이트)

## 단계별 작업 (step → verify)
1. [ ] **vite-plugin-pwa 설치** + dev/build 동작 확인
2. [ ] **아이콘 임시 생성** — 단순 배경 + "C" 텍스트 PNG 3개 (192/512/maskable) — 추후 디자인 교체
3. [ ] **vite.config.ts 설정**:
   - base `/crm/` 유지
   - VitePWA({ registerType: 'autoUpdate', manifest: {...}, workbox: { navigateFallback, runtimeCaching } })
   - manifest: name="사내 CRM", short_name="CRM", start_url="/crm/", scope="/crm/", display="standalone", theme_color="#3b82f6", background_color="#ffffff", icons: [192, 512, 512-maskable]
4. [ ] **main.tsx SW 등록**: `registerSW({ onNeedRefresh, onOfflineReady })` — 1차는 콘솔 로그만, 다음 sprint 에서 사용자 알림
5. [ ] **build + 검증**: dist 안에 manifest.webmanifest, sw.js, workbox-*.js 생성 확인
6. [ ] **로컬 preview** (`npm run preview`) 로 SW 등록 동작 확인 (HTTPS 아니면 localhost 만 가능)
7. [ ] **고보험 재배포 → 라이브 시나리오 검증**
8. [ ] **작업로그 + 커밋**

## 리스크 / 주의
- **/crm 서브패스 scope**: manifest의 `scope: '/crm/'` + `start_url: '/crm/'` 필수. 잘못 설정 시 SW가 /crm 외 경로도 잡거나 PWA 가 잘못 동작
- **iOS 한계**: maskable 아이콘 일부 무시, `display: standalone` 만 지원. 그래도 핵심 기능(홈 화면 추가, Web Push)은 동작
- **HTTPS 필수**: SW 는 HTTPS 또는 localhost 만 가능 — 라이브(goboheom.com)는 OK, 로컬 IP 접근은 X
- **캐시 정책**: 1차는 minimal (precache 정적 자산만, API 호출은 NetworkOnly). 오프라인 모드는 후속
- **Basic Auth + SW**: Basic Auth로 보호된 환경에서 SW 가 정상 등록되는지 확인 — 의외로 SW 등록 자체엔 영향 적음 (등록 요청도 BA 거침)
- **자동 업데이트 UX**: 1차는 silent autoUpdate. 사용자가 변경 못 느낄 수 있음 — Sprint 16 에서 "새 버전 있음" 안내 토스트 추가 검토
- **HMR 금지사항**: import 먼저 → 사용처
- **OneDrive Write 규칙**: 순차 작성 + head/grep

## 자기비판 (이 계획의 약점)
- 임시 아이콘 — 사내 CRM 브랜딩 X. 디자인 작업 별도 필요
- 오프라인 모드 1차 미구현 — 정적 자산만 cache, 데이터는 network 전용. 진짜 오프라인 작성/동기화는 후속 큰 sprint
- iOS Web Push 는 PWA 설치 + 16.4+ 필요 — 사용자 안내 UI 가 1차에 없음 (Sprint 16 에서 "푸시 받으려면 홈 화면 추가" 안내 추가)
- SW 디버깅 어려움 — 첫 등록 후 캐싱이 꼬이면 사용자가 캐시 클리어 필요할 수 있음

## 사용자 결정 필요 (승인 전)
1. **아이콘** — (A) **임시 자동 생성** 추천 (작업자가 단색 배경+"C" PNG 3개 만듦) / (B) 사용자가 디자인 파일 제공
2. **PWA 이름** — (A) **"사내 CRM"** 추천 / (B) 다른 이름
3. **theme color** — (A) **#3b82f6** (blue, 결정사항 누적 §디자인 X — 작업자 기본값) / (B) 사용자 지정 HEX
4. **start_url** — (A) **`/crm/`** 추천 (RequireAuth 가 미인증이면 자동 /crm/login 으로) / (B) `/crm/tasks` 또는 `/crm/login` 명시
5. **SW 등록 시 사용자 알림** — (A) **silent autoUpdate** 추천 / (B) "새 버전" 토스트 (Sprint 16 에서 추가 권장)

---
**승인**: ☐ 사용자 승인 받음 (승인 전 구현 금지)
