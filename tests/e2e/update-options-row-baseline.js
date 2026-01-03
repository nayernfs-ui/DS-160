const fs = require('fs');
const path = require('path');

const OUT_DIR = path.resolve(__dirname, 'trace-output', 'options-row');
const BASE_DIR = path.resolve(__dirname, 'baseline', 'options-row');

if (!fs.existsSync(OUT_DIR)) {
  console.error('No current artifacts found in', OUT_DIR);
  process.exit(2);
}
if (!fs.existsSync(BASE_DIR)) fs.mkdirSync(BASE_DIR, { recursive: true });

const pngs = fs.readdirSync(OUT_DIR).filter((f) => f.endsWith('.png'));
if (!pngs.length) {
  console.error('No PNGs to copy from', OUT_DIR);
  process.exit(3);
}
for (const f of pngs) {
  const src = path.join(OUT_DIR, f);
  const dst = path.join(BASE_DIR, f);
  fs.copyFileSync(src, dst);
  console.log('Copied baseline:', f);
}
console.log('Baselines updated in', BASE_DIR);
process.exit(0);
