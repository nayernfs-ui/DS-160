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

const results = { images: [], missingBaseline: false };
let hadError = false;

for (const name of images) {
  const currentPath = path.join(OUT_DIR, name);
  const basePath = path.join(BASE_DIR, name);

  const cur = readPNG(currentPath);
  const base = readPNG(basePath);

  const entry = {
    name,
    currentPath,
    basePath,
    currentExists: !!cur,
    baseExists: !!base,
    width: cur ? cur.width : null,
    height: cur ? cur.height : null,
    baseWidth: base ? base.width : null,
    baseHeight: base ? base.height : null,
    diffPixels: 0,
    percent: 0,
    exceeded: false,
    diffPath: null,
  };

  if (!base) {
    console.warn(`Baseline missing for ${name}. Skipping comparison.`);
    results.missingBaseline = true;
    results.images.push(entry);
    continue;
  }
  if (!cur) {
    console.error(`Current image missing: ${currentPath}`);
    entry.error = 'current_missing';
    hadError = true;
    results.images.push(entry);
    continue;
  }

  if (cur.width !== base.width || cur.height !== base.height) {
    console.error(
      `Size mismatch for ${name}: current=${cur.width}x${cur.height} base=${base.width}x${base.height}`
    );
    entry.error = 'size_mismatch';
    hadError = true;
    results.images.push(entry);
    continue;
  }

  const diff = new PNG({ width: cur.width, height: cur.height });
  const diffPixels = pixelmatch(base.data, cur.data, diff.data, cur.width, cur.height, {
    threshold: 0.1,
    includeAA: false,
  });

  const total = cur.width * cur.height;
  const percent = (diffPixels / total) * 100;

  const diffFile = path.join(DIFF_DIR, `diff-${name}`);
  fs.writeFileSync(diffFile, PNG.sync.write(diff));

  entry.diffPixels = diffPixels;
  entry.percent = Number(percent.toFixed(6));
  entry.exceeded = percent > 0.1;
  entry.diffPath = diffFile;

  console.log(`${name}: ${diffPixels} pixels different (${percent.toFixed(4)}%)`);

  if (entry.exceeded) {
    console.error(`${name} exceeded diff threshold (0.1%)`);
    hadError = true;
  }

  results.images.push(entry);
}

if (results.missingBaseline) {
  console.warn(
    'One or more baselines were missing. To create a baseline, copy the images in the run artifacts into tests/e2e/baseline/options-row/.'
  );
}

results.passed = !hadError;

// Write machine-readable result for workflow steps
try {
  fs.writeFileSync(path.join(OUT_DIR, 'options-row-result.json'), JSON.stringify(results, null, 2));
  console.log('Wrote result:', path.join(OUT_DIR, 'options-row-result.json'));
} catch (e) {
  console.warn('Failed to write result JSON:', e);
}

const failOnDiff = (process.env.FAIL_ON_DIFF || 'true') === 'true';
if (!results.passed) {
  console.error('Visual diff failed. See diffs in', DIFF_DIR);
  if (failOnDiff) process.exit(7);
  else process.exit(0);
}

console.log('Visual diff passed for available baselines.');
process.exit(0);
