const fs = require('fs');
const path = require('path');
const submit = require('./api/submit.js');

const sampleFormData = {
    FullName: 'محمد علي',
    FirstName_Arabic: 'محمد',
    LastName_Arabic: 'علي',
    Current_Workplace: 'بنى سويف للخدمات الهندسية',
    ContactInformation: 'القاهرة، مصر'
};

async function runDocxSmokeTest() {
    console.log('Starting DOCX generation smoke test...');
    try {
        if (!submit.generateDocument || typeof submit.generateDocument !== 'function') {
            throw new Error('generateDocument is not exported from api/submit.js');
        }
        const buffer = await submit.generateDocument(sampleFormData);
        if (!Buffer.isBuffer(buffer)) throw new Error('generateDocument did not return a Buffer');

        // Basic check: DOCX files are ZIP files and start with 'PK' (0x50 0x4B)
        const startsWithPK = buffer[0] === 0x50 && buffer[1] === 0x4B;
        if (!startsWithPK) throw new Error('Generated file does not seem to be a valid DOCX (missing PK signature)');

        const outFile = path.join(__dirname, `test_output_docx_${Date.now()}.docx`);
        fs.writeFileSync(outFile, buffer);
        console.log('✅ DOCX Smoke Test Successful! File saved to:', outFile);
    } catch (err) {
        console.error('❌ DOCX Smoke Test Failed!', err);
        process.exitCode = 2;
    }
}

runDocxSmokeTest();
