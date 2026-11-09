interface LoginBody {
  email?: string
  password?: string
}

export default defineEventHandler(async (event) => {
  const { email, password } = await readBody<LoginBody>(event)
  if (!email || !password) {
    throw createError({ statusCode: 400, statusMessage: '請輸入帳號與密碼' })
  }

  const row = useDb().prepare('SELECT * FROM users WHERE email = ?').get(email) as
    (User & { password_hash: string }) | undefined
  if (!row || !verifyPassword(password, row.password_hash)) {
    throw createError({ statusCode: 401, statusMessage: '帳號或密碼錯誤' })
  }

  const token = await signToken({ id: row.id, email: row.email, name: row.name })
  setCookie(event, 'token', token, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 7 })

  const { password_hash: _, ...user } = row
  return user satisfies User
})
