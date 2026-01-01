const fs = require('fs');
const s = fs.readFileSync('d:/DS-160/index.html', 'utf8');
const re = /<\/?\s*(fieldset|div|form|body|html)[^>]*>/gi;
let stack = [];
let m;
while ((m = re.exec(s))) {
  const pos = m.index;
  const before = s.slice(0, pos);
  const line = before.split('\n').length;
  const tag = m[0];
  const name = (tag.match(/<(\/)?\s*(fieldset|div|form|body|html)/i) || [])[2].toLowerCase();
  const closing = /^<\//.test(tag);
  if (closing) {
    if (stack.length == 0) {
      console.log(`UNMATCHED CLOSE </${name}> at line ${line}`);
    } else {
      const last = stack[stack.length - 1];
      if (last.name == name) {
        stack.pop();
      } else {
        console.log(
          `MISMATCH close </${name}> at line ${line}; top is <${last.name}> opened at line ${last.line}`
        );
        // try to find
        let found = false;
        for (let i = stack.length - 1; i >= 0; i--) {
          if (stack[i].name == name) {
            stack.splice(i);
            found = true;
            break;
          }
        }
        if (!found) {
          // nothing
        }
      }
    }
  } else {
    stack.push({ name, line });
  }
}
if (stack.length) {
  console.log('UNclosed at EOF (top-to-bottom):');
  stack.forEach((x) => console.log(`  <${x.name}> opened at line ${x.line}`));
} else {
  console.log('All matched');
}
