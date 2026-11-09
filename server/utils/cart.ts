// 購物車的 server 端規則：GET / PUT /api/cart 與 POST /api/cart/merge 共用。設計說明見 DESIGN.md。

/** 前端送來的一筆購物車項目：只採用 productId 與 qty；unitPrice 僅用來判斷價格是否已變動 */
export interface CartEntry {
  productId: number
  qty: number
  unitPrice?: number
}

export interface CartChange {
  productId: number
  name: string | null
  reason: 'removed' | 'qty_capped' | 'price_updated'
  qty?: number
}

export const MAX_CART_LINES = 100

/**
 * 驗證 request body 的 items。整體格式不對回 400；個別項目不合法只略過，
 * 避免一個壞掉的 localStorage 項目讓使用者每次登入都合併失敗。
 */
export function parseCartEntries(body: unknown): CartEntry[] {
  const items = (body as { items?: unknown } | null | undefined)?.items
  if (!Array.isArray(items) || items.length > MAX_CART_LINES) {
    throw createError({ statusCode: 400, statusMessage: '購物車格式不正確' })
  }
  const entries: CartEntry[] = []
  for (const raw of items as Record<string, unknown>[]) {
    const productId = raw?.productId
    const qty = raw?.qty
    if (!Number.isInteger(productId) || !Number.isInteger(qty) || (qty as number) <= 0) continue
    if (entries.some(e => e.productId === productId)) continue // 重複的商品以第一筆為準
    entries.push({
      productId: productId as number,
      qty: qty as number,
      unitPrice: typeof raw.unitPrice === 'number' ? raw.unitPrice : undefined,
    })
  }
  return entries
}

/**
 * 合併規則（純函式）：兩邊取聯集；同一商品以訪客的數量為準。
 * 排列順序：帳號購物車原本的順序在前，訪客獨有的商品依原順序接在後面。
 * 重複執行結果相同（冪等），重送請求或登入兩次都不會累加。
 */
export function mergeCartEntries(account: CartEntry[], guest: CartEntry[]): CartEntry[] {
  const guestById = new Map(guest.map(g => [g.productId, g]))
  const merged = account.map(a => guestById.get(a.productId) ?? a)
  const accountIds = new Set(account.map(a => a.productId))
  for (const g of guest) {
    if (!accountIds.has(g.productId)) merged.push(g)
  }
  return merged
}

/**
 * 依資料庫目前的商品資料整理購物車：補上品名、單價、餐廳；套用數量上限；移除已下架或賣完的商品。
 * 回傳整理後的購物車與調整紀錄（給前端顯示提示）。
 */
export function normalizeCart(entries: CartEntry[]): { items: CartItem[], changes: CartChange[] } {
  const db = useDb()
  const findProduct = db.prepare('SELECT id, restaurant_id, name, emoji, price, stock FROM products WHERE id = ?')
  const items: CartItem[] = []
  const changes: CartChange[] = []

  for (const entry of entries) {
    const product = findProduct.get(entry.productId) as
      Pick<Product, 'id' | 'restaurant_id' | 'name' | 'emoji' | 'price' | 'stock'> | undefined
    if (!product) {
      changes.push({ productId: entry.productId, name: null, reason: 'removed' })
      continue
    }
    const max = maxQtyFor(product)
    if (max <= 0) {
      changes.push({ productId: product.id, name: product.name, reason: 'removed' })
      continue
    }
    let qty = entry.qty
    if (qty > max) {
      qty = max
      changes.push({ productId: product.id, name: product.name, reason: 'qty_capped', qty })
    }
    if (entry.unitPrice !== undefined && roundMoney(entry.unitPrice) !== roundMoney(product.price)) {
      changes.push({ productId: product.id, name: product.name, reason: 'price_updated' })
    }
    items.push({
      productId: product.id,
      restaurantId: product.restaurant_id,
      name: product.name,
      emoji: product.emoji,
      unitPrice: product.price,
      qty,
    })
  }
  return { items, changes }
}

/** 讀取帳號購物車（只取 productId 與 qty，其餘欄位一律以資料庫為準） */
export function readCartEntries(userId: number): CartEntry[] {
  const row = useDb().prepare('SELECT items FROM carts WHERE user_id = ?').get(userId) as { items: string } | undefined
  const stored = row ? (JSON.parse(row.items) as CartItem[]) : []
  return stored.map(i => ({ productId: i.productId, qty: i.qty }))
}

export function writeCart(userId: number, items: CartItem[]) {
  useDb()
    .prepare('INSERT OR REPLACE INTO carts (user_id, items, updated_at) VALUES (?, ?, ?)')
    .run(userId, JSON.stringify(items), new Date().toISOString())
}
