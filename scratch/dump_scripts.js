const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, 'clickapi_referer_success.html'), 'utf-8');

// Find all script tags
const regex = /<script([\s\S]*?)>([\s\S]*?)<\/script>/gi;
let match;
let count = 0;

while ((match = regex.exec(html)) !== null) {
  count++;
  const attrs = match[1];
  const body = match[2];
  console.log(`Script ${count}: Attrs: ${attrs.trim().substring(0, 100)}... Body length: ${body.length}`);
  fs.writeFileSync(path.join(__dirname, `script_${count}.js`), `// Attrs: ${attrs}\n${body}`);
}
console.log(`Saved ${count} script files.`);
