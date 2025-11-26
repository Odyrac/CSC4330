const { chromium } = require('@playwright/test');
const fs = require('fs');

module.exports = async function globalSetup() {
  console.log("Global Setup: Starting…");
  

  // Launch the browser once
  const browser = await chromium.launch();
  const context = await browser.newContext();

  // Open the game page
  const page = await context.newPage();
  await page.goto('https://odyrac.github.io/CSC4330/');

  await browser.close();
  console.log("Global Setup Complete.");
};
