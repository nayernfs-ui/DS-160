const fs = require('fs');
const JSZip = require('jszip');
(async () => {
  const files = fs
    .readdirSync('.')
    .filter((f) => f.startsWith('test_output_docx_') && f.endsWith('.docx'))
    .sort();
  const f1 = files[0];
  const f2 = files[files.length - 1];
  console.log('Comparing', f1, 'and', f2);
  const z1 = await JSZip.loadAsync(fs.readFileSync(f1));
  const z2 = await JSZip.loadAsync(fs.readFileSync(f2));
  const doc1 = await z1.file('word/document.xml').async('string');
  const doc2 = await z2.file('word/document.xml').async('string');
  console.log('first 200 chars f1:\n', doc1.substring(0, 200));
  console.log('\nfirst 200 chars f2:\n', doc2.substring(0, 200));
  // find first difference
  let i = 0;
  while (i < doc1.length && i < doc2.length && doc1[i] === doc2[i]) i++;
  console.log('first diff idx', i);
  console.log('f1 snippet', doc1.substring(Math.max(0, i - 50), i + 50));
  console.log('f2 snippet', doc2.substring(Math.max(0, i - 50), i + 50));
})();
