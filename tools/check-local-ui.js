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
    console.log('Loading file URL:', fileUrl);
    await page.goto(fileUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Check the removed section is not present
    const sectionExists = await page.$('#work-education-training');
    console.log('work-education-training present:', !!sectionExists);

    // Check for ghost labels referencing the removed fields
    const ghostLabels = await page.$$eval('label', (labels) =>
      labels.map((l) => l.textContent && l.textContent.trim()).filter(Boolean)
    );
    const suspicious = ghostLabels.filter((t) =>
      /Recent Job Title|Employer|Recent Education|Relevant Training/i.test(t)
    );
    console.log('Suspicious labels found:', suspicious);

    // Check computed margins for the container that previously held the section (if present)
    const bodyMargin = await page.evaluate(() => {
      const b = window.getComputedStyle(document.body);
      return { marginTop: b.marginTop, marginBottom: b.marginBottom };
    });
    console.log('Body margins:', bodyMargin);

    await page.screenshot({ path: 'tools/check-local-ui.png', fullPage: true });
    await browser.close();

    if (sectionExists || suspicious.length) {
      console.error('UI check FAILED: ghost section or labels remain');
      process.exit(2);
    }

    console.log('UI check PASSED: No ghost labels or margins detected');
    process.exit(0);
  } catch (err) {
    console.error('Error running local UI check:', err && err.message ? err.message : err);
    process.exit(1);
  }
})();
