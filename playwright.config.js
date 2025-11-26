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
    initScripts:[ {
      content: `
          (function () {
            let seed = 12345;
            Math.random = function () {
              const x = Math.sin(seed++) * 10000;
              return x - Math.floor(x);
            };
          })();
        `
  }]
  },

  timeout: 30000,
  workers: 4
});
