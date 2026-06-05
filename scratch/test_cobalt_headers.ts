async function testHeaders() {
  const videoUrl = 'https://www.youtube.com/watch?v=tKZmHEyYlbA';
  const instance = 'https://subito-c.meowing.de';
  const origin = 'https://cobalt.meowing.de';

  console.log(`Testing instance ${instance} with Origin: ${origin}`);

  try {
    const res = await fetch(instance, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Origin': origin,
        'Referer': origin + '/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      body: JSON.stringify({
        url: videoUrl,
        downloadMode: 'audio',
        audioFormat: 'best'
      })
    });

    console.log(`Status: ${res.status} ${res.statusText}`);
    const data = await res.json();
    console.log('Response:', JSON.stringify(data, null, 2));
  } catch (err: any) {
    console.error('Failed:', err.message);
  }
}

testHeaders();
