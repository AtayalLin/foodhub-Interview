interface CartBody {
  items: CartItem[]
}

export default defineEventHandler(async (event) => {
  const session = await getSessionUser(event)
  if (!session) {
    throw createError({ statusCode: 401, statusMessage: '請先登入' })
  }

  // 購物車的擁有者一律取自 session，不採用 body 傳來的 userId（原本可藉此覆蓋任何人的購物車）
  const body = await readBody<CartBody | null>(event)
  if (!Array.isArray(body?.items)) {
    throw createError({ statusCode: 400, statusMessage: '購物車格式不正確' })
  }

  useDb()
    .prepare('INSERT OR REPLACE INTO carts (user_id, items, updated_at) VALUES (?, ?, ?)')
    .run(session.id, JSON.stringify(body.items), new Date().toISOString())

  return { ok: true }
})
