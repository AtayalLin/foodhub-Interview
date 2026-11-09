import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { AMY, BOB, startApp, type TestApp } from '../helpers/app'

let app: TestApp
let amy: string
let bob: string
beforeAll(async () => {
  app = await startApp()
  amy = await app.login(AMY)
  bob = await app.login(BOB)
})
afterAll(async () => { await app?.stop() })

const A = 1, B = 2, C = 4, D = 6, WAGYU = 3 // WAGYU 庫存 5

const put = (cookie: string, items: unknown) => app.request('/api/cart', { method: 'PUT', cookie, body: { items } })
const merge = (cookie: string, items: unknown) => app.request('/api/cart/merge', { method: 'POST', cookie, body: { items } })
const pairs = (items: { productId: number, qty: number }[]) => items.map(i => [i.productId, i.qty])

describe('權限與格式', () => {
  it('未登入一律 401', async () => {
    expect((await app.request('/api/cart')).status).toBe(401)
    expect((await app.request('/api/cart', { method: 'PUT', body: { items: [] } })).status).toBe(401)
    expect((await app.request('/api/cart/merge', { method: 'POST', body: { items: [] } })).status).toBe(401)
  })

  it('items 不是陣列，或超過 100 項 → 400', async () => {
    expect((await merge(amy, 'oops')).status).toBe(400)
    expect((await put(amy, null)).status).toBe(400)
    const tooMany = Array.from({ length: 101 }, (_, i) => ({ productId: i + 1, qty: 1 }))
    expect((await merge(amy, tooMany)).status).toBe(400)
  })

  it('個別項目不合法只略過該項，不讓整個請求失敗', async () => {
    const res = await put(amy, [{ productId: A, qty: -1 }, { productId: B, qty: 1.5 }, { productId: 'x', qty: 1 }, { productId: C, qty: 2 }])
    expect(res.status).toBe(200)
    expect(pairs(res.data.items)).toEqual([[C, 2]])
  })
})

describe('POST /api/cart/merge', () => {
  it('題目情境：訪客 A/B/C + 帳號 B/C/D → A/B/C 以訪客數量為準、D 保留', async () => {
    await put(bob, [{ productId: B, qty: 2 }, { productId: C, qty: 3 }, { productId: D, qty: 1 }])

    const res = await merge(bob, [{ productId: A, qty: 1 }, { productId: B, qty: 5 }, { productId: C, qty: 1 }])
    expect(res.status).toBe(200)
    expect(pairs(res.data.items)).toEqual([[B, 5], [C, 1], [D, 1], [A, 1]])
    expect(res.data.items[3]).toMatchObject({ name: '經典起司堡套餐', unitPrice: 12.9, restaurantId: 1 })
  })

  it('重複呼叫結果相同；之後的 GET（例如另一台裝置）看到同一份', async () => {
    const again = await merge(bob, [{ productId: A, qty: 1 }, { productId: B, qty: 5 }, { productId: C, qty: 1 }])
    expect(pairs(again.data.items)).toEqual([[B, 5], [C, 1], [D, 1], [A, 1]])

    const otherDevice = await app.login(BOB) // 另一次登入 = 另一台裝置
    const { data } = await app.request('/api/cart', { cookie: otherDevice })
    expect(pairs(data)).toEqual([[B, 5], [C, 1], [D, 1], [A, 1]])
  })

  it('只會影響自己的購物車', async () => {
    await put(amy, [{ productId: D, qty: 4 }])
    await merge(bob, [{ productId: A, qty: 9 }])
    const { data } = await app.request('/api/cart', { cookie: amy })
    expect(pairs(data)).toEqual([[D, 4]])
  })

  it('竄改的價格無效，並回報 price_updated', async () => {
    await put(amy, [])
    const res = await merge(amy, [{ productId: A, qty: 1, unitPrice: 0.01 }])
    expect(res.data.items[0].unitPrice).toBe(12.9)
    expect(res.data.changes).toContainEqual(expect.objectContaining({ productId: A, reason: 'price_updated' }))
  })

  it('數量超過 20 份或庫存 → 調降並回報 qty_capped', async () => {
    await put(amy, [])
    const res = await merge(amy, [{ productId: A, qty: 25 }, { productId: WAGYU, qty: 9 }])
    expect(pairs(res.data.items)).toEqual([[A, 20], [WAGYU, 5]])
    expect(res.data.changes).toEqual(expect.arrayContaining([
      expect.objectContaining({ productId: A, reason: 'qty_capped', qty: 20 }),
      expect.objectContaining({ productId: WAGYU, reason: 'qty_capped', qty: 5 }),
    ]))
  })

  it('不存在的商品 → 移除並回報 removed', async () => {
    await put(amy, [])
    const res = await merge(amy, [{ productId: 99999, qty: 1 }, { productId: A, qty: 1 }])
    expect(pairs(res.data.items)).toEqual([[A, 1]])
    expect(res.data.changes).toContainEqual(expect.objectContaining({ productId: 99999, reason: 'removed' }))
  })
})

describe('PUT / GET /api/cart', () => {
  it('PUT 忽略前端送來的單價，以資料庫為準', async () => {
    const res = await put(amy, [{ productId: A, qty: 1, unitPrice: 0.01, name: '免費漢堡' }])
    expect(res.data.items[0]).toMatchObject({ productId: A, unitPrice: 12.9, name: '經典起司堡套餐' })
  })

  it('庫存賣完的商品，GET 時不再出現在購物車', async () => {
    await put(amy, [{ productId: WAGYU, qty: 1 }, { productId: A, qty: 1 }])
    await app.request('/api/orders', {
      method: 'POST',
      cookie: bob,
      body: { items: [{ productId: WAGYU, name: '限量和牛漢堡', qty: 5, unitPrice: 29.9 }], total: 149.5 },
    })
    const { data } = await app.request('/api/cart', { cookie: amy })
    expect(pairs(data)).toEqual([[A, 1]])
  })
})
