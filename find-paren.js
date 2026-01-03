const fs = require('fs');
const code = fs.readFileSync('public/js/script.js', 'utf8');

let stack = [];
for (let i = 0; i < code.length; i++) {
  const c = code[i];
  if (c === '(') {
    stack.push({ char: '(', pos: i });
  } else if (c === ')') {
    if (stack.length === 0) {
      console.log('Extra ) at position', i);
      let start = Math.max(0, i - 50);
      let end = Math.min(code.length, i + 50);
      console.log(code.substring(start, end));
      process.exit(1);
    }
    stack.pop();
  }
}

if (stack.length > 0) {
  console.log('Found', stack.length, 'unmatched (');
  stack.forEach((item) => {
    let line = code.substring(0, item.pos).split('\n').length;
    let col = item.pos - code.lastIndexOf('\n', item.pos);
    console.log(`  Line ${line}, Col ${col}: ${code.substring(item.pos, item.pos + 50)}`);
  });
}
