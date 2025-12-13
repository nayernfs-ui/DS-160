const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');
const Sib = require('sib-api-v3-sdk');
// Override TransactionalEmailsApi.prototype.sendTransacEmail and sendTransacEmailWithHttpInfo
Sib.TransactionalEmailsApi.prototype.sendTransacEmail = async function(payload) {
    console.log('Stubbed sendTransacEmail called. Inspecting payload...');
    const att = payload.attachment && payload.attachment[0];
    if (!att) return { ok: false };
    console.log('attachment metadata:', { filename: att.filename, name: att.name, contentType: att.contentType });
    // decode
    const buf = Buffer.from(att.content, 'base64');
    // validate ZIP signature
    const ok = buf[0] === 0x50 && buf[1] === 0x4B;
    console.log('Attachment is ZIP(DOCX) ok=', ok);
    // parse doc XML
    const zip = await JSZip.loadAsync(buf);
    const docXml = await zip.file('word/document.xml').async('string');
    console.log('docXml snippet:', docXml.substring(0, 200));
    // search for arabic letters
    const m = docXml.match(/[\u0600-\u06FF]/g);
    console.log('arabic chars found count:', m ? m.length : 0);
    return { ok: true };
};
Sib.TransactionalEmailsApi.prototype.sendTransacEmailWithHttpInfo = async function(payload) { 
    console.log('Stubbed sendTransacEmailWithHttpInfo called. Inspecting payload...');
    return this.sendTransacEmail(payload);
};

const handler = require('./api/submit.js');

const req = { method: 'POST', body: { FullName: 'محمد علي', FirstName_Arabic: 'محمد', LastName_Arabic: 'علي', ContactInformation: 'القاهرة' } };
const res = { status: (s) => ({ json: (b) => console.log('RESPONSE', s, b) }) };

(async () => {
    try {
        await handler(req, res);
        console.log('handler finished');
    } catch (e) {
        console.error('handler error', e);
    }
})();
