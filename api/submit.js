// --- NEW CODE INCLUDING PDF GENERATION AND ATTACHMENT ---

const SibApiV3Sdk = require('sib-api-v3-sdk');
const PDFDocument = require('pdfkit');
const getStream = require('get-stream'); // Helper to convert the PDF stream
// 💡 NEW: Import the path module
const path = require('path');
const rtl = require('rtl-css'); // 💡 NEW: RTL library for Arabic text processing

// Define the path to your Arabic font file
// __dirname is the current directory (api folder), so go up one level and into Fonts
const ARABIC_FONT_PATH = path.join(__dirname, '../Fonts/ae_AlArabiya.ttf'); 

// Configuration (using existing environment variables)
const API_KEY = process.env.SENDGRID_API_KEY; 
const RECIPIENT_EMAIL = process.env.RECIPIENT_EMAIL || 'nayer.nfa@gmail.com';
const SENDER_EMAIL = process.env.SENDER_EMAIL || 'nayer.nfa@gmail.com'; 

// Initialize Brevo Client
let defaultClient = SibApiV3Sdk.ApiClient.instance;
let apiKey = defaultClient.authentications['api-key'];
apiKey.apiKey = API_KEY; 
let apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

/**
 * Map a field key to one of the major sections.
 */
function fieldSection(key) {
    const k = key.toLowerCase();
    if (/name|dob|birth|nationality|marital|passport|placeofbirth|place/i.test(k) || k === 'fullname') return 'Personal Information (المعلومات الشخصية)';
    if (/email|phone|address|city|state|zip|postal|contact|telephone/i.test(k)) return 'Contact Information (معلومات التواصل)';
    if (/companion|travelcompanion|accompany/i.test(k)) return 'Travel Companions (مرافقو السفر)';
    if (/visa|us|previousus|traveltoamerica|previousvisa|usvisit/i.test(k)) return 'US History (سجل السفر إلى أمريكا)';
    if (/spouse|father|mother|family|relative|children|زوج|زوجة|ابن|ابنة/i.test(k)) return 'Family Data (البيانات العائلية)';
    if (/current|employer|company|jobtitle|position|workplace/i.test(k)) return 'Current Employment (الوظيفة الحالية)';
    if (/prev|previous|previousemployment|prevjob|الوظيفة السابقة/i.test(k)) return 'Previous Employment (الوظائف السابقة)';
    if (/education|degree|school|university|qualification|college|collegelevel/i.test(k)) return 'Education History (المؤهلات العلمية)';
    if (/travel|trip|visited|countries|travelhistory/i.test(k)) return 'Travel History (تاريخ السفر)';
    return 'Other';
}

// --- Field Mapping for Cleaner PDF Labels ---
const FIELD_MAP = {
    FullName: 'Full Name (Arabic)',
    FirstName_Arabic: 'First Name (Arabic)',
    LastName_Arabic: 'Last Name (Arabic)',
    DOB_Day: 'Date of Birth (Day)',
    DOB_Month: 'Date of Birth (Month)',
    DOB_Year: 'Date of Birth (Year)',
    Nationality: 'Current Nationality',
    PassportType: 'Passport Type',
    PassportNumber: 'Passport Number',
    IssueDate_Day: 'Passport Issue Date (Day)',
    IssueDate_Month: 'Passport Issue Date (Month)',
    IssueDate_Year: 'Passport Issue Date (Year)',
    
    // Example for Conditional Fields
    Other_Nationality: 'Other Nationality (If Applicable)',
    Other_PassportNumber: 'Second Passport Number',
    Spouse_DOB_Day: 'Spouse Date of Birth (Day)',
    Spouse_DOB_Month: 'Spouse Date of Birth (Month)',
    Spouse_DOB_Year: 'Spouse Date of Birth (Year)',

    // Add more mappings here for cleaner output...
};
// --- End Field Mapping ---

/**
 * Generates a PDF buffer from form data and groups fields under section headings.
 * @param {object} formData 
 * @returns {Promise<Buffer>} The PDF content as a buffer.
 */
