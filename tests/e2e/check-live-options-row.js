const puppeteer = require('puppeteer');

(async () => {
  try {
    const url = process.env.TARGET_URL || 'https://ds-160-fresh.vercel.app';
    console.log('LIVE OPTIONS-ROW CHECK: Target URL:', url);

    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    });
    const page = await browser.newPage();
    page.on('console', (m) => console.log('PAGE CONSOLE:', m.text()));
    page.on('pageerror', (err) =>
      console.error('PAGE ERROR:', err && (err.stack || err.message || err))
    );

    const check = async (viewport, dir) => {
      console.log(' - checking', viewport.width, 'x', viewport.height, 'dir=', dir);
      await page.setViewport(viewport);
      try {
        console.log('   -> navigating to', url);
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        console.log('   -> navigation complete');
      } catch (e) {
        console.error('   -> navigation failed:', e && (e.message || e));
        throw e;
      }
      await page.evaluate((d) => document.documentElement.setAttribute('dir', d), dir);
      // small wait for layout
      await page.waitForTimeout(250);

      const results = await page.evaluate(() => {
        const out = [];
        const nodes = Array.from(document.querySelectorAll('.options-row'));
        for (const el of nodes) {
          const cs = getComputedStyle(el);
          const labels = Array.from(el.querySelectorAll('label'));
          const labelChecks = labels.map((lab) => {
            // get the radio input inside the label or inside label children
            const input = lab.querySelector('input[type=radio], input[type=checkbox]');
            // measure input rect and text rect (range after input)
            let inputRect = null;
            let textRect = null;
            try {
              if (input) {
                inputRect = input.getBoundingClientRect();
                // create a range covering the label's text (start after the input)
                const range = document.createRange();
                // start after input if input exists, otherwise at start of label
                if (input.nextSibling) {
                  range.setStartAfter(input);
                } else {
                  range.setStart(lab, 0);
                }
                range.setEnd(lab, lab.childNodes.length);
                const rects = range.getBoundingClientRect
                  ? [range.getBoundingClientRect()]
                  : Array.from(range.getClientRects());
                textRect = rects && rects[0] ? rects[0] : null;
              } else {
                // fallback to label text rect
                const range = document.createRange();
                range.selectNodeContents(lab);
                const r = range.getBoundingClientRect
                  ? range.getBoundingClientRect()
                  : Array.from(range.getClientRects())[0];
                textRect = r || null;
              }
            } catch (e) {
              // ignore measurement errors
            }

            let overlap = false;
            if (inputRect && textRect) {
              const overlapLeft = Math.max(inputRect.left, textRect.left);
              const overlapRight = Math.min(inputRect.right, textRect.right);
              const overlapWidth = Math.max(0, overlapRight - overlapLeft);
              overlap = overlapWidth > 4; // allow small anti-alias gap
            }
            return {
              html: lab.innerText.trim().slice(0, 120),
              hasInput: !!input,
              inputRect: inputRect
                ? {
                    left: Math.round(inputRect.left),
                    right: Math.round(inputRect.right),
                    width: Math.round(inputRect.width),
                  }
                : null,
              textRect: textRect
                ? {
                    left: Math.round(textRect.left),
                    right: Math.round(textRect.right),
                    width: Math.round(textRect.width),
                  }
                : null,
              overlap,
              whiteSpace: getComputedStyle(lab).whiteSpace,
            };
          });

          out.push({
            found: true,
            display: cs.display,
            flexDirection: cs.flexDirection,
            labels: labelChecks,
          });
        }
        return out;
      });

      return { viewport, dir, results };
    };

    const checks = [];
    checks.push(await check({ width: 1200, height: 900 }, 'ltr'));
    checks.push(await check({ width: 375, height: 812 }, 'ltr'));
    checks.push(await check({ width: 1200, height: 900 }, 'rtl'));
    checks.push(await check({ width: 375, height: 812 }, 'rtl'));

    await browser.close();

    console.log('LIVE CHECK RESULTS:\n', JSON.stringify(checks, null, 2));
    // exit code reflects any overlaps
    const anyOverlap = checks.some((c) => c.results.some((r) => r.labels.some((l) => l.overlap)));
    process.exit(anyOverlap ? 8 : 0);
  } catch (err) {
    console.error('LIVE CHECK: failed', err && (err.stack || err.message || err));
    process.exit(2);
  }
})();
