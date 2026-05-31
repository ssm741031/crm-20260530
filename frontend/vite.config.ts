import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// Sprint 12: 고보험 서버 /crm 패스에 서브배포 — 자산 경로 prefix 필요
// 로컬 dev 시(npm run dev)는 base가 적용돼도 / 와 /crm/ 둘 다 접근 가능
export default defineConfig({
  base: '/crm/',
  plugins: [react()],
})
