import { test, expect } from '@playwright/test';
import { timeout } from '../../../../playwright.config';

test.describe('Local Play E2E Test', () => {
    let page;
    
     test.beforeEach(async ({ browser, baseURL }) => {
        const context = await browser.newContext();
        page = await context.newPage();

        //navigate to the home page
        await page.goto(baseURL); 

        //click 'play a bot' button
        await page.click('text=Play locally');
        await page.waitForTimeout(3000); 

    });

    test('home button', async () => {
        //click the home button
        await page.locator('button:has(img[src$="home.png"])').click()

        //verify that we are back on the home page
        await expect(page).toHaveURL('https://odyrac.github.io/CSC4330/');
    });

     test('full-screen button', async () => {
        //click the full-screen button
        await page.locator('button:has(img[src$="maximize.png"])').click()
        
        //verify that we are full-screen
        const isFullscreen = await page.evaluate(() => {
        return document.fullscreenElement !== null;
        });
        expect(isFullscreen).toBe(true);
    });
});