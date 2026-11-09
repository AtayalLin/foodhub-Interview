// Playwright 用的測試 server：每次啟動都使用全新的暫存 DB，不會動到開發資料（.data/foodhub.db）
import { mkdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const dir = join(tmpdir(), 'foodhub-playwright')
rmSync(dir, { recursive: true, force: true })
mkdirSync(dir, { recursive: true })

process.env.FOODHUB_DB_PATH = join(dir, 'foodhub.db')
process.env.NUXT_JWT_SECRET ??= 'playwright-test-only-secret'
process.env.NODE_ENV = 'production'

await import(pathToFileURL(resolve('.output/server/index.mjs')).href)
