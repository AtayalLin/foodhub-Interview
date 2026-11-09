export default defineEventHandler(async (event) => {
  const session = await getSessionUser(event)
  if (!session) {
    throw createError({ statusCode: 401, statusMessage: '請先登入' })
  }

  // 回傳前依資料庫目前的商品資料整理（價格可能已變動、商品可能已下架或賣完）
  return normalizeCart(readCartEntries(session.id)).items
})
