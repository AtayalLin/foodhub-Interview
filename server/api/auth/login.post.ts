interface LoginBody {
  email?: string
  password?: string
}

export default defineEventHandler(async (event) => {
  // body 是空的時候 readBody 會回傳 undefined，直接解構會拋 TypeError → 500；改為視為空物件，交給下面回 400
  const { email, password } = (await readBody<LoginBody | undefined>(event)) ?? {}
  if (!email || !password) {
    throw createError({ statusCode: 400, statusMessage: '請輸入帳號與密碼' })
  }

  const row = useDb().prepare('SELECT * FROM users WHERE email = ?').get(email) as
    (User & { password_hash: string }) | undefined
  if (!row || !verifyPassword(password, row.password_hash)) {
    throw createError({ statusCode: 401, statusMessage: '帳號或密碼錯誤' })
  }

  const token = await signToken({ id: row.id, email: row.email, name: row.name })
  // HTTPS（含反向代理的 X-Forwarded-Proto: https）時加上 Secure，token 不會經由 HTTP 明文傳送。
  // 不寫死 true：本機以 http://localhost 測試（npm run preview / Docker）時，部分瀏覽器會拒收 Secure cookie 而無法登入。
  const secure = getRequestProtocol(event, { xForwardedProto: true }) === 'https'
  setCookie(event, 'token', token, { httpOnly: true, secure, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 7 })

  const { password_hash: _, ...user } = row
  return user satisfies User
})
