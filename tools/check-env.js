#!/usr/bin/env node
const required = ['SENDINBLUE_API_KEY', 'SENDER_EMAIL'];
let missing = [];
required.forEach((name) => {
  if (process.env[name]) {
    console.log(`✅ Found ${name}`);
  } else {
    console.error(`❌ Missing ${name}`);
    missing.push(name);
  }
});

if (missing.length) {
  console.error('One or more required environment variables are missing.');
  process.exit(1);
} else {
  process.exit(0);
}
