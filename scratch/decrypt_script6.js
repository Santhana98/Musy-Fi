const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, 'clickapi_referer_success.html'), 'utf-8');

// Extract Script 6 body
const regex = /<script data-cfasync="false"[^>]*>([\s\S]*?)<\/script>/;
const match = html.match(regex);
if (!match) {
  console.log("Script 6 not found via custom regex. Trying generic regex.");
  const allScripts = html.match(/<script[^>]*>([\s\S]*?)<\/script>/gi);
  console.log("Total script tags:", allScripts?.length);
  // The last one is probably Script 6 or we can inspect them
  process.exit(1);
}

const body = match[1];
console.log("Script 6 body length:", body.length);

// Let's extract the string 'f' definition
const fMatch = body.match(/var f='([^']+)';/);
if (fMatch) {
  const fStr = fMatch[1];
  const decodedF = fStr.split("").reduce((_, X, F) => F % 2 ? _ + X : X + _).split("z");
  console.log("Decoded f array length:", decodedF.length);
  console.log("Decoded f words:");
  console.log(decodedF.slice(0, 50));
} else {
  console.log("Could not find var f definition.");
}
