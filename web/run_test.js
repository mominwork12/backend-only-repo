const { chromium } = require('playwright');

(async () => {
    try {
        const browser = await chromium.launch();
        const page = await browser.newPage();
        
        page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
        page.on('pageerror', err => console.log('BROWSER ERROR:', err));
        
        await page.goto('http://localhost:3000');
        await page.waitForTimeout(2000);
        
        console.log("Clicking RENDER VIDEO...");
        await page.click('[data-testid="render-video-btn"]');
        
        await page.waitForTimeout(5000);
        
        const isGen = await page.isVisible('[data-testid="render-video-btn"] span.animate-spin');
        console.log('Generating spinner visible after 5s:', isGen);
        
        await browser.close();
    } catch (e) {
        console.error('Caught script error:', e);
        process.exit(1);
    }
})();
