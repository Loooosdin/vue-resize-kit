import { expect, test } from '@playwright/test'

test('真实浏览器中监听尺寸并在 stop 后停止交付', async ({ page }) => {
  await page.goto('/')
  await expect.poll(() => page.evaluate(() => window.resizeEvents.length)).toBeGreaterThan(0)

  await page.evaluate(() => {
    document.querySelector<HTMLElement>('#target')!.style.width = '180px'
  })
  await expect
    .poll(() => page.evaluate(() => window.resizeEvents.at(-1)?.width))
    .toBe(180)

  const count = await page.evaluate(() => {
    window.stopResizeObserver()
    return window.resizeEvents.length
  })
  await page.evaluate(() => {
    document.querySelector<HTMLElement>('#target')!.style.width = '240px'
  })
  await page.waitForTimeout(100)
  expect(await page.evaluate(() => window.resizeEvents.length)).toBe(count)
})
