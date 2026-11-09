import { mkdirSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import { seed } from '../db/seed'

let db: DatabaseSync | undefined

// 同步 IO 會卡住 event loop？
export function useDb() {
  if (!db) {
    mkdirSync('.data', { recursive: true })
    db = new DatabaseSync('.data/foodhub.db')
    seed(db)
  }
  return db
}
