import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { AMY, startApp, type TestApp } from '../helpers/app'

let app: TestApp
let amy: string
beforeAll(async () => {
  app = await startApp()
  amy = await app.login(AMY)
})
afterAll(async () => { await app?.stop() })

const WAGYU = { productId: 3, name: '限量和牛漢堡', unitPrice: 29.9 } // 初始庫存 5
const TUNA = { productId: 11, name: '鮪魚大腹', unitPrice: 8.9 } // 初始庫存 10
const BURGER = { productId: 1, name: '經典起司堡套餐', unitPrice: 12.9 } // 不限量

function order(items: { productId: number, name: string, unitPrice: number, qty: number }[]) {
  return app.request('/api/orders', {
    method: 'POST',
    cookie: amy,
    body: { userId: AMY.id, items, total: items.reduce((s, i) => s + i.unitPrice * i.qty, 0) },
  })
}

async function stockOf(name: string) {
  const { data } = await app.request(`/api/products?q=${encodeURIComponent(name)}`)
  return data[0].stock as number
}

describe('庫存併發', () => {
  it('限量 5 份的商品同時被下 6 單，只成立 5 單、庫存歸零不為負', async () => {
    const results = await Promise.all(Array.from({ length: 6 }, () => order([{ ...WAGYU, qty: 1 }])))

    const succeeded = results.filter(r => r.status === 200 && typeof r.data.orderId === 'number')
    const rejected = results.filter(r => r.status === 409)
    expect(succeeded).toHaveLength(5)
    expect(rejected).toHaveLength(1)
    expect(await stockOf(WAGYU.name)).toBe(0)
  })
})

describe('下單失敗要如實回報且不留下半筆資料', () => {
  it('庫存不足回 409，訂單不成立、庫存不變', async () => {
    const ok = await order([{ ...BURGER, qty: 1 }])
    const lastId = ok.data.orderId as number

    const res = await order([{ ...BURGER, qty: 1 }, { ...TUNA, qty: 11 }])
    expect(res.status).toBe(409)
    expect(res.data.ok).not.toBe(true)

    const { status } = await app.request(`/api/orders/${lastId + 1}`, { cookie: amy })
    expect(status).toBe(404)
    expect(await stockOf(TUNA.name)).toBe(10)
  })

  it('不存在的商品回 400，而不是假裝成功', async () => {
    const res = await order([{ productId: 99999, name: '不存在', unitPrice: 1, qty: 1 }])
    expect(res.status).toBe(400)
    expect(res.data.ok).not.toBe(true)
  })
})
