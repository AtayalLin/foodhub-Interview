export default defineEventHandler(() => {
  const restaurants = useDb().prepare('SELECT * FROM restaurants ORDER BY rating DESC').all() as unknown as Restaurant[]
  // 列表也會回傳 intro，同樣清理，避免任何讀取端拿到未清理的 HTML
  return restaurants.map(r => ({ ...r, intro: sanitizeIntro(r.intro) }))
})
