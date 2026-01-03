const puppeteer = require('puppeteer');
/* global hideAllMaritalFields, updateMaritalFields, updateProgressBar */
(async () => {
  const file = process.env.TARGET_URL || 'http://127.0.0.1:3000/';
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    dumpio: false,
  });
  const page = await browser.newPage();
  page.on('console', (msg) => console.log('PAGE LOG:', msg.text()));
  try {
    await page.goto(file, { waitUntil: 'domcontentloaded', timeout: 60000 });
  } catch (e) {
    const htmlPath = require('path').resolve(__dirname, '../../public/index.html');
    const cssPath = require('path').resolve(__dirname, '../../public/style.css');
    const jsPath = require('path').resolve(__dirname, '../../public/js/script.js');
    const html = require('fs').readFileSync(htmlPath, 'utf8');
    await page.setContent(html);
    await page.addStyleTag({ path: cssPath });
    await page.addScriptTag({ path: jsPath });
    await page.evaluate(() => {
      if (typeof hideAllMaritalFields === 'function') hideAllMaritalFields();
      if (typeof updateMaritalFields === 'function') updateMaritalFields();
      if (typeof updateProgressBar === 'function') updateProgressBar();
    });
  }
  // Wait a moment
  await new Promise((r) => setTimeout(r, 200));
  const info = await page.evaluate(() => {
    const bars = Array.from(document.querySelectorAll('form > fieldset'));
    const details = bars.map((fs, idx) => {
      const r = fs.getBoundingClientRect();
      return {
        idx,
        id: fs.id || null,
        top: r.top,
        bottom: r.bottom,
        height: r.height,
        visible: !(fs.offsetParent === null),
      };
    });
    const win = {
      innerHeight: window.innerHeight,
      scrollY: window.scrollY,
      bodyHeight: document.body.scrollHeight,
    };
    const barEl = document.querySelector('.progress-bar');
    const progressEl = document.querySelector('.progress');
    let styleWidth = null;
    let computed = null;
    if (barEl) {
      styleWidth = barEl.style.width;
      computed = getComputedStyle(barEl).width;
    } else if (
      progressEl &&
      progressEl.tagName &&
      progressEl.tagName.toUpperCase() === 'PROGRESS'
    ) {
      styleWidth = (progressEl.value != null ? progressEl.value : 0) + '%';
      const containerW = getComputedStyle(progressEl).width;
      const pct = Number(progressEl.value) || 0;
      const numeric = parseFloat(containerW) || 0;
      computed = (numeric * pct) / 100 + 'px';
    }
    const progress = { styleWidth, computed };
    return { count: bars.length, details, win, progress };
  });
  console.log('INSPECT:', JSON.stringify(info, null, 2));
  await browser.close();
})();
