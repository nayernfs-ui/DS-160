const fs = require('fs');
const path = require('path');
const pdfMake = require('pdfmake/build/pdfmake');
const pdfFonts = require('pdfmake/build/vfs_fonts');
// Import Reshaper as module to handle property fallbacks in the smoke test
const ReshaperModule = require('arabic-reshaper');

// Local font path (project root Fonts folder)
const ARABIC_FONT_PATH = path.join(__dirname, 'Fonts', 'ae_AlArabiya.ttf');

// Setup pdfMake VFS and include Arabic font
pdfMake.vfs = pdfFonts.pdfMake && pdfFonts.pdfMake.vfs ? pdfFonts.pdfMake.vfs : pdfFonts;
try {
    if (fs.existsSync(ARABIC_FONT_PATH)) {
        pdfMake.vfs['ae_AlArabiya.ttf'] = fs.readFileSync(ARABIC_FONT_PATH).toString('base64');
    }
} catch (e) {
    console.warn('Could not add Arabic font to pdfMake vfs:', e.message || e);
}
pdfMake.fonts = {
    Roboto: { normal: 'Roboto-Regular.ttf', bold: 'Roboto-Medium.ttf', italics: 'Roboto-Italic.ttf', bolditalics: 'Roboto-Italic.ttf' },
    AEAlArabiya: { normal: 'ae_AlArabiya.ttf', bold: 'ae_AlArabiya.ttf' }
};

// Minimal FIELD_MAP (copy necessary keys from api/submit.js)
const FIELD_MAP = {
    FullName: 'Full Name (Arabic)',
    FirstName_Arabic: 'First Name (Arabic)',
    LastName_Arabic: 'Last Name (Arabic)',
    Current_Workplace: 'Current Workplace',
    ContactInformation: 'Contact Information'
};

// Helper to detect Arabic chars
const containsArabic = (s) => /[\u0600-\u06FF]/.test(String(s || ''));

// Use pdfmake to generate a PDF buffer for the smoke test
async function generatePDF(formData) {
    // Initialize reshaper as before to guarantee correct shaping
    const ReshaperExport = ReshaperModule.default || ReshaperModule.ArabicReshaper || ReshaperModule;
    let reshaper;
    try {
        if (typeof ReshaperExport === 'function') {
            try {
                const instance = new ReshaperExport();
                if (instance && typeof instance.convertArabic === 'function') {
                    reshaper = { reshape: instance.convertArabic.bind(instance) };
                } else if (instance && typeof instance.reshape === 'function') {
                    reshaper = instance;
                } else {
                    reshaper = { reshape: (t) => t };
                }
            } catch (instErr) {
                const value = ReshaperExport();
                if (value && typeof value.convertArabic === 'function') reshaper = { reshape: value.convertArabic.bind(value) };
                else if (value && typeof value.reshape === 'function') reshaper = value;
                else reshaper = { reshape: (t) => t };
            }
        } else if (ReshaperExport && typeof ReshaperExport.convertArabic === 'function') {
            reshaper = { reshape: ReshaperExport.convertArabic.bind(ReshaperExport) };
        } else {
            reshaper = { reshape: (text) => text };
        }
    } catch (e) {
        reshaper = { reshape: (text) => text };
    }

    // Compose a pdfmake doc definition
    const content = [
        { text: 'DS-160 Smoke Test PDF', style: 'header' },
        { text: `Date: ${new Date().toLocaleString()}`, alignment: 'left', margin: [0, 0, 0, 10] }
    ];

    for (const [key, value] of Object.entries(formData)) {
        const displayKey = FIELD_MAP[key] || key;
        const displayValue = value === undefined || value === null ? '' : String(value);
        if (!displayValue.trim()) continue;
        const isArabic = containsArabic(displayValue);
        let textToPrint = displayValue;
        if (isArabic && reshaper) {
            try { textToPrint = reshaper.reshape(displayValue); } catch (e) { textToPrint = displayValue; }
        }
        // Add an array with two runs so we can style LTR vs RTL
        content.push({
            columns: [
                { width: '*', text: [ { text: displayKey + ': ', bold: true, font: 'Roboto', alignment: 'left' } ] },
                { width: 'auto', text: [ { text: textToPrint, font: isArabic ? 'AEAlArabiya' : 'Roboto' } ], alignment: isArabic ? 'right' : 'left' }
            ],
            columnGap: 10,
            margin: [0, 0, 0, 2]
        });
    }

    const docDefinition = {
        defaultStyle: { font: 'AEAlArabiya', fontSize: 12, alignment: 'right' },
        styles: { header: { fontSize: 16, bold: true, margin: [0, 0, 0, 10] } },
        content
    };

    return new Promise((resolve, reject) => {
        try {
            const pdfDoc = pdfMake.createPdf(docDefinition);
            // Ensure an available filename by removing prior file if present
            const outFile = path.join(__dirname, `test_output_${Date.now()}.pdf`);
            pdfDoc.getBuffer((buffer) => {
                try { fs.writeFileSync(outFile, buffer); } catch (e) { return reject(e); }
                resolve(outFile);
            });
        } catch (e) { reject(e); }
    });
}

// --- Sample Arabic Test Data ---
const sampleFormData = {
    FullName: 'محمد علي',
    FirstName_Arabic: 'محمد',
    LastName_Arabic: 'علي',
    Current_Workplace: 'بنى سويف للخدمات الهندسية',
    ContactInformation: 'القاهرة، مصر'
};

async function runSmokeTest() {
    console.log('Starting PDF Generation Smoke Test...');
    try {
        const outputPath = await generatePDF(sampleFormData);
        console.log('✅ Smoke Test Successful! PDF saved to:', outputPath);
    } catch (error) {
        console.error('❌ Smoke Test Failed! Error Details:', error);
    }
}

runSmokeTest();
