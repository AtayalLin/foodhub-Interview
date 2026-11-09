export default defineEventHandler(async (event) => {
  const session = await getSessionUser(event)
  if (!session) {
    throw createError({ statusCode: 401, statusMessage: '請先登入' })
  }

  const db = useDb()
  const id = Number(getRouterParam(event, 'id'))
  // 只能讀自己的訂單。別人的訂單一律回 404（而非 403），不透露「這個訂單編號存在」
  const order = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?').get(id, session.id) as Omit<Order, 'items'> | undefined
  if (!order) {
    throw createError({ statusCode: 404, statusMessage: '找不到訂單' })
  }

  const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(id) as unknown as OrderItem[]
  return { ...order, items } satisfies Order
})
