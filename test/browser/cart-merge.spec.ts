import { expect, type Page, test } from '@playwright/test'

const BOB = { email: 'bob@foodhub.test', password: 'password123' }
const AMY = { email: 'amy@foodhub.test', password: 'password123' }

const badge = (page: Page) => page.getByRole('button', { name: '購物車' }).locator('.v-badge__badge')
const drawer = (page: Page) => page.locator('.v-navigation-drawer')
const add = (page: Page, name: string) =>
  page.locator('.product-card', { hasText: name }).locator('button:has(.mdi-plus)').click()

async function login(page: Page, user: { email: string, password: string }) {
  await page.goto('/login')
  await page.getByLabel('Email').fill(user.email)
  await page.getByLabel('密碼').fill(user.password)
  await page.getByRole('button', { name: '登入' }).click()
  await page.waitForURL('/')
}

test.describe.serial('登入後合併購物車', () => {
  test('訪客購物車與帳號購物車合併；另一台裝置登入看到同一份；登出再登入仍在', async ({ browser, request }) => {
    // 事先在 server 上準備 Bob 的帳號購物車：雙層培根堡 ×2、松露薯條 ×1
    await request.post('/api/auth/login', { data: BOB })
    await request.put('/api/cart', { data: { items: [{ productId: 2, qty: 2 }, { productId: 6, qty: 1 }] } })

    // 裝置 A：未登入時加入 經典起司堡 ×1、雙層培根堡 ×1
    const deviceA = await browser.newContext()
    const a = await deviceA.newPage()
    await a.goto('/restaurants/1/menu')
    await add(a, '經典起司堡套餐')
    await add(a, '雙層培根堡套餐')
    await expect(badge(a)).toHaveText('2')

    // 登入 → 合併：雙層培根堡以訪客數量 1 為準、松露薯條保留、經典起司堡加入 → 共 3 份
    await login(a, BOB)
    await expect(badge(a)).toHaveText('3')
    await a.getByRole('button', { name: '購物車' }).click()
    await expect(drawer(a)).toContainText('雙層培根堡套餐')
    await expect(drawer(a)).toContainText('$15.9 × 1')
    await expect(drawer(a)).toContainText('松露薯條')
    await expect(drawer(a)).toContainText('經典起司堡套餐')
    expect(await a.evaluate(() => localStorage.getItem('cart'))).toBeNull() // 合併後訪客購物車已清除

    // 裝置 B：登入同一個帳號，看到同一份
    const deviceB = await browser.newContext()
    const b = await deviceB.newPage()
    await login(b, BOB)
    await expect(badge(b)).toHaveText('3')

    // 裝置 A 登出 → 畫面清空；再登入 → 帳號購物車仍在
    await a.keyboard.press('Escape')
    await a.getByRole('button', { name: '登出' }).click()
    await expect(badge(a)).toBeHidden()
    await login(a, BOB)
    await expect(badge(a)).toHaveText('3')

    await deviceA.close()
    await deviceB.close()
  })

  test('另一台裝置修改購物車後，切回分頁時看到最新內容', async ({ browser }) => {
    const deviceA = await browser.newContext()
    const a = await deviceA.newPage()
    await login(a, BOB)
    await expect(badge(a)).toHaveText('3')

    const deviceB = await browser.newContext()
    const b = await deviceB.newPage()
    await login(b, BOB)
    await b.goto('/restaurants/1/menu')
    await expect(badge(b)).toHaveText('3')
    const saved = b.waitForResponse(r => r.url().endsWith('/api/cart') && r.request().method() === 'PUT')
    await add(b, '經典起司堡套餐')
    await saved
    await expect(badge(b)).toHaveText('4')

    // 模擬使用者切回裝置 A 的分頁
    await a.evaluate(() => document.dispatchEvent(new Event('visibilitychange')))
    await expect(badge(a)).toHaveText('4')

    await deviceA.close()
    await deviceB.close()
  })

  test('合併時數量被調整，購物車顯示提示', async ({ page }) => {
    await page.goto('/restaurants/1/menu')
    for (let i = 0; i < 6; i++) await add(page, '限量和牛漢堡') // 庫存只有 5
    await expect(badge(page)).toHaveText('6')

    await login(page, AMY)
    await page.getByRole('button', { name: '購物車' }).click()
    await expect(drawer(page).getByRole('alert')).toContainText('限量和牛漢堡')
    await expect(drawer(page)).toContainText('$29.9 × 5')
  })
})
