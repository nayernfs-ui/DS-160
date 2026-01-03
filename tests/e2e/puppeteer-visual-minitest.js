const puppeteer = require('puppeteer');
/* global updateProgressBar */
(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    dumpio: false,
  });
  const page = await browser.newPage();
  try {
    const htmlPath = require('path').resolve(__dirname, '../../public/index.html');
    const cssPath = require('path').resolve(__dirname, '../../public/style.css');
    const jsPath = require('path').resolve(__dirname, '../../public/js/script.js');
    const html = require('fs').readFileSync(htmlPath, 'utf8');
    await page.setContent(html);
    await page.addStyleTag({ path: cssPath });
    await page.addScriptTag({ path: jsPath });
    // Dispatch DOMContentLoaded and run init
    await page.evaluate(() => {
      window.dispatchEvent(new Event('DOMContentLoaded'));
      if (typeof updateProgressBar === 'function') updateProgressBar();
    });
    // Small wait
    await new Promise((r) => setTimeout(r, 200));
    const info = await page.evaluate(() => {
      const bars = Array.from(document.querySelectorAll('form > fieldset'));
      const progress = document.querySelector('.progress');
      const bar = document.querySelector('.progress-bar');
      let aria = null;
      let style = null;
      let computed = null;
      if (progress) {
        aria =
          progress.getAttribute('aria-valuenow') ||
          (progress.value != null ? String(progress.value) : null);
      }
      if (bar) {
        style = bar.style.width;
        computed = getComputedStyle(bar).width;
      } else if (progress && progress.tagName && progress.tagName.toUpperCase() === 'PROGRESS') {
        style = progress.value + '%';
        const containerW = getComputedStyle(progress).width;
        const pct = Number(progress.value) || 0;
        const numeric = parseFloat(containerW) || 0;
        computed = (numeric * pct) / 100 + 'px';
      }
      return {
        bars: bars.map((b) => ({ id: b.id || null, offsetTop: b.offsetTop })),
        progress: { aria, style, computed },
      };
    });
    console.log('MINITEST RESULT:', JSON.stringify(info, null, 2));
  } catch (e) {
    console.error('MINITEST ERROR', e);
  } finally {
    await browser.close();
  }
})();
