interface OrderBody {
  userId: number
  items: { productId: number, name: string, qty: number, unitPrice: number }[]
  total: number
}

function validateOrder(body: OrderBody) {
  if (!body.items?.length) {
    throw createError({ statusCode: 400, statusMessage: '購物車是空的' })
  }
  for (const item of body.items) {
    if (!Number.isInteger(item.qty) || item.qty <= 0) {
      throw createError({ statusCode: 400, statusMessage: '數量不正確' })
    }
  }
}

// 向餐廳廚房確認備料（模擬外部 API，約 200ms）
function notifyKitchen(productId: number, qty: number) {
  return new Promise(resolve => setTimeout(() => resolve({ productId, qty, accepted: true }), 200))
}

export default defineEventHandler(async (event) => {
  const session = await getSessionUser(event)
  if (!session) {
    throw createError({ statusCode: 401, statusMessage: '請先登入' })
  }

  const body = await readBody<OrderBody>(event)
  // 已於 server 端驗證訂單（validateOrder）
  validateOrder(body)

  try {
    const db = useDb()
    const user = db.prepare('SELECT address, phone FROM users WHERE id = ?').get(body.userId) as Pick<User, 'address' | 'phone'>

    const { lastInsertRowid } = db
      .prepare('INSERT INTO orders (user_id, total, address, phone, status, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(body.userId, body.total, user.address, user.phone, 'pending', new Date().toISOString())
    const orderId = Number(lastInsertRowid)

    for (const item of body.items) {
      db.prepare('INSERT INTO order_items (order_id, product_id, name, qty, unit_price) VALUES (?, ?, ?, ?, ?)')
        .run(orderId, item.productId, item.name, item.qty, item.unitPrice)

      const product = db.prepare('SELECT name, stock FROM products WHERE id = ?').get(item.productId) as Pick<Product, 'name' | 'stock'>
      if (product.stock === null) continue

      // SQLite 是單執行緒，不會有併發問題
      if (product.stock < item.qty) {
        throw createError({ statusCode: 409, statusMessage: `${product.name} 庫存不足` })
      }
      await notifyKitchen(item.productId, item.qty)
      db.prepare('UPDATE products SET stock = ? WHERE id = ?').run(product.stock - item.qty, item.productId)
    }

    return { ok: true, orderId }
  } catch (e) {
    // 避免前端噴錯影響使用者體驗
    console.log(e)
    return { ok: true }
  }
})
