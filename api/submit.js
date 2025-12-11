// --- NEW CODE USING BREVO (Sendinblue) SDK ---

const SibApiV3Sdk = require('sib-api-v3-sdk');

// Configuration
// We use SENDGRID_API_KEY name, but it holds the Brevo Key
const API_KEY = process.env.SENDGRID_API_KEY; 
const RECIPIENT_EMAIL = process.env.RECIPIENT_EMAIL || 'nayer.nfa@gmail.com';
const SENDER_EMAIL = process.env.SENDER_EMAIL || 'nayer.nfa@gmail.com'; 

// Initialize Brevo Client
let defaultClient = SibApiV3Sdk.ApiClient.instance;
let apiKey = defaultClient.authentications['api-key'];
apiKey.apiKey = API_KEY; 

let apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

function formatFormBody(body) {
    let html = '<h2>DS-160 Survey Submission</h2>';
    html += '<table border="1" style="border-collapse: collapse; width: 100%;"><tr><th>Field (Arabic)</th><th>Value</th></tr>';

    for (const [key, value] of Object.entries(body)) {
        if (key.startsWith('_')) continue; 
        
        const displayKey = key.replace(/([A-Z])/g, ' $1').trim();
        const displayValue = Array.isArray(value) ? value.join(', ') : value;

        html += `<tr><td style="padding: 8px;">${displayKey}</td><td style="padding: 8px;">${displayValue}</td></tr>`;
    }
    html += '</table>';
    return html;
}

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).send('Method Not Allowed');
    }

    try {
        const body = req.body;
        
        // Brevo email structure
        let sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
        sendSmtpEmail.subject = `New DS-160 Form Submission - ${body.FullName || 'Client'}`;
        sendSmtpEmail.htmlContent = formatFormBody(body);
        
        // Define Sender
        sendSmtpEmail.sender = { "name": "DS-160 Form", "email": SENDER_EMAIL };
        
        // Define Recipients
        sendSmtpEmail.to = [{ "email": RECIPIENT_EMAIL }];

        // Send the email
        await apiInstance.sendTransacEmail(sendSmtpEmail);

        console.log(`Email sent successfully to ${RECIPIENT_EMAIL} via Brevo.`);
        res.status(200).json({ success: true, message: 'Email sent successfully via Brevo Proxy.' });

    } catch (error) {
        console.error('Brevo API Error:', error.response ? error.response.text : error);
        res.status(500).json({ success: false, message: 'Failed to send email via Brevo. Check Vercel logs for details.' });
    }
};