const path = require('path');
const puppeteer = require('puppeteer');
(async () => {
  const filePath = path.resolve(__dirname, '..', 'public', 'index.html');
  const url = 'file://' + filePath;
  console.log('Opening local file URL:', url);
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  try {
    await page.goto(url, { waitUntil: 'load', timeout: 30000 });
    // Ensure marital select exists
    await page.waitForSelector('#maritalStatus', { timeout: 5000 });

    // Select Married (use value case-insensitive)
    await page.select('#maritalStatus', 'Married');
    await new Promise((r) => setTimeout(r, 300));

    const widowedDisplay = await page.$eval('#widowedFields', (el) => {
      return window.getComputedStyle(el).display;
    });

    console.log('After selecting Married: #widowedFields display =', widowedDisplay);

    // Also check inline style if present
    const inline = await page.$eval('#widowedFields', (el) => el.style.display || '');
    console.log('Inline style on #widowedFields =', inline);

    await browser.close();
    process.exit(0);
  } catch (err) {
    console.error('Error during local check:', err && (err.stack || err.message || err));
    await browser.close();
    process.exit(2);
  }
})();
