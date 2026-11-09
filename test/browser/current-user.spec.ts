import { expect, test } from '@playwright/test'

test.describe('目前使用者狀態（SSR 與瀏覽器端）', () => {
  test('登入後首頁顯示自己的名字與地址，登出後恢復訪客畫面', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Email').fill('amy@foodhub.test')
    await page.getByLabel('密碼').fill('password123')
    await page.getByRole('button', { name: '登入' }).click()

    await expect(page.getByRole('heading', { name: '歡迎回來，Amy Chen！' })).toBeVisible()
    // 限定在首頁歡迎區塊：購物車抽屜有商品時也會顯示「外送至」
    await expect(page.locator('.hero').getByText('外送至：台北市信義區松仁路 100 號 12 樓')).toBeVisible()

    await page.reload() // 重新整理走 SSR，仍然是 Amy
    await expect(page.getByRole('heading', { name: '歡迎回來，Amy Chen！' })).toBeVisible()

    await page.getByRole('button', { name: '登出' }).click()
    await expect(page.getByRole('heading', { name: '今天想吃什麼？' })).toBeVisible()
    await expect(page.getByText('松仁路')).toHaveCount(0)
  })

  test('Amy 登入中，另一位匿名訪客開首頁看不到 Amy 的資料', async ({ browser }) => {
    // 兩個獨立的瀏覽器 context = 兩位不同的使用者（cookie 不共用）
    const amy = await browser.newContext()
    const amyPage = await amy.newPage()
    await amyPage.goto('/login')
    await amyPage.getByLabel('Email').fill('amy@foodhub.test')
    await amyPage.getByLabel('密碼').fill('password123')
    await amyPage.getByRole('button', { name: '登入' }).click()
    await amyPage.waitForURL('/') // 等登入後跳回首頁，再重新整理走 SSR
    await amyPage.reload()
    await expect(amyPage.getByRole('heading', { name: '歡迎回來，Amy Chen！' })).toBeVisible()

    const guest = await browser.newContext()
    const guestPage = await guest.newPage()
    await guestPage.goto('/')
    await expect(guestPage.getByRole('heading', { name: '今天想吃什麼？' })).toBeVisible()
    await expect(guestPage.getByText('Amy Chen')).toHaveCount(0)
    await expect(guestPage.getByText('松仁路')).toHaveCount(0)

    await amy.close()
    await guest.close()
  })
})
