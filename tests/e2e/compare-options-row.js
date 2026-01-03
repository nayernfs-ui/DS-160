const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');
const pixelmatch = require('pixelmatch');

const OUT_DIR = path.resolve(__dirname, 'trace-output', 'options-row');
const BASE_DIR = path.resolve(__dirname, 'baseline', 'options-row');
const DIFF_DIR = path.join(OUT_DIR, 'diffs');
if (!fs.existsSync(DIFF_DIR)) fs.mkdirSync(DIFF_DIR, { recursive: true });

const images = ['ltr-desktop.png', 'ltr-mobile.png', 'rtl-desktop.png', 'rtl-mobile.png'];

function readPNG(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return PNG.sync.read(fs.readFileSync(filePath));
}

let hadError = false;
let missingBaseline = false;

for (const name of images) {
  const currentPath = path.join(OUT_DIR, name);
  const basePath = path.join(BASE_DIR, name);

  const cur = readPNG(currentPath);
  const base = readPNG(basePath);

  if (!base) {
    console.warn(`Baseline missing for ${name}. Skipping comparison.`);
    missingBaseline = true;
    continue;
  }
  if (!cur) {
    console.error(`Current image missing: ${currentPath}`);
    hadError = true;
    continue;
  }

  if (cur.width !== base.width || cur.height !== base.height) {
    console.error(
      `Size mismatch for ${name}: current=${cur.width}x${cur.height} base=${base.width}x${base.height}`
    );
    hadError = true;
    continue;
  }

  const diff = new PNG({ width: cur.width, height: cur.height });
  const diffPixels = pixelmatch(base.data, cur.data, diff.data, cur.width, cur.height, {
    threshold: 0.1,
    includeAA: false,
  });

  const total = cur.width * cur.height;
  const percent = (diffPixels / total) * 100;

  fs.writeFileSync(path.join(DIFF_DIR, `diff-${name}`), PNG.sync.write(diff));

  console.log(`${name}: ${diffPixels} pixels different (${percent.toFixed(4)}%)`);

  // Fail if more than 0.1% of pixels differ
  if (percent > 0.1) {
    console.error(`${name} exceeded diff threshold (0.1%)`);
    hadError = true;
  }
}

if (missingBaseline) {
  console.warn(
    'One or more baselines were missing. To create a baseline, copy the images in the run artifacts into tests/e2e/baseline/options-row/.'
  );
  // Not a hard failure for first-time runs; recommend manual baseline acceptance
}

if (hadError) {
  console.error('Visual diff failed. See diffs in', DIFF_DIR);
  process.exit(7);
}

console.log('Visual diff passed for available baselines.');
process.exit(0);
