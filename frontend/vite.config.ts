import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// Sprint 12: 고보험 서버 /crm 패스에 서브배포 — 자산 경로 prefix 필요
// Sprint 15: PWA (manifest + Service Worker + 아이콘)
// 로컬 dev 시(npm run dev)는 base가 적용돼도 / 와 /crm/ 둘 다 접근 가능
export default defineConfig({
  base: "/crm/",
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: [
        "icons/favicon.ico",
        "icons/apple-touch-icon-180x180.png",
      ],
      manifest: {
        name: "사내 CRM",
        short_name: "CRM",
        description: "사내 고객관리 + 할 일 통합",
        start_url: "/crm/",
        scope: "/crm/",
        display: "standalone",
        theme_color: "#3b82f6",
        background_color: "#ffffff",
        lang: "ko",
        icons: [
          {
            src: "icons/pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "icons/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "icons/maskable-icon-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        // SPA fallback — 클라이언트 라우트(e.g. /crm/tasks) 새로고침 시 index.html 반환
        navigateFallback: "/crm/index.html",
        // /api 요청은 캐싱 X (서버 응답 그대로)
        navigateFallbackDenylist: [/^\/api\//],
      },
      devOptions: {
        // dev 모드에서도 SW 등록 (개발 중 테스트)
        enabled: false, // 1차는 false. true 로 바꾸면 dev 에서도 SW 등록
      },
    }),
  ],
});
