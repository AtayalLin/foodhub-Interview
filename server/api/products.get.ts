// query 參數重複出現時（?q=a&q=b）h3 會給陣列，統一轉成字串，避免綁定參數時出錯
const asString = (v: unknown) => (typeof v === 'string' ? v : '')

export default defineEventHandler((event) => {
  const query = getQuery(event)
  const q = asString(query.q)
  const category = asString(query.category)

  // 已使用 prepared statement，防止 SQL injection
  // ↑ 更正：原寫法雖然呼叫了 prepare()，但 q 是用字串樣板 `'%${q}%'` 直接串進 SQL，
  //   並沒有參數化，可被 UNION 注入撈出 users 資料表（含密碼 hash）。
  //   現在 q 也改用 ? 綁定；並跳脫 LIKE 的萬用字元 % _ \，讓使用者輸入只會被當成一般文字搜尋。
  const keyword = q.replace(/[\\%_]/g, ch => `\\${ch}`)
  return useDb()
    .prepare(`SELECT * FROM products WHERE (? = '' OR category = ?) AND name LIKE ? ESCAPE '\\' ORDER BY id`)
    .all(category, category, `%${keyword}%`) as unknown as Product[]
})
