const url = 'https://drive.google.com/uc?id=13nvQF0tIAynGXzqq4N4ZTOtTeRf3xF3I&export=download';

async function checkHeaders() {
  console.log('Sending request with Origin header to simulate browser CORS check...');
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Origin': 'https://musy-fi-kpzg.vercel.app',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    console.log(`Response Status: ${res.status} ${res.statusText}`);
    console.log('--- Response Headers ---');
    for (const [key, value] of res.headers.entries()) {
      console.log(`${key}: ${value}`);
    }
  } catch (err) {
    console.error('Fetch error:', err);
  }
}

checkHeaders();
