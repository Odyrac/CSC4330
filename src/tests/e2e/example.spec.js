const { test, expect } = require('@playwright/test');

test('home page has title', async ({ page }) => {
  await page.goto('file:///C:/CSC4330/CSC4330/index.html'); // open local HTML
  await expect(page).toHaveTitle('http://127.0.0.1:5500/CSC4330/'); // adjust to match your HTML title
});
