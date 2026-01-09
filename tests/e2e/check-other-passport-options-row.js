const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  const url = process.env.TARGET_URL || 'http://127.0.0.1:3000';
  try {
    await page.goto(url, { waitUntil: 'networkidle2' });
    // ensure the other nationality radios exist
    await page.waitForSelector('input[name="HasOtherNationality"][value="Yes"]', { timeout: 2000 });
    await page.click('input[name="HasOtherNationality"][value="Yes"]');
    // wait for the otherNationalityFields to be visible
    await page.waitForSelector('#otherNationalityFields', { visible: true, timeout: 2000 });
    // click Yes on the passport question
    await page.waitForSelector('input[name="Other_Nationality_Passport"][value="Yes"]', {
      timeout: 2000,
    });
    // Evaluate DOM: check that both passport radios are inside an .options-row
    const result = await page.evaluate(() => {
      const nodes = Array.from(
        document.querySelectorAll('input[name="Other_Nationality_Passport"]')
      );
      if (!nodes || nodes.length < 2) return { ok: false, reason: 'passport radios missing' };
      const parents = nodes.map((n) => n.closest('.options-row'));
      const all = parents.every((p) => p !== null);
      const display = parents[0] ? window.getComputedStyle(parents[0]).display : null;
      return { ok: all, display };
    });

    if (!result.ok) {
      console.error('FAIL: passport radios are not wrapped in .options-row');
      await browser.close();
      process.exit(1);
    }
    console.log('PASS: passport radios are inside .options-row, display=', result.display);
    await browser.close();
    process.exit(0);
  } catch (e) {
    console.error('ERROR', e);
    try {
      await browser.close();
    } catch (e2) {
      /* ignore */
    }
    process.exit(1);
  }
})();
