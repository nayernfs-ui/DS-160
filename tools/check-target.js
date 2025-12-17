#!/usr/bin/env node
const url = process.env.TARGET_URL || 'https://ds-160-jet.vercel.app/';

(async () => {
  try {
    console.log('Checking URL:', url);
    const res = await fetch(url, { method: 'HEAD' });
    console.log('Status:', res.status, res.statusText);
    const ct = res.headers.get('content-type');
    console.log('Content-Type:', ct);
    const server = res.headers.get('server') || res.headers.get('x-vercel-cache') || 'unknown';
    console.log('Server/x-vercel-cache:', server);
    // do a GET to collect body snippet when HEAD returns 200
    if (res.status === 200) {
      const bodyRes = await fetch(url, { method: 'GET' });
      const text = await bodyRes.text();
      console.log('Body length:', text.length);
      console.log('Body snippet:', text.slice(0, 300));
    }
  } catch (e) {
    console.error('Fetch failed:', e && e.message ? e.message : e);
    process.exit(1);
  }
})();
