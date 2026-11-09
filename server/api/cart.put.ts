interface CartBody {
  userId: number
  items: CartItem[]
}

export default defineEventHandler(async (event) => {
  const session = await getSessionUser(event)
  if (!session) {
    throw createError({ statusCode: 401, statusMessage: '請先登入' })
  }

  const { userId, items } = await readBody<CartBody>(event)
  useDb()
    .prepare('INSERT OR REPLACE INTO carts (user_id, items, updated_at) VALUES (?, ?, ?)')
    .run(userId, JSON.stringify(items ?? []), new Date().toISOString())

  return { ok: true }
})
