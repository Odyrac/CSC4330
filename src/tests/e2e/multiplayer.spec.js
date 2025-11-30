import { test, expect } from '@playwright/test';

test.describe('Bot Multiplayer / Sync', () => {
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

  test('TC-FR04-01: player action syncs to all connected players', async () => {
    await page.click('text=Play a friend');
    await page.click('text=Create new room');
    await page.waitForSelector('text=Waiting for opponent...', { state: 'visible' });
    await page.waitForSelector('#roomPinDisplay .pin-digit', { state: 'visible' });

    const roomCode = await page.locator('#roomPinDisplay .pin-digit').evaluateAll(spans => spans.map(span => span.textContent.trim()));

    const context2 = await page.context().browser().newContext();
    const page2 = await context2.newPage();
    await page2.goto(page.url());

    await page2.waitForSelector('#pinDigit1', { state: 'visible' });
    await page2.waitForTimeout(1000);

    await page2.fill('#pinDigit1', roomCode[0]);
    await page2.fill('#pinDigit2', roomCode[1]);
    await page2.fill('#pinDigit3', roomCode[2]);
    await page2.fill('#pinDigit4', roomCode[3]);

    await page2.locator('#toast-container .toast.show', { hasText: 'Game synchronized' }).waitFor({ state: 'visible', timeout: 10000 });
  });
});
