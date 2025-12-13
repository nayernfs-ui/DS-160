const submit = require('./api/submit.js');
const JSZip = require('jszip');

(async () => {
  const sample = { FullName: 'محمد علي' };
  const buf = await submit.generateDocument(sample, { includeHeaderImage: false });
  const zip = await JSZip.loadAsync(buf);
  const mediaFiles = zip.filter((relativePath) => relativePath.startsWith('word/media/'));
  console.log('mediaFiles length:', mediaFiles.length);
  mediaFiles.forEach(m => console.log('media:', m.name || m));
})();
