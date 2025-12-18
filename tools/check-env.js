// tools/check-env.js
// Simple environment variable audit for CI/local builds.
// Prints ✅ Found or ❌ Missing without printing any secret values.

const required = ['SENDINBLUE_API_KEY', 'SENDER_EMAIL'];
let missing = [];
required.forEach((key) => {
  if (process.env[key] && String(process.env[key]).length > 0) {
    console.log(`✅ Found ${key}`);
  } else {
    console.log(`❌ Missing ${key}`);
    missing.push(key);
  }
});

if (missing.length > 0) {
  console.warn('One or more required environment variables are missing:', missing.join(', '));
  console.warn('Continuing the build — live smoke tests may fail without these vars.');
} else {
  console.log('Environment audit: all required variables present.');
}
// Do not fail the build; just warn so CI can still run the live smoke tests and report their results.
process.exit(0);
