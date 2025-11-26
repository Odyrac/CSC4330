// playwright.config.js
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: 'src/tests/e2e',

  globalSetup: './src/tests/e2e/setup/global-setup.spec.js',
  globalTeardown: './src/tests/e2e/setup/global-teardown.spec.js',  
  
  use: {
    baseURL: 'https://odyrac.github.io/CSC4330/',
    headless: false,
    viewport: { width: 1280, height: 720 },
  },

  timeout: 30000,
  workers: 4
});
