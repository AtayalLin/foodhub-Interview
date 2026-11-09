export default defineEventHandler(async (event) => {
  const session = await getSessionUser(event)
  if (!session) {
    throw createError({ statusCode: 401, statusMessage: '請先登入' })
  }

  const row = useDb().prepare('SELECT items FROM carts WHERE user_id = ?').get(session.id) as { items: string } | undefined
  return row ? (JSON.parse(row.items) as CartItem[]) : []
})
