const fs = require('fs');
const JSZip = require('jszip');
(async () => {
  const f1 = 'test_output_docx_1765661781320.docx';
  const f2 = 'noheader.docx';
  const z1 = await JSZip.loadAsync(fs.readFileSync(f1));
  const z2 = await JSZip.loadAsync(fs.readFileSync(f2));
  const files1 = Object.keys(z1.files)
    .filter((n) => n.endsWith('.xml'))
    .sort();
  const files2 = Object.keys(z2.files)
    .filter((n) => n.endsWith('.xml'))
    .sort();
  const allFiles = Array.from(new Set([...files1, ...files2]));
  for (const f of allFiles) {
    const v1 = z1.files[f] ? await z1.file(f).async('string') : null;
    const v2 = z2.files[f] ? await z2.file(f).async('string') : null;
    if (v1 === v2) continue;
    if (v1 === null) {
      console.log(f, 'missing in f1');
      continue;
    }
    if (v2 === null) {
      console.log(f, 'missing in f2');
      continue;
    }
    let i = 0;
    while (i < v1.length && i < v2.length && v1[i] === v2[i]) i++;
    console.log('diff in', f, 'first diff idx', i);
    console.log('v1 snippet', v1.substring(Math.max(0, i - 50), i + 50));
    console.log('v2 snippet', v2.substring(Math.max(0, i - 50), i + 50));
  }
})();
