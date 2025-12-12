const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const getStream = require('get-stream');

// Import Reshaper as module to handle property fallbacks in the smoke test
const ReshaperModule = require('arabic-reshaper');

// Local font path (project root Fonts folder)
const ARABIC_FONT_PATH = path.join(__dirname, 'Fonts', 'ae_AlArabiya.ttf');

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

// Copy of generatePDF simplified for smoke test
async function generatePDF(formData) {
    const doc = new PDFDocument({ margin: 50 });
    try {
        doc.font(ARABIC_FONT_PATH);
    } catch (err) {
        console.warn('Arabic font load failed, continuing with default font.', err);
    }

    doc.fontSize(16).text('DS-160 Smoke Test PDF', { underline: true }).moveDown(0.5);
    doc.fontSize(12).text(`Date: ${new Date().toLocaleString()}`).moveDown(1);

    // Initialize reshaper using deep property access and log results
    const ReshaperConstructor = ReshaperModule.ArabicReshaper || ReshaperModule.default || ReshaperModule;
    let reshaper;
    try {
        reshaper = new ReshaperConstructor();
        console.log('--- Reshaper Initialized Successfully ---');
    } catch (e) {
        console.error('--- Reshaper Initialization Failed Locally (Using Dummy) ---', e.message);
        reshaper = { reshape: (text) => text };
    }

    for (const [key, value] of Object.entries(formData)) {
        const displayKey = FIELD_MAP[key] || key;
        const displayValue = value === undefined || value === null ? '' : String(value);
        if (!displayValue.trim()) continue;

        const isArabic = containsArabic(displayValue);
        let textToPrint = displayValue;
        if (isArabic && reshaper) {
            try {
                textToPrint = reshaper.reshape(displayValue);
                textToPrint = textToPrint.split('').reverse().join('');
            } catch (err) {
                console.warn('Reshape failed:', err.message);
                textToPrint = displayValue;
            }
        }

        doc.fontSize(10).fillColor('black').text(`• ${displayKey}: `, { continued: true });
        if (isArabic) doc.font(ARABIC_FONT_PATH);
        else doc.font('Helvetica');
        doc.fillColor('gray').text(textToPrint, { align: isArabic ? 'right' : 'left' });
        doc.font('Helvetica');
        doc.text('').moveDown(0.2);
    }

    doc.end();
    return getStream.buffer(doc);
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
        const pdfBuffer = await generatePDF(sampleFormData);
        const outputFilePath = path.join(__dirname, 'test_output.pdf');
        fs.writeFileSync(outputFilePath, pdfBuffer);
        console.log('✅ Smoke Test Successful! PDF saved to:', outputFilePath);
    } catch (error) {
        console.error('❌ Smoke Test Failed! Error Details:', error);
    }
}

runSmokeTest();
