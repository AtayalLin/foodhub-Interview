import type { H3Event } from 'h3'
import { SignJWT, jwtVerify } from 'jose'

export interface SessionUser {
  id: number
  email: string
  name: string
}

function secretKey() {
  return new TextEncoder().encode(useRuntimeConfig().public.jwtSecret)
}

export async function signToken(user: SessionUser) {
  return new SignJWT({ ...user })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secretKey())
}

export async function getSessionUser(event: H3Event): Promise<SessionUser | null> {
  const token = getCookie(event, 'token')
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, secretKey())
    return { id: Number(payload.id), email: String(payload.email), name: String(payload.name) }
  } catch {
    return null
  }
}
