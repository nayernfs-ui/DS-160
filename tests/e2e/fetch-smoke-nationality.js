const https = require('https');
const url = process.argv[2] || 'https://ds-160-fresh.vercel.app/';

console.log('Fetching', url);
https
  .get(url, (res) => {
    let data = '';
    res.on('data', (chunk) => (data += chunk));
    res.on('end', () => {
      const hasLabel = /label\s+for=['"]nationality['"]/i.test(data);
      const hasSelect = /select\s+id=['"]nationality['"]/i.test(data);
      console.log('label[for="nationality"] present in HTML?', hasLabel);
      console.log('select#nationality present in HTML?', hasSelect);
      process.exit(hasLabel || hasSelect ? 1 : 0);
    });
  })
  .on('error', (err) => {
    console.error('Fetch error:', err.message);
    process.exit(2);
  });
