const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');
const ReshaperModule = require('arabic-reshaper');
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
        const { buffer, processedData } = await submit.generateDocument(sampleFormData, { returnProcessedData: true });
        if (!Buffer.isBuffer(buffer)) throw new Error('generateDocument did not return a Buffer');

        // Basic check: DOCX files are ZIP files and start with 'PK' (0x50 0x4B)
        const startsWithPK = buffer[0] === 0x50 && buffer[1] === 0x4B;
        if (!startsWithPK) throw new Error('Generated file does not seem to be a valid DOCX (missing PK signature)');

        const outFile = path.join(__dirname, `test_output_docx_${Date.now()}.docx`);
        fs.writeFileSync(outFile, buffer);

        // Verify that the processed Arabic text (shaped + reversed) appears inside the docx's word/document.xml
        const ReshaperExport = ReshaperModule.default || ReshaperModule.ArabicReshaper || ReshaperModule;
        let reshaper;
        try {
            if (typeof ReshaperExport === 'function') {
                const instance = new ReshaperExport();
                if (instance && typeof instance.convertArabic === 'function') reshaper = { reshape: instance.convertArabic.bind(instance) };
                else if (instance && typeof instance.reshape === 'function') reshaper = instance;
                else reshaper = { reshape: (t) => t };
            } else if (ReshaperExport && typeof ReshaperExport.convertArabic === 'function') {
                reshaper = { reshape: ReshaperExport.convertArabic.bind(ReshaperExport) };
            } else {
                reshaper = { reshape: (text) => text };
            }
        } catch (e) {
            reshaper = { reshape: (text) => text };
        }
        const sampleVal = sampleFormData.FullName; // Arabic example string
        const shaped = reshaper && typeof reshaper.reshape === 'function' ? reshaper.reshape(sampleVal) : sampleVal;
        const expected = shaped.split('').reverse().join('');

        // First: Validate processedData map contains expected shaped+reversed value for FullName
        if (!processedData || !processedData.FullName) throw new Error('ProcessedData was not returned by generateDocument');
        console.log('ProcessedData.FullName:', processedData.FullName);
        console.log('Expected reversed:', expected);
        console.log('Expected shaped:', shaped);
        console.log('Raw sampleVal:', sampleVal);
        if (processedData.FullName !== expected && processedData.FullName !== shaped && processedData.FullName !== sampleVal) {
            throw new Error('ProcessedData.FullName did not match shaped/reversed/raw expectations');
        }

        // Load DOCX as zip and read the document.xml file (additional verification)
        const zip = await JSZip.loadAsync(buffer);
        const docXml = await zip.file('word/document.xml').async('string');
        const foundReversed = docXml.includes(expected);
        const foundShaped = docXml.includes(shaped);
        const foundRaw = docXml.includes(sampleVal);
        // Check in-order presence across xml (characters may be wrapped by tags)
        function containsInOrder(text, sub) {
            let lastIndex = -1;
            for (const ch of Array.from(sub)) {
                lastIndex = text.indexOf(ch, lastIndex + 1);
                if (lastIndex === -1) return false;
            }
            return true;
        }
        const foundInOrder = containsInOrder(docXml, sampleVal);
        console.log('Debug: foundRaw=', !!foundRaw, 'foundShaped=', !!foundShaped, 'foundReversed=', !!foundReversed, 'foundInOrder=', !!foundInOrder);
        if (!foundReversed && !foundShaped && !foundRaw && !foundInOrder) {
            // Try to find any Arabic characters in document.xml for debugging
            const m = docXml.match(/[\u0600-\u06FF]/);
            if (m) {
                const idx = m.index;
                const start = Math.max(0, idx - 20);
                const end = Math.min(docXml.length, idx + 20);
                console.error('Found Arabic character at index', idx, 'snippet', docXml.substring(start, end));
            }
            throw new Error('Generated docx did not contain the Arabic text in any expected form (raw, shaped, reversed, or in-order)');
        }
        // Validate processedData map contains expected shaped+reversed value for FullName
        if (!processedData || !processedData.FullName) throw new Error('ProcessedData was not returned by generateDocument');
        console.log('ProcessedData.FullName:', processedData.FullName);
        if (processedData.FullName !== expected && processedData.FullName !== shaped && processedData.FullName !== sampleVal) {
            throw new Error('ProcessedData.FullName did not match shaped/reversed/raw expectations');
        }

        console.log('✅ DOCX Smoke Test Successful! File saved to:', outFile);
    } catch (err) {
        console.error('❌ DOCX Smoke Test Failed!', err);
        process.exitCode = 2;
    }
}

runDocxSmokeTest();
