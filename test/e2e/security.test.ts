import { SignJWT } from 'jose'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { AMY, BOB, startApp, type TestApp } from '../helpers/app'

let app: TestApp
beforeAll(async () => { app = await startApp() })
afterAll(async () => { await app?.stop() })

describe('JWT secret', () => {
  it('不會出現在送給瀏覽器的 HTML / payload 中', async () => {
    const { text } = await app.request('/')
    expect(text).not.toContain('foodhub-dev-secret-2024')
    expect(text).not.toContain('jwtSecret')
  })

  it('用原本寫死在程式碼裡的 secret 偽造的 token 無效', async () => {
    const forged = await new SignJWT({ id: BOB.id, email: BOB.email, name: BOB.name })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(new TextEncoder().encode('foodhub-dev-secret-2024'))

    const { data } = await app.request('/api/me', { cookie: `token=${forged}` })
    expect(data).toBeFalsy()
  })
})

describe('GET /api/products 搜尋', () => {
  it('UNION 注入撈不到 users 資料表', async () => {
    const q = encodeURIComponent(`zzz%' UNION SELECT id,1,email,password_hash,'','',0,0,0,0 FROM users --`)
    const { status, text } = await app.request(`/api/products?q=${q}`)
    expect(status).toBe(200)
    expect(text).not.toContain('@foodhub.test')
  })

  it('關鍵字含單引號時正常回傳，不會 500', async () => {
    const { status, data } = await app.request(`/api/products?q=${encodeURIComponent(`'`)}`)
    expect(status).toBe(200)
    expect(data).toEqual([])
  })

  it('% 被當成一般文字，不會變成「列出全部」的萬用字元', async () => {
    const { data } = await app.request(`/api/products?q=${encodeURIComponent('%')}`)
    expect(data).toEqual([])
  })

  it('一般搜尋與分類篩選仍然正常（修正沒有破壞原功能）', async () => {
    const { data: curry } = await app.request(`/api/products?q=${encodeURIComponent('咖哩')}`)
    expect(curry.map((p: { name: string }) => p.name)).toEqual(['奶油雞咖哩', '馬薩拉羊肉咖哩', '菠菜起司咖哩'])

    const { data: drinks } = await app.request('/api/products?category=Drinks')
    expect(drinks).toHaveLength(5) // 可樂、香草奶昔、綠茶、芒果拉西、冷壓果汁
    expect(drinks.every((p: { category: string }) => p.category === 'Drinks')).toBe(true)

    const { data: all } = await app.request('/api/products')
    expect(all).toHaveLength(23)
  })
})

describe('GET /api/orders/:id 權限', () => {
  it('不能讀取別人的訂單', async () => {
    const amy = await app.login(AMY)
    const { status, text } = await app.request('/api/orders/2', { cookie: amy }) // 訂單 2 屬於 Bob
    expect(status).toBe(404)
    expect(text).not.toContain('0987-654-321')
  })

  it('可以讀取自己的訂單', async () => {
    const bob = await app.login(BOB)
    const { status, data } = await app.request('/api/orders/2', { cookie: bob })
    expect(status).toBe(200)
    expect(data.user_id).toBe(BOB.id)
  })
})

describe('PUT /api/cart 權限', () => {
  it('body 帶別人的 userId 也不能改到別人的購物車', async () => {
    const amy = await app.login(AMY)
    const bob = await app.login(BOB)
    const item = { productId: 1, restaurantId: 1, name: '經典起司堡套餐', emoji: '🍔', unitPrice: 12.9, qty: 1 }

    await app.request('/api/cart', { method: 'PUT', cookie: amy, body: { userId: BOB.id, items: [item] } })

    const { data: bobCart } = await app.request('/api/cart', { cookie: bob })
    expect(bobCart).toEqual([])
  })
})

describe('POST /api/orders 信任邊界', () => {
  it('body 帶別人的 userId，訂單仍然屬於登入者本人', async () => {
    const amy = await app.login(AMY)
    const { status, data } = await app.request('/api/orders', {
      method: 'POST',
      cookie: amy,
      body: { userId: BOB.id, items: [{ productId: 1, name: '經典起司堡套餐', qty: 1, unitPrice: 12.9 }], total: 12.9 },
    })
    expect(status).toBe(200)
    expect(data.orderId).toBeTypeOf('number')

    const { data: order } = await app.request(`/api/orders/${data.orderId}`, { cookie: amy })
    expect(order.user_id).toBe(AMY.id)
    expect(order.phone).toBe('0912-345-678')
  })

  it('竄改的 unitPrice / total → 409「價格已更新」且訂單不成立，並回傳目前售價', async () => {
    const amy = await app.login(AMY)
    const res = await app.request('/api/orders', {
      method: 'POST',
      cookie: amy,
      body: { items: [{ productId: 1, name: '免費漢堡', qty: 2, unitPrice: 0.01 }], total: 0.02 },
    })
    expect(res.status).toBe(409)
    expect(res.data.data.code).toBe('PRICE_CHANGED')
    expect(res.data.data.items).toEqual([{ productId: 1, name: '經典起司堡套餐', unitPrice: 12.9 }])
    expect(res.data.orderId).toBeUndefined()
  })

  it('用最新價格重新下單才成立；品名以 server 端資料為準', async () => {
    const amy = await app.login(AMY)
    const { status, data } = await app.request('/api/orders', {
      method: 'POST',
      cookie: amy,
      body: { items: [{ productId: 1, name: '免費漢堡', qty: 2, unitPrice: 12.9 }], total: 25.8 },
    })
    expect(status).toBe(200)

    const { data: order } = await app.request(`/api/orders/${data.orderId}`, { cookie: amy })
    expect(order.total).toBe(25.8)
    expect(order.items[0].unit_price).toBe(12.9)
    expect(order.items[0].name).toBe('經典起司堡套餐')
  })
})

describe('餐廳介紹 XSS', () => {
  it('API 回傳的介紹已移除事件屬性', async () => {
    const { data } = await app.request('/api/restaurants/3')
    expect(data.intro).not.toMatch(/onerror/i)
    expect(data.intro).toContain('北印度咖哩') // 正常內容保留
  })

  it('餐廳列表 API 的介紹同樣已清理', async () => {
    const { text } = await app.request('/api/restaurants')
    expect(text).not.toMatch(/onerror/i)
  })

  it('其他餐廳的正常格式沒有被誤刪', async () => {
    const { data } = await app.request('/api/restaurants/1')
    expect(data.intro).toContain('<strong>手打牛肉漢堡</strong>')
    expect(data.intro).toContain('<em>11:00–21:00</em>')
  })

  it('SSR 輸出的菜單頁不含可執行的 payload', async () => {
    const { text } = await app.request('/restaurants/3/menu')
    expect(text).not.toMatch(/onerror/i)
  })
})

describe('SSR 跨請求狀態', () => {
  it('Amy 的請求之後，匿名訪客的首頁不會出現 Amy 的資料', async () => {
    const amy = await app.login(AMY)
    const { text: amyHome } = await app.request('/', { cookie: amy })
    expect(amyHome).toContain('Amy Chen') // 前提：Amy 自己看得到

    const { text: anonHome } = await app.request('/')
    expect(anonHome).not.toContain('Amy Chen')
    expect(anonHome).not.toContain('松仁路')
  })
})
