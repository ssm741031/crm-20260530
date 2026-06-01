/* @vite-pwa/assets-generator 설정 (Sprint 15)
 * 명령: npx pwa-assets-generator
 * source.svg 한 개 → 192/512/maskable PNG + favicon 등 자동 생성
 */
import { defineConfig, minimalPreset as preset } from "@vite-pwa/assets-generator/config";

export default defineConfig({
  preset,
  images: ["public/icons/source.svg"],
});
