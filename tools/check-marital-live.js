const puppeteer = require('puppeteer');
(async () => {
  const url = process.env.TARGET_URL || 'https://ds-160-fresh.vercel.app/';
  console.log('Checking URL:', url);
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'], dumpio: true });
  const page = await browser.newPage();
  // mimic a regular browser
  const ua =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  await page.setUserAgent(ua);
  await page.setExtraHTTPHeaders({ 'Accept-Language': 'en-US,en;q=0.9' });
  try {
    await page.goto(url, { waitUntil: 'load', timeout: 120000 });
    console.log('Page loaded (load)');
    await page.waitForSelector('#maritalStatus', { timeout: 30000 });
    console.log('Selecting Married');
    await page.select('#maritalStatus', 'Married');
    // small delay to allow event handlers to run
    await new Promise((r) => setTimeout(r, 300));
    // Inspect whether the expected fieldsets exist and their display values.
    const info = await page.evaluate(() => {
      const widowedEl = document.getElementById('widowedFields');
      const marriedEl = document.getElementById('marriedFields');
      const allIds = Array.from(document.querySelectorAll('[id]')).map((el) => el.id);
      const conditional = Array.from(document.querySelectorAll('.conditional-fields')).map(
        (el) => ({ id: el.id, display: window.getComputedStyle(el).display })
      );
      const spouseAddr = document.getElementById('spouseCurrentAddress');
      return {
        widowedExists: !!widowedEl,
        widowedDisplay: widowedEl ? window.getComputedStyle(widowedEl).display : null,
        marriedExists: !!marriedEl,
        marriedDisplay: marriedEl ? window.getComputedStyle(marriedEl).display : null,
        idsContainingWidow: allIds.filter((id) => /widow/i.test(id)),
        idsContainingMarried: allIds.filter((id) => /married|spouse/i.test(id)),
        spouseAddrRequired: spouseAddr ? spouseAddr.hasAttribute('required') : null,
        conditionalFields: conditional,
      };
    });
    console.log('inspected info:', JSON.stringify(info, null, 2));
    await browser.close();
    process.exit(0);
  } catch (err) {
    console.error('Error during check:', err && (err.stack || err.message || err));
    await browser.close();
    process.exit(2);
  }
})();
