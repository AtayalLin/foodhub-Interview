interface OrderBody {
  items: { productId: number, name: string, qty: number, unitPrice: number }[]
  total: number
}

function validateOrder(body: OrderBody | null): asserts body is OrderBody {
  if (!Array.isArray(body?.items) || !body.items.length) {
    throw createError({ statusCode: 400, statusMessage: '購物車是空的' })
  }
  const seen = new Set<number>()
  for (const item of body.items) {
    if (!Number.isInteger(item?.productId) || seen.has(item.productId)) {
      throw createError({ statusCode: 400, statusMessage: '商品資料不正確' })
    }
    seen.add(item.productId)
    if (!Number.isInteger(item.qty) || item.qty <= 0) {
      throw createError({ statusCode: 400, statusMessage: '數量不正確' })
    }
    if (item.qty > MAX_QTY_PER_ITEM) {
      throw createError({ statusCode: 400, statusMessage: `單一商品最多訂購 ${MAX_QTY_PER_ITEM} 份` })
    }
    if (typeof item.unitPrice !== 'number' || !Number.isFinite(item.unitPrice)) {
      throw createError({ statusCode: 400, statusMessage: '商品資料不正確' })
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

  const body = await readBody<OrderBody | null>(event)
  // 已於 server 端驗證訂單（validateOrder）
  // ↑ 更正：原本的 validateOrder 只檢查「非空」與「數量為正整數」，商品是否存在、價格、總額都直接採用前端的值，
  //   可用 $0.01 下單。現在除了格式（含單品上限、重複商品）外，下面會以資料庫的商品資料重新核對品名與價格。
  validateOrder(body)

  const db = useDb()

  // 以 server 端商品資料為準：品名、單價一律從資料庫取，不採用前端傳來的值
  const lines = body.items.map((item) => {
    const product = db.prepare('SELECT id, name, price, stock FROM products WHERE id = ?').get(item.productId) as
      Pick<Product, 'id' | 'name' | 'price' | 'stock'> | undefined
    if (!product) {
      throw createError({ statusCode: 400, statusMessage: '商品不存在或已下架' })
    }
    return { item, product }
  })

  // 前端顯示的價格與目前售價不同（商品剛調價，或 request 被竄改）→ 整單不成立，回傳最新價格讓使用者確認後重新下單
  const total = roundMoney(lines.reduce((sum, { item, product }) => sum + product.price * item.qty, 0))
  const changed = lines.filter(({ item, product }) => roundMoney(item.unitPrice) !== roundMoney(product.price))
  if (changed.length || roundMoney(Number(body.total)) !== total) {
    throw createError({
      statusCode: 409,
      statusMessage: '價格已更新，請確認後重新下單',
      data: {
        code: 'PRICE_CHANGED',
        items: lines.map(({ product }) => ({ productId: product.id, name: product.name, unitPrice: product.price })),
      },
    })
  }

  const user = db.prepare('SELECT address, phone FROM users WHERE id = ?').get(session.id) as Pick<User, 'address' | 'phone'>

  // 扣庫存、建立訂單、寫入明細放在同一個 transaction：任何一步失敗就整單 rollback，不留下半筆資料。
  // 這段是同步程式碼（node:sqlite 為同步 API、中間沒有 await），執行期間不會被其他請求插隊。
  let orderId: number
  db.exec('BEGIN IMMEDIATE')
  try {
    for (const { item, product } of lines) {
      if (product.stock === null) continue

      // SQLite 是單執行緒，不會有併發問題
      // ↑ 更正：SQLite 本身是同步的沒錯，但原寫法在「讀庫存」和「寫回庫存」之間 await notifyKitchen()，
      //   等待的 200ms 內其他請求會讀到同一個舊庫存，各自寫回「舊值 − 數量」→ 超賣（限量 5 份同時下 6 單會 6 單都成立）。
      //   現在改成條件式 UPDATE：只有庫存足夠時才扣，判斷與扣除在同一個 SQL 內完成。
      const { changes } = db
        .prepare('UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?')
        .run(item.qty, product.id, item.qty)
      if (changes === 0) {
        throw createError({ statusCode: 409, statusMessage: `${product.name} 庫存不足`, data: { code: 'OUT_OF_STOCK', productId: product.id } })
      }
    }

    const { lastInsertRowid } = db
      .prepare('INSERT INTO orders (user_id, total, address, phone, status, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(session.id, total, user.address, user.phone, 'pending', new Date().toISOString())
    orderId = Number(lastInsertRowid)

    const insertItem = db.prepare('INSERT INTO order_items (order_id, product_id, name, qty, unit_price) VALUES (?, ?, ?, ?, ?)')
    for (const { item, product } of lines) {
      insertItem.run(orderId, product.id, product.name, item.qty, product.price)
    }

    db.exec('COMMIT')
  } catch (e) {
    // 避免前端噴錯影響使用者體驗
    // ↑ 更正：原本在這裡吞掉所有錯誤並回 { ok: true }，前端因此清空購物車、顯示「訂單已送出」，
    //   但訂單其實沒成立，資料庫還留下沒有扣庫存的半筆訂單。對使用者體驗的傷害比顯示錯誤更大。
    //   現在 rollback 後把錯誤原樣拋出（409 庫存不足等），由前端顯示原因。
    db.exec('ROLLBACK')
    throw e
  }

  // 訂單確定成立後才通知廚房。若廚房 API 失敗，實務上應以佇列重試或取消訂單並回補庫存（見 CODE_REVIEW.md）
  await Promise.all(lines.map(({ item, product }) => notifyKitchen(product.id, item.qty)))

  return { ok: true, orderId }
})
