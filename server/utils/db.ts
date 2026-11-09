import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { seed } from '../db/seed'

let db: DatabaseSync | undefined

// 測試時以 FOODHUB_DB_PATH 指定獨立的資料庫，避免動到開發資料
const DB_PATH = process.env.FOODHUB_DB_PATH || '.data/foodhub.db'

// 同步 IO 會卡住 event loop？
export function useDb() {
  if (!db) {
    mkdirSync(dirname(DB_PATH), { recursive: true })
    db = new DatabaseSync(DB_PATH)
    seed(db)
  }
  return db
}
