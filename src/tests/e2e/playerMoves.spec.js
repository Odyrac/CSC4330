import { test, expect } from '@playwright/test';

test.describe('Bot Player Moves', () => {
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

  test('TC-FR01-01: valid player move', async () => {
    await page.click('text=Play a bot');
    await page.locator('#playerFacedown').click();
    await page.dragAndDrop('#playerCurrent', '#boardSlot1');
    await expect(page.locator('.victory-modal')).toHaveClass(/show/);
  });

  test('TC-FR01-02: invalid player move', async () => {
    await page.click('text=Play a bot');
    await page.locator('#playerFacedown').click();
    await page.dragAndDrop('#playerCurrent', '#boardSlot0');
    await expect(page.locator('#toast-container .toast')).toHaveClass(/show/);
  });

  test('TC-FR01-03: board does not change for invalid moves', async () => {
    await page.click('text=Play a bot');
    await page.waitForTimeout(3000);

    const cardSources = await page.locator('.board-slot img').evaluateAll(imgs => imgs.map(img => img.getAttribute('src')));
    const expected = [
      "src/assets/cards/d2.png",
      "src/assets/cards/s2.png",
      "src/assets/cards/d3.png",
      "src/assets/cards/s3.png",
      "src/assets/cards/d4.png",
      "src/assets/cards/s4.png"
    ];

    await page.locator('#playerFacedown').click();
    await page.dragAndDrop('#playerCurrent', '#boardSlot0');
    await expect(page.locator('#toast-container .toast')).toHaveClass(/show/);
    await page.waitForTimeout(5000);

    expect(cardSources).toEqual(expected);
  });
});
