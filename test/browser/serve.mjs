// Playwright 用的測試 server：每次啟動都使用全新的暫存 DB，不會動到開發資料（.data/foodhub.db）
// 每次建立獨立的暫存資料夾，UI 模式與終端機同時執行也不會互相鎖住檔案（Windows 不能刪除使用中的檔案）
import { mkdtempSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const PREFIX = 'foodhub-playwright-'

// Playwright 結束時會直接終止這個程序（Windows 上 exit 事件不一定觸發），所以改在啟動時清掉上次殘留的資料夾；
// 仍在使用中的（例如 UI 模式開著）Windows 不允許刪除，會被略過
for (const name of readdirSync(tmpdir())) {
  if (name.startsWith(PREFIX)) {
    try { rmSync(join(tmpdir(), name), { recursive: true, force: true }) } catch {}
  }
}

const dir = mkdtempSync(join(tmpdir(), PREFIX))

process.env.FOODHUB_DB_PATH = join(dir, 'foodhub.db')
process.env.NUXT_JWT_SECRET ??= 'playwright-test-only-secret'
process.env.NODE_ENV = 'production'

await import(pathToFileURL(resolve('.output/server/index.mjs')).href)