function generatePDF(formData) {
    return new Promise(async (resolve, reject) => {
        const doc = new PDFDocument({ margin: 50 });

        // 💡 NEW: Use the Arabic font for all subsequent text where applicable
        try {
            doc.font(ARABIC_FONT_PATH);
        } catch (err) {
            console.warn('Setting default Arabic font failed, continuing with default font.', err);
        }

        // Register Arabic font (falls back to default if it fails)
        try {
            doc.registerFont('Arabic', ARABIC_FONT_PATH);
        } catch (err) {
            console.warn('Arabic font registration failed, continuing with default font.', err);
        }

        // Header
        doc.fontSize(16).text('DS-160 Survey Submission Report', { underline: true }).moveDown(0.5);
        doc.fontSize(12).text(`Date: ${new Date().toLocaleString()}`).moveDown(1);

        // Helper to detect Arabic chars
        const containsArabic = (s) => /[\u0600-\u06FF]/.test(String(s || ''));

        // Group fields by section
        const sections = {};
        for (const [key, value] of Object.entries(formData)) {
            if (!key || key.startsWith('_')) continue;
            const section = fieldSection(key);
            if (!sections[section]) sections[section] = {};
            sections[section][key] = value;
        }

        // Ensure the desired section order
        const order = [
            'Personal Information (المعلومات الشخصية)',
            'Contact Information (معلومات التواصل)',
            'Travel Companions (مرافقو السفر)',
            'US History (سجل السفر إلى أمريكا)',
            'Family Data (البيانات العائلية)',
            'Current Employment (الوظيفة الحالية)',
            'Previous Employment (الوظائف السابقة)',
            'Education History (المؤهلات العلمية)',
            'Travel History (تاريخ السفر)',
            'Other'
        ];

        for (const sec of order) {
            const fields = sections[sec];
            if (!fields) continue;

            // Section header (use Arabic font for Arabic characters)
            doc.moveDown(0.5);
            if (containsArabic(sec)) {
                doc.font('Arabic').fontSize(14).fillColor('#dc3545').text(sec).moveDown(0.25);
                doc.font('Helvetica');
            } else {
                doc.fontSize(14).fillColor('#dc3545').text(sec).moveDown(0.25);
            }

            // List fields in this section
            for (const [key, value] of Object.entries(fields)) {
                const displayKey = FIELD_MAP[key] || key.replace(/([A-Z])/g, ' $1').trim();
                const displayValue = Array.isArray(value) ? value.join(', ') : (value === undefined || value === null ? '' : String(value));
                if (displayValue && displayValue.trim() !== '') {
                    // Use Arabic font if the key or value contains Arabic script
                    const useArabic = containsArabic(displayKey) || containsArabic(displayValue);
                    if (useArabic) doc.font('Arabic');
                    else doc.font('Helvetica');

                    // 💡 NEW: Apply RTL correction for Arabic strings before printing
                    const correctedValue = (useArabic && rtl && typeof rtl.process === 'function')
                        ? rtl.process(displayValue)
                        : displayValue;

                    doc.fontSize(10).fillColor('black').text(`• ${displayKey}: `, { continued: true })
                        .fillColor('gray').text(correctedValue);

                    // Revert to default font for subsequent content when needed
                    if (useArabic) doc.font('Helvetica');
                }
            }
        }

        doc.end();

        try {
            const buffer = await getStream.buffer(doc);
            resolve(buffer);
        } catch (error) {
            reject(error);
        }
    });
}

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).send('Method Not Allowed');
    }

    try {
        const body = req.body;
        
        // 1. Generate the PDF
        const pdfBuffer = await generatePDF(body);
        
        // 2. Convert Buffer to Base64 String for Brevo Attachment
        const base64Pdf = pdfBuffer.toString('base64');
        
        // 3. Construct Brevo Email
        let sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
        sendSmtpEmail.subject = `PDF ATTACHED: DS-160 Submission - ${body.FullName || 'Client'}`;
        
        // Brevo requires a text body even with attachments
        sendSmtpEmail.htmlContent = 'The detailed DS-160 survey submission is attached as a PDF file.';
        
        sendSmtpEmail.sender = { "name": "DS-160 Form", "email": SENDER_EMAIL };
        sendSmtpEmail.to = [{ "email": RECIPIENT_EMAIL }];
        
        // 4. Add the PDF Attachment
        sendSmtpEmail.attachment = [{ 
            'content': base64Pdf,
            'name': `DS-160_Submission_${Date.now()}.pdf` 
        }];

        // 5. Send the Email
        await apiInstance.sendTransacEmail(sendSmtpEmail);

        console.log(`PDF Attached & Email sent successfully via Brevo.`);
        res.status(200).json({ success: true, message: 'Form submitted and PDF email sent successfully.' });

    } catch (error) {
        console.error('Brevo/PDF Error:', error);
        res.status(500).json({ success: false, message: 'Failed to process PDF or send email. Check Vercel logs.' });
    }
};