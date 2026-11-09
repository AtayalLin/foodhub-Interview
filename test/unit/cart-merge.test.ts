import { describe, expect, it } from 'vitest'
import { mergeCartEntries } from '../../server/utils/cart'

const A = 1, B = 2, C = 4, D = 6

describe('mergeCartEntries 合併規則', () => {
  it('取聯集；同一商品以訪客數量為準；帳號原順序在前、訪客獨有的接在後面', () => {
    const account = [{ productId: B, qty: 2 }, { productId: C, qty: 3 }, { productId: D, qty: 1 }]
    const guest = [{ productId: A, qty: 1 }, { productId: B, qty: 5 }, { productId: C, qty: 1 }]

    expect(mergeCartEntries(account, guest).map(e => [e.productId, e.qty])).toEqual([
      [B, 5], [C, 1], [D, 1], [A, 1],
    ])
  })

  it('重複執行結果相同（冪等）：重送或登入兩次不會一直累加', () => {
    const account = [{ productId: B, qty: 2 }]
    const guest = [{ productId: A, qty: 1 }, { productId: B, qty: 5 }]
    const once = mergeCartEntries(account, guest)
    expect(mergeCartEntries(once, guest)).toEqual(once)
  })

  it('任一邊是空的', () => {
    const items = [{ productId: A, qty: 2 }]
    expect(mergeCartEntries([], items)).toEqual(items)
    expect(mergeCartEntries(items, [])).toEqual(items)
  })

  it('訪客項目的 unitPrice 會保留下來，供後續比對價格是否變動', () => {
    const merged = mergeCartEntries([{ productId: A, qty: 1 }], [{ productId: A, qty: 3, unitPrice: 10 }])
    expect(merged).toEqual([{ productId: A, qty: 3, unitPrice: 10 }])
  })
})
