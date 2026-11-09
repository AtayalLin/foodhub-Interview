// 登入後把訪客購物車合併進帳號購物車。規則與理由見 DESIGN.md。
export default defineEventHandler(async (event) => {
  const session = await getSessionUser(event)
  if (!session) {
    throw createError({ statusCode: 401, statusMessage: '請先登入' })
  }

  const guest = parseCartEntries(await readBody(event))

  // 以下「讀取帳號購物車 → 合併 → 整理 → 寫回」沒有任何 await：node:sqlite 是同步 API，
  // 這段會一口氣執行完，其他請求（例如另一台裝置的寫入）無法插在讀與寫之間，不需要另外加鎖。
  const merged = mergeCartEntries(readCartEntries(session.id), guest)
  const { items, changes } = normalizeCart(merged)
  writeCart(session.id, items)

  return { items, changes }
})
