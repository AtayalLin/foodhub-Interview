export default defineEventHandler((event) => {
  const id = Number(getRouterParam(event, 'id'))
  const restaurant = useDb().prepare('SELECT * FROM restaurants WHERE id = ?').get(id) as Restaurant | undefined
  if (!restaurant) {
    throw createError({ statusCode: 404, statusMessage: '找不到餐廳' })
  }
  return restaurant
})
