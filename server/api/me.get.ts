export default defineEventHandler(async (event) => {
  const session = await getSessionUser(event)
  if (!session) return null

  return useDb()
    .prepare('SELECT id, email, name, phone, address FROM users WHERE id = ?')
    .get(session.id) as User | undefined ?? null
})
