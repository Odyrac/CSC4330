// playwright.config.js
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: 'src/tests/e2e',   // ONLY run E2E tests here
  use: {
    headless: false,          // optional: show browser
    viewport: { width: 1280, height: 720 },
  },
});
