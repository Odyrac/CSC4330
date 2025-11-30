import { test, expect } from '@playwright/test';

test.describe('Bot Visual Feedback', () => {
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

  test('TC-FR03-01: dragging creates visual clone of the card(s)', async () => {
    await page.click('text=Play a bot');
    await page.locator('#playerFacedown').click();

    const before = await page.locator('body > img').count();
    const card = page.locator('#playerCurrent');
    const box = await card.boundingBox();

    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + 140, box.y - 10);

    const after = await page.locator('body > img').count();
    expect(after).toBeGreaterThan(before);
  });
});
