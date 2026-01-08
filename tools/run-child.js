const cp = require('child_process');
const proc = cp.spawn(process.execPath, ['tests/unit/family.test.js'], { stdio: 'pipe' });
proc.stdout.on('data', (d) => process.stdout.write('OUT: ' + d.toString()));
proc.stderr.on('data', (d) => process.stderr.write('ERR: ' + d.toString()));
proc.on('close', (code) => console.log('exit', code));
proc.on('error', (err) => console.error('spawn error', err));
