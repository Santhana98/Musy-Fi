const videoUrls = [
  'https://www.youtube.com/watch?v=kJQP7kiw5Fk', // Despacito
  'https://www.youtube.com/watch?v=9bZkp7q19f0', // PSY - GANGNAM STYLE
  'https://www.youtube.com/watch?v=kJQP7kiw5Fk'
];

const INSTANCES = [
  'https://api.cobalt.blackcat.sweeux.org',
  'https://api.cobalt.liubquanti.click',
  'https://cobaltapi.cjs.nz',
  'https://fox.kittycat.boo'
];

async function testOtherVideos() {
  for (const url of videoUrls) {
    console.log(`\n===================================`);
    console.log(`TESTING VIDEO: ${url}`);
    console.log(`===================================`);
    for (const instance of INSTANCES) {
      console.log(`Trying instance: ${instance}`);
      try {
        const res = await fetch(instance, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            url: url,
            downloadMode: 'audio',
            audioFormat: 'best'
          }),
          signal: AbortSignal.timeout(5000)
        });

        console.log(`Status: ${res.status} ${res.statusText}`);
        const data = await res.json();
        console.log('Response:', JSON.stringify(data, null, 2));
      } catch (err: any) {
        console.warn(`Failed for ${instance}:`, err.message);
      }
      console.log('-----------------------------------');
    }
  }
}

testOtherVideos();
