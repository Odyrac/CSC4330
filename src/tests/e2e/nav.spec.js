import { test, expect } from '@playwright/test';

test.describe('Bot UI Navigation', () => {
  let page;

  test.beforeEach(async ({ browser, baseURL }) => {
    const context = await browser.newContext();
    page = await context.newPage();

    await page.addInitScript(() => {
      const CUSTOM_DECK = [
        { id: "hA", suit: "heart", rank: "A", color: "red", type: "normal" },
        { id: "cA", suit: "club", rank: "A", color: "black", type: "normal" },
        { id: "d2", suit: "diamond", rank: "2", color: "red", type: "normal" },
        { id: "s2", suit: "spade", rank: "2", color: "black", type: "normal" },
        { id: "d3", suit: "diamond", rank: "3", color: "red", type: "normal" },
        { id: "s3", suit: "spade", rank: "3", color: "black", type: "normal" },
        { id: "d4", suit: "diamond", rank: "4", color: "red", type: "normal" },
        { id: "s4", suit: "spade", rank: "4", color: "black", type: "normal" }
      ];

      Object.defineProperty(window, "Deck", {
        set(value) {
          value.buildDeck = () => [...CUSTOM_DECK];
          value.shuffleDeck = (deck) => [...deck];
          window.__DECK_PATCHED__ = value;
        },
        get() { return window.__DECK_PATCHED__; },
        configurable: true
      });
    });

    await page.goto(baseURL);
  });

  test('TC-UI-01: home button nav', async () => {
    await page.click('text=Play a bot');
    await page.locator('button:has(img[src$="home.png"])').click();
    await expect(page).toHaveURL('https://odyrac.github.io/CSC4330/');
  });

  test('TC-UI-02: full-screen toggle', async () => {
    await page.click('text=Play a bot');
    await page.locator('button:has(img[src$="maximize.png"])').click();
    const isFullscreen = await page.evaluate(() => document.fullscreenElement !== null);
    expect(isFullscreen).toBe(true);
  });
});
