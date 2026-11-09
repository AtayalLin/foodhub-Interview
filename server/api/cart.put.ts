export default defineEventHandler(async (event) => {
  const session = await getSessionUser(event)
  if (!session) {
    throw createError({ statusCode: 401, statusMessage: '請先登入' })
  }

  // 購物車的擁有者一律取自 session，不採用 body 傳來的 userId（原本可藉此覆蓋任何人的購物車）
  // 只採用 productId 與 qty，品名、單價以資料庫為準；回傳整理後的結果，前端以此為準
  const entries = parseCartEntries(await readBody(event))
  const { items, changes } = normalizeCart(entries)
  writeCart(session.id, items)

  return { items, changes }
})
