import { expect, type Page, test } from '@playwright/test'

const productTitles = (page: Page) => page.locator('.product-card .v-card-title')
const addButton = (page: Page, name: string) =>
  page.locator('.product-card', { hasText: name }).locator('button:has(.mdi-plus)')
const cartBadge = (page: Page) => page.getByRole('button', { name: '購物車' }).locator('.v-badge__badge')

/** 收集瀏覽器 Console 中與 hydration 相關的警告／錯誤 */
function collectHydrationMessages(page: Page) {
  const messages: string[] = []
  page.on('console', (msg) => {
    if (/hydrat/i.test(msg.text())) messages.push(`[${msg.type()}] ${msg.text()}`)
  })
  return messages
}

test.describe('菜單頁分類', () => {
  test('點左側分類，右側商品要換成該分類的商品', async ({ page }) => {
    await page.goto('/restaurants/1/menu')
    await expect(productTitles(page).first()).toHaveText('經典起司堡套餐') // 預設第一個分類 DPB Special Combos

    await page.locator('.v-list-item', { hasText: /^Burgers$/ }).click()
    await expect(page.getByRole('heading', { name: 'Burgers' })).toBeVisible()
    await expect(productTitles(page)).toHaveText(['辣味墨西哥堡', '蘑菇素食堡'])
  })
})

test.describe('找餐點排序', () => {
  test('選「價格：高到低」後切回「預設排序」，要恢復原本（id）的順序', async ({ page }) => {
    await page.goto('/restaurants')
    const original = await productTitles(page).allTextContents()
    expect(original[0]).toBe('經典起司堡套餐')

    await page.locator('.v-select').click()
    await page.getByRole('option', { name: '價格：高到低' }).click()
    await expect(productTitles(page).first()).toHaveText('限量和牛漢堡') // $29.9 最貴

    await page.locator('.v-select').click()
    await page.getByRole('option', { name: '預設排序' }).click()
    await expect(productTitles(page)).toHaveText(original)
  })
})

test.describe('訪客購物車', () => {
  test('在菜單頁加入商品後重新整理，購物車內容仍在', async ({ page }) => {
    await page.goto('/restaurants/1/menu')
    await addButton(page, '經典起司堡套餐').click()
    await addButton(page, '雙層培根堡套餐').click()
    await expect(cartBadge(page)).toHaveText('2')

    await page.reload()
    await expect(cartBadge(page)).toHaveText('2')
    await page.getByRole('button', { name: '購物車' }).click()
    await expect(page.locator('.v-navigation-drawer')).toContainText('經典起司堡套餐')
    await expect(page.locator('.v-navigation-drawer')).toContainText('雙層培根堡套餐')
  })

  test('購物車有商品時重新整理首頁與菜單頁，Console 沒有 hydration mismatch', async ({ page }) => {
    await page.goto('/restaurants/1/menu')
    await addButton(page, '經典起司堡套餐').click()

    const messages = collectHydrationMessages(page)
    for (const path of ['/', '/restaurants', '/restaurants/1/menu']) {
      await page.goto(path)
      await page.waitForLoadState('networkidle')
      await expect(cartBadge(page)).toHaveText('1') // 接手後購物車數字正確
    }
    expect(messages).toEqual([])
  })

  test('Header 由 SSR 輸出（原本被 <ClientOnly> 包住，SSR HTML 裡沒有 Header）', async ({ request }) => {
    const html = await (await request.get('/')).text()
    expect(/<header[^>]*v-app-bar/.test(html), 'SSR HTML 應包含 <header class="v-app-bar">').toBe(true)
  })
})

test.describe('訂單頁時間（server 為 UTC，與正式環境相同）', () => {
  test.use({ timezoneId: 'Asia/Taipei' }) // 使用者在台灣；不受執行測試的電腦時區影響

  test('SSR 與瀏覽器都顯示台灣時間，Console 沒有 hydration mismatch', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Email').fill('amy@foodhub.test')
    await page.getByLabel('密碼').fill('password123')
    await page.getByRole('button', { name: '登入' }).click()
    await page.waitForURL('/')

    // 訂單 #1 建立於 2026-10-20T12:30:00Z = 台灣時間 2026/10/20 下午8:30:00
    const ssrHtml = await (await page.request.get('/orders/1')).text()
    const ssrTime = ssrHtml.match(/\d{4}\/\d{1,2}\/\d{1,2}[^<·]*?\d{1,2}:\d{2}:\d{2}/)?.[0]
    expect(ssrTime, 'SSR 輸出的 HTML 應為台灣時間').toBe('2026/10/20 下午8:30:00')

    const messages = collectHydrationMessages(page)
    await page.goto('/orders/1')
    await expect(page.getByText('2026/10/20 下午8:30:00')).toBeVisible()
    await page.waitForLoadState('networkidle')
    expect(messages).toEqual([])
  })
})

test.describe('結帳：價格已更新', () => {
  test('購物車價格與售價不同時，顯示提示、保留購物車並更新為目前售價', async ({ page }) => {
    // 模擬「加入購物車之後商品調價」：讓載入的購物車帶著舊價格 $10（攔截 GET /api/cart）
    await page.route('**/api/cart', (route) => {
      if (route.request().method() !== 'GET') return route.continue()
      return route.fulfill({ json: [{ productId: 1, restaurantId: 1, name: '經典起司堡套餐', emoji: '🍔', unitPrice: 10, qty: 1 }] })
    })

    await page.goto('/login')
    await page.getByLabel('Email').fill('amy@foodhub.test')
    await page.getByLabel('密碼').fill('password123')
    await page.getByRole('button', { name: '登入' }).click()
    await page.waitForURL('/')

    await page.getByRole('button', { name: '購物車' }).click()
    const drawer = page.locator('.v-navigation-drawer')
    await expect(drawer).toContainText('$10 × 1')
    await drawer.getByRole('button', { name: '結帳' }).click()

    await expect(drawer.getByRole('alert')).toContainText('價格已更新')
    await expect(drawer).toContainText('$12.9 × 1') // 已換成目前售價
    await expect(page).not.toHaveURL(/orders\/success/) // 訂單沒有成立
  })
})
