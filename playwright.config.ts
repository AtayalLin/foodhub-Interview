import { defineConfig, devices } from '@playwright/test'

// 瀏覽器測試（前端 / SSR / hydration）。API 與後端測試在 test/e2e、test/unit，由 Vitest 執行。
// UI 模式開著時會佔用此 port；要同時在終端機執行可用 PW_PORT 指定其他 port
const PORT = Number(process.env.PW_PORT) || 3100

export default defineConfig({
  testDir: './test/browser',
  testMatch: '**/*.spec.ts', // 只收 *.spec.ts，避免誤抓 Vitest 的 *.test.ts
  workers: 1, // 共用同一個測試 server 與 DB，依序執行，結果才穩定
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: 'retain-on-failure', // 失敗時保留 trace，可用 Trace Viewer 倒帶每一步
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    // 先 build 正式版，再以全新的暫存 DB 啟動；PW_SKIP_BUILD=1 可沿用現有 .output
    command: process.env.PW_SKIP_BUILD === '1'
      ? 'node test/browser/serve.mjs'
      : 'npx nuxt build && node test/browser/serve.mjs',
    url: `http://127.0.0.1:${PORT}/api/restaurants`,
    timeout: 240_000,
    reuseExistingServer: false,
    env: { PORT: String(PORT), HOST: '127.0.0.1' },
  },
})
