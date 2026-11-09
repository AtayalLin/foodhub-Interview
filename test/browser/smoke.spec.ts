import { expect, test } from '@playwright/test'

// 冒煙測試：確認 Playwright → 測試 server → 頁面 這條路是通的
test('首頁可以開啟並列出 4 家熱門餐廳', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: '熱門餐廳' })).toBeVisible()
  await expect(page.locator('a[href^="/restaurants/"][href$="/menu"]')).toHaveCount(4)
})
