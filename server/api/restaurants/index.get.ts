export default defineEventHandler(() => {
  return useDb().prepare('SELECT * FROM restaurants ORDER BY rating DESC').all() as unknown as Restaurant[]
})
