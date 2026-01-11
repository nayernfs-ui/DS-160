const fs = require('fs');
const puppeteer = require('puppeteer');
(async () => {
  const htmlFull = fs.readFileSync('public/index.html', 'utf8');
  const lines = htmlFull.split('\n');
  let high = lines.length;
  let good = 0;
  let bad = high;
  for (let mid = 2668; mid <= 2680; mid += 1) {
    const chunk = lines.slice(0, mid).join('\n');
    console.log('Trying lines:', mid);
    try {
      const b = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
      const p = await b.newPage();
      const completed = await Promise.race([
        p
          .setContent(chunk, { waitUntil: 'domcontentloaded', timeout: 5000 })
          .then(() => true)
          .catch((e) => {
            throw e;
          }),
        new Promise((_, r) => setTimeout(() => r(false), 6000)),
      ]);
      await b.close();
      if (completed) {
        console.log('OK at lines', mid);
        good = mid;
      } else {
        console.log('HUNG at lines', mid);
        bad = mid;
        break;
      }
    } catch (e) {
      console.log('ERROR at lines', mid, e && e.message);
      bad = mid;
      break;
    }
  }
  console.log('done: last good', good, 'first bad', bad);
})();
