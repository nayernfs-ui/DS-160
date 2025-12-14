const fs = require('fs');
const submit = require('../api/submit.js');
(async () => {
  try {
    const sampleFormData = {
      FullName: 'محمد علي',
      FirstName_Arabic: 'محمد',
      LastName_Arabic: 'علي',
    };
    const bufNoHeader = await submit.generateDocument(sampleFormData, {
      includeHeaderImage: false,
    });
    fs.writeFileSync('noheader.docx', bufNoHeader);
    console.log('Wrote noheader.docx');
  } catch (e) {
    console.error('Error', e);
    process.exit(1);
  }
})();
