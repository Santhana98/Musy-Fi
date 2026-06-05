const fs = require('fs');
const path = require('path');

const files = ['But4iIum.js', 'BeCeuYsS.js'];

async function download() {
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Referer': 'https://under250art.ca/',
    'Accept': '*/*'
  };
  
  for (const file of files) {
    const url = `https://clickapi.net/_nuxt/${file}`;
    console.log(`Downloading ${url}...`);
    try {
      const res = await fetch(url, { headers });
      const text = await res.text();
      console.log(`Downloaded ${file}, length: ${text.length}`);
      fs.writeFileSync(path.join(__dirname, 'nuxt_chunks', file), text);
      
      // search for turnstile
      if (text.includes("turnstile")) {
        console.log(`Found turnstile in ${file}!`);
      }
      if (text.includes("convert")) {
        console.log(`Found convert in ${file}!`);
      }
    } catch (err) {
      console.error(`Failed to download ${file}:`, err);
    }
  }
}

download();
