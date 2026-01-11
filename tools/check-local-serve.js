(async () => {
  const p = require('puppeteer');
  try {
    const b = await p.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await b.newPage();
    const url = 'http://localhost:8080/';
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
    const natCount = await page.evaluate(() => {
      const s = document.querySelector('#nationality');
      return s && s.options ? s.options.length : 0;
    });
    const otherCount = await page.evaluate(() => {
      const s = document.querySelector('#otherPermanentResidentSelect');
      return s && s.options ? s.options.length : 0;
    });
    const selOpts = await page.evaluate(() => {
      const s = document.querySelector('#otherPermanentResidentSelect');
      return s && s.options
        ? Array.from(s.options)
            .slice(0, 10)
            .map((o) => o.text)
        : [];
    });
    const out = {
      natCount,
      otherCount,
      sample: selOpts,
    };
    console.log(JSON.stringify(out, null, 2));
    await page.screenshot({ path: 'tools/after-fix-local.png' });
    await b.close();
  } catch (e) {
    console.error('ERROR', e && e.message);
    process.exit(1);
  }
})();
