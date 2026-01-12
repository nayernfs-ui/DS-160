#!/usr/bin/env node
const puppeteer = require('puppeteer');
const path = require('path');
(async () => {
  const fileUrl = `file:${path.resolve(__dirname, '..', 'public', 'index.html')}`;
  try {
    const browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      headless: 'new',
    });
    const page = await browser.newPage();
    await page.goto(fileUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

    const display = await page.evaluate(() => {
      const el = document.getElementById('lost_passport_details');
      const noRadio = document.getElementById('lostPassportNo');
      return {
        display: el ? window.getComputedStyle(el).display : 'missing',
        noChecked: !!(noRadio && noRadio.checked),
      };
    });

    console.log('lost_passport_details display:', display.display);
    console.log('lostPassportNo checked:', display.noChecked);

    await browser.close();
    if (display.display === 'none' && display.noChecked) {
      console.log('check PASSED');
      process.exit(0);
    }
    console.error('check FAILED');
    process.exit(2);
  } catch (err) {
    console.error('Error running lost-passport check:', err && err.message ? err.message : err);
    process.exit(1);
  }
})();
