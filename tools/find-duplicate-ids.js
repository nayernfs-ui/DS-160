const fs = require('fs');
const path = require('path');

function findDuplicates(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const ids = {};
  const regex = /id\s*=\s*"([^"]+)"/g;
  let m;
  while ((m = regex.exec(content))) {
    const id = m[1];
    ids[id] = (ids[id] || 0) + 1;
  }
  const dups = Object.keys(ids)
    .filter((k) => ids[k] > 1)
    .map((k) => ({ id: k, count: ids[k] }));
  return dups;
}

['index.html', 'public/index.html'].forEach((f) => {
  const p = path.join(process.cwd(), f);
  if (!fs.existsSync(p)) {
    console.log(`${f}: not found`);
    return;
  }
  const dups = findDuplicates(p);
  if (dups.length) {
    console.log(`${f}: duplicates found:`);
    dups.forEach((d) => console.log(`  ${d.id}: ${d.count}`));
  } else {
    console.log(`${f}: no duplicates`);
  }
});
