import { test, expect } from '@playwright/test';

test.describe('Bot Game End / Victory', () => {
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

  test('TC-FR02-01.1: all player piles empty -> winner declared', async () => {
    await page.click('text=Play a bot');
    await page.locator('#playerFacedown').click();
    await page.dragAndDrop('#playerCurrent', '#boardSlot1');
    await expect(page.locator('.victory-modal')).toHaveClass(/show/);
  });

  test('TC-FR02-02: home button on winner screen works', async () => {
    await page.click('text=Play a bot');
    await page.locator('#playerFacedown').click();
    await page.dragAndDrop('#playerCurrent', '#boardSlot1');
    await expect(page.locator('.victory-modal')).toHaveClass(/show/);

    await page.locator('#victoryButtons button:has(img[src*="home"])').click();
    await expect(page).toHaveURL('https://odyrac.github.io/CSC4330/');
  });

  test('TC-FR02-01.2: restart button on winner screen works', async () => {
    await page.click('text=Play a bot');
    await page.locator('#playerFacedown').click();
    await page.dragAndDrop('#playerCurrent', '#boardSlot1');
    await expect(page.locator('.victory-modal')).toHaveClass(/show/);

    const restartButton = page.locator('#victoryButtons button:has(img[src*="restart"])');
    const [navigation] = await Promise.all([
      page.waitForNavigation(),
      restartButton.click()
    ]);

    expect(navigation).toBeTruthy();
  });
});
