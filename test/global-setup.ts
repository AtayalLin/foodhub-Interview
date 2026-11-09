import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'

// 設定 TEST_SKIP_BUILD=1 可沿用現有的 .output（只改測試、沒改程式碼時加快速度）
export default function setup() {
  if (process.env.TEST_SKIP_BUILD === '1' && existsSync('.output/server/index.mjs')) return

  const result = spawnSync('npx', ['nuxt', 'build'], { stdio: 'inherit', shell: true })
  if (result.status !== 0) throw new Error('nuxt build failed')
}
