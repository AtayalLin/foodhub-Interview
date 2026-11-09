// TODO: 快取會不會造成資料不一致？
export default defineCachedEventHandler((event) => {
  const { restaurantId, category } = getQuery(event)
  const db = useDb()

  const categories = (db
    .prepare('SELECT DISTINCT category FROM products WHERE restaurant_id = ? ORDER BY id')
    .all(Number(restaurantId)) as { category: string }[])
    .map(r => r.category)

  const products = db
    .prepare('SELECT * FROM products WHERE restaurant_id = ? AND category = ? ORDER BY id')
    .all(Number(restaurantId), String(category ?? categories[0] ?? '')) as unknown as Product[]

  return { categories, products }
}, { maxAge: 60 })
