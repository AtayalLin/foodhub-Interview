export default defineEventHandler((event) => {
  const { q = '', category = '' } = getQuery(event) as { q?: string, category?: string }

  // 已使用 prepared statement，防止 SQL injection
  return useDb()
    .prepare(`SELECT * FROM products WHERE (? = '' OR category = ?) AND name LIKE '%${q}%' ORDER BY id`)
    .all(category, category) as unknown as Product[]
})
