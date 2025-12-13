const fs = require('fs');
const path = require('path');
const submit = require('./api/submit.js');

(async () => {
  try {
    const sample = { FullName: 'Test', MaritalStatus: 'Single', ContactInformation: 'test@email.com' };
    const buf = await submit.generateDocument(sample, { includeHeaderImage: false });
    const outPath = path.resolve(__dirname, 'test_minimal_no_header.docx');
    fs.writeFileSync(outPath, buf);
    console.log('✅ Minimal DOCX (no header) written:', outPath);
  } catch (e) {
    console.error('❌ Error:', e.message);
  }
})();
