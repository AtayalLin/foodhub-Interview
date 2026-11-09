// 下單與購物車共用的商業規則，集中在這裡，避免各 API 各寫一套

/** 單一商品每次最多可訂購的份數（全站預設） */
export const MAX_QTY_PER_ITEM = 20

/**
 * 某商品實際可放進購物車的上限：取「全站上限」與「庫存」較小者（庫存 null = 不限量）。
 * 將來後台若為個別商品設定限購數，只需改這裡。
 */
export function maxQtyFor(product: Pick<Product, 'stock'>) {
  return Math.min(MAX_QTY_PER_ITEM, product.stock ?? Number.POSITIVE_INFINITY)
}

/**
 * 金額四捨五入到小數 2 位，避免浮點誤差（例如 12.9 + 4.5 = 17.400000000000002）。
 * 長期應改以整數最小單位（如「分」）搭配幣別儲存，見 CODE_REVIEW.md。
 */
export function roundMoney(n: number) {
  return Math.round(n * 100) / 100
}
