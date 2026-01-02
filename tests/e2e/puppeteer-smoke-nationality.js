const puppeteer = require('puppeteer');

(async () => {
  const url = process.argv[2] || 'https://ds-160-fresh.vercel.app/';
  console.log('Running nationality visibility smoke test against', url);
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  page.setDefaultTimeout(20000);

  try {
    await page.goto(url, { waitUntil: 'networkidle2' });
    const statuses = ['Single', 'Married', 'Divorced'];
    let ok = true;

    for (const s of statuses) {
      // set marital status if select exists
      await page.evaluate((s) => {
        const sel = document.getElementById('maritalStatus');
        if (sel) {
          try {
            sel.value = s;
            sel.dispatchEvent(new Event('change', { bubbles: true }));
          } catch (e) {
            // ignore
          }
        }
      }, s);

      await page.waitForTimeout(400);

      const visible = await page.evaluate(() => {
        const el =
          document.querySelector('#nationality') ||
          document.querySelector('label[for="nationality"]');
        if (!el) return false;
        const style = window.getComputedStyle(el);
        const rect = el.getBoundingClientRect
          ? el.getBoundingClientRect()
          : { width: 0, height: 0 };
        return !(
          style.display === 'none' ||
          style.visibility === 'hidden' ||
          (rect.width === 0 && rect.height === 0)
        );
      });

      console.log(`[${s}] nationality visible?`, visible);
      if (visible) ok = false;
    }

    await browser.close();

    if (!ok) {
      console.error('Smoke test FAILED: nationality visible for at least one marital status');
      process.exit(1);
    }

    console.log('Smoke test PASSED: nationality not visible for Single/Married/Divorced');
    process.exit(0);
  } catch (err) {
    await browser.close();
    console.error('Smoke test ERROR', err);
    process.exit(1);
  }
})();
