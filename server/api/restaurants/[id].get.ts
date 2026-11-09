export default defineEventHandler((event) => {
  const id = Number(getRouterParam(event, 'id'))
  const restaurant = useDb().prepare('SELECT * FROM restaurants WHERE id = ?').get(id) as Restaurant | undefined
  if (!restaurant) {
    throw createError({ statusCode: 404, statusMessage: '找不到餐廳' })
  }
  // intro 是店家可編輯的 HTML，前端會用 v-html 顯示，輸出前以白名單清理（防 XSS）
  return { ...restaurant, intro: sanitizeIntro(restaurant.intro) }
})
