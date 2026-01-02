const puppeteer = require('puppeteer');

(async () => {
  const url = process.env.TARGET_URL || 'https://ds-160-fresh.vercel.app/';
  console.log('NAV-DEBUG: Target', url);
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  console.log('NAV-DEBUG: launched');
  const page = await browser.newPage();
  console.log('NAV-DEBUG: new page');
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
    console.log('NAV-DEBUG: nav done');
    const title = await page.title();
    console.log('NAV-DEBUG: title', title);
  } catch (e) {
    console.error('NAV-DEBUG: nav failed', e && e.message);
  }
  await browser.close();
})();
