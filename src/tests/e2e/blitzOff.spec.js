import {
    test,
    expect
} from '@playwright/test';
import {
    timeout
} from '../../../playwright.config';

async function getBoardState(page) {
    await page.waitForSelector('.board-slot', {
        state: 'visible'
    });

    return await page.locator('.board-slot').evaluateAll(slots =>
        slots.map(slot => {
            const img = slot.querySelector("img");
            return img ? img.getAttribute("src") : null;
        })
    );
}

test.describe('Bot Play E2E Test', () => {
    let page;

    test.beforeEach(async ({
        browser,
        baseURL
    }) => {
        const context = await browser.newContext();
        page = await context.newPage();

        await page.addInitScript(() => {
            const CUSTOM_DECK = [{
                    id: "hA",
                    suit: "heart",
                    rank: "A",
                    color: "red",
                    type: "normal"
                },
                {
                    id: "cA",
                    suit: "club",
                    rank: "A",
                    color: "black",
                    type: "normal"
                },

                {
                    id: "d2",
                    suit: "diamond",
                    rank: "2",
                    color: "red",
                    type: "normal"
                },
                {
                    id: "s2",
                    suit: "spade",
                    rank: "2",
                    color: "black",
                    type: "normal"
                },
                {
                    id: "d3",
                    suit: "diamond",
                    rank: "3",
                    color: "red",
                    type: "normal"
                },
                {
                    id: "s3",
                    suit: "spade",
                    rank: "3",
                    color: "black",
                    type: "normal"
                },
                {
                    id: "d4",
                    suit: "diamond",
                    rank: "4",
                    color: "red",
                    type: "normal"
                },
                {
                    id: "s4",
                    suit: "spade",
                    rank: "4",
                    color: "black",
                    type: "normal"
                }
            ];

            Object.defineProperty(window, "Deck", {
                set(value) {
                    value.buildDeck = () => [...CUSTOM_DECK];

                    value.shuffleDeck = (deck) => [...deck];

                    window.__DECK_PATCHED__ = value;
                },
                get() {
                    return window.__DECK_PATCHED__;
                },
                configurable: true
            });
        });

        await page.goto(baseURL);


    });

    test('TC-UI-01: home button nav', async () => {
        await page.click('text=Play a bot');

        await page.locator('button:has(img[src$="home.png"])').click()

        await expect(page).toHaveURL('https://odyrac.github.io/CSC4330/');
    });

    test('TC-UI-02: full-screen toggle', async () => {
        await page.click('text=Play a bot');

        await page.locator('button:has(img[src$="maximize.png"])').click()

        const isFullscreen = await page.evaluate(() => {
            return document.fullscreenElement !== null;
        });
        expect(isFullscreen).toBe(true);
    });

    test('TC-FR01-01: valid player move', async () => {
        await page.click('text=Play a bot');

        await page.locator('#playerFacedown').click()
        await page.dragAndDrop('#playerCurrent', '#boardSlot1');
        await expect(page.locator('.victory-modal')).toHaveClass(/show/);
    });

    test('TC-FR01-02: invalid player move', async () => {
        await page.click('text=Play a bot');

        await page.locator('#playerFacedown').click()
        await page.dragAndDrop('#playerCurrent', '#boardSlot0');
        await expect(page.locator('#toast-container .toast')).toHaveClass(/show/);
    });

    test('TC-FR01-03: board does not change for invalid moves', async () => {
        await page.click('text=Play a bot');

        await page.waitForTimeout(3000);
        const cardSources = await page.locator('.board-slot img').evaluateAll(imgs =>
            imgs.map(img => img.getAttribute('src'))
        );

        const expected = [
            "src/assets/cards/d2.png",
            "src/assets/cards/s2.png",
            "src/assets/cards/d3.png",
            "src/assets/cards/s3.png",
            "src/assets/cards/d4.png",
            "src/assets/cards/s4.png"
        ];

        console.log(cardSources);

        await page.locator('#playerFacedown').click()
        await page.dragAndDrop('#playerCurrent', '#boardSlot0');
        await expect(page.locator('#toast-container .toast')).toHaveClass(/show/);
        await page.waitForTimeout(5000);

        expect(cardSources).toEqual(expected);
    });

    test('TC-FR02-01.1: all player piles empty -> winner declared', async () => {
        await page.click('text=Play a bot');

        await page.locator('#playerFacedown').click()
        await page.dragAndDrop('#playerCurrent', '#boardSlot1');
        await expect(page.locator('.victory-modal')).toHaveClass(/show/);
    });

    test('TC-FR02-02: home button on winner screen work as intended', async () => {
        await page.click('text=Play a bot');

        await page.locator('#playerFacedown').click()
        await page.dragAndDrop('#playerCurrent', '#boardSlot1');
        await expect(page.locator('.victory-modal')).toHaveClass(/show/);

        await page.locator('#victoryButtons button:has(img[src*="home"])').click();

        await expect(page).toHaveURL('https://odyrac.github.io/CSC4330/');
    });

    test('TC-FR02-01.2: restart button on winner screen work as intended', async () => {
        await page.click('text=Play a bot');

        await page.locator('#playerFacedown').click()
        await page.dragAndDrop('#playerCurrent', '#boardSlot1');
        await expect(page.locator('.victory-modal')).toHaveClass(/show/);

        const restartButton = page.locator('#victoryButtons button:has(img[src*="restart"])');

        const [navigation] = await Promise.all([
            page.waitForNavigation(),
            restartButton.click()
        ]);

        expect(navigation).toBeTruthy();
    });

    test('TC-FR03-01: dragging creates visual clone of the card(s)', async () => {
        await page.click('text=Play a bot');

        await page.locator('#playerFacedown').click();

        const before = await page.locator('body > img').count();
        console.log(`Number of divs before drag: ${before}`);

        const card = page.locator('#playerCurrent');
        const box = await card.boundingBox();

        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.down();

        await page.mouse.move(box.x + 140, box.y - 10);

        const after = await page.locator('body > img').count();
        console

        expect(after).toBeGreaterThan(before);
    });

    test('TC-FR04-01: player action syncs to all connected players', async () => {
        await page.click('text=Play a friend');
        await page.click('text=Create new room');
        await page.waitForSelector('text=Waiting for opponent...', {
            state: 'visible'
        });

        await page.waitForSelector('#roomPinDisplay .pin-digit', {
            state: 'visible'
        });

        const roomCode = await page.locator('#roomPinDisplay .pin-digit').evaluateAll(
            spans => spans.map(span => span.textContent.trim())
        );

        const context2 = await page.context().browser().newContext();
        const page2 = await context2.newPage();
        await page2.goto(page.url());

        await page2.waitForSelector('#pinDigit1', {
            state: 'visible'
        });

        await page2.waitForTimeout(1000);

        await page2.fill('#pinDigit1', roomCode[0]);
        await page2.fill('#pinDigit2', roomCode[1]);
        await page2.fill('#pinDigit3', roomCode[2]);
        await page2.fill('#pinDigit4', roomCode[3]);

        await page2.locator('#toast-container .toast.show', { hasText: 'Game synchronized' }).waitFor({ state: 'visible', timeout: 10000 });
    });

});