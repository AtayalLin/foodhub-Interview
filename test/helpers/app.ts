import { type ChildProcess, spawn } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

export const TEST_JWT_SECRET = 'test-only-secret-not-used-anywhere-else'

export const AMY = { id: 1, email: 'amy@foodhub.test', password: 'password123', name: 'Amy Chen' }
export const BOB = { id: 2, email: 'bob@foodhub.test', password: 'password123', name: 'Bob Lin' }

export interface ApiResponse<T = any> {
  status: number
  data: T
  text: string
  headers: Headers
}

export interface TestApp {
  url: string
  request<T = any>(path: string, init?: { method?: string, body?: unknown, cookie?: string }): Promise<ApiResponse<T>>
  login(user: { email: string, password: string }): Promise<string>
  stop(): Promise<void>
}

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = createServer()
    srv.once('error', reject)
    srv.listen(0, '127.0.0.1', () => {
      const { port } = srv.address() as { port: number }
      srv.close(() => resolve(port))
    })
  })
}

/** 以全新的暫存 SQLite 啟動已 build 好的 server，每個測試檔互不影響 */
export async function startApp(): Promise<TestApp> {
  const port = await freePort()
  const dir = mkdtempSync(join(tmpdir(), 'foodhub-test-'))
  const url = `http://127.0.0.1:${port}`

  const child: ChildProcess = spawn(process.execPath, ['.output/server/index.mjs'], {
    env: {
      ...process.env,
      PORT: String(port),
      HOST: '127.0.0.1',
      NODE_ENV: 'production',
      FOODHUB_DB_PATH: join(dir, 'foodhub.db'),
      NUXT_JWT_SECRET: TEST_JWT_SECRET,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  let logs = ''
  child.stdout!.on('data', d => (logs += d))
  child.stderr!.on('data', d => (logs += d))

  async function request<T>(path: string, init: { method?: string, body?: unknown, cookie?: string } = {}) {
    const res = await fetch(url + path, {
      method: init.method ?? 'GET',
      headers: {
        ...(init.body !== undefined ? { 'content-type': 'application/json' } : {}),
        ...(init.cookie ? { cookie: init.cookie } : {}),
      },
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      redirect: 'manual',
    })
    const text = await res.text()
    let data: any = text
    try { data = JSON.parse(text) } catch {}
    return { status: res.status, data: data as T, text, headers: res.headers }
  }

  // 等 server 可以回應
  const deadline = Date.now() + 20_000
  for (;;) {
    try {
      if ((await fetch(url + '/api/restaurants')).ok) break
    } catch {}
    if (child.exitCode !== null || Date.now() > deadline) {
      child.kill()
      throw new Error(`test server failed to start:\n${logs}`)
    }
    await new Promise(r => setTimeout(r, 100))
  }

  return {
    url,
    request,
    async login(user) {
      const res = await fetch(url + '/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: user.email, password: user.password }),
      })
      const token = res.headers.getSetCookie().find(c => c.startsWith('token='))
      if (!res.ok || !token) throw new Error(`login failed for ${user.email}: ${res.status}`)
      return token.split(';')[0]!
    },
    async stop() {
      if (child.exitCode === null) {
        await new Promise<void>((resolve) => {
          child.once('exit', () => resolve())
          child.kill()
        })
      }
      try { rmSync(dir, { recursive: true, force: true }) } catch {}
    },
  }
}
