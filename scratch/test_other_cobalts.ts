const videoUrl = 'https://www.youtube.com/watch?v=tKZmHEyYlbA';

const INSTANCES = [
  'https://api.qwkuns.me',
  'https://api.cobalt.blackcat.sweeux.org',
  'https://api.cobalt.liubquanti.click',
  'https://cobaltapi.cjs.nz',
  'https://cobaltapi.squair.xyz'
];

async function testInstances() {
  for (const instance of INSTANCES) {
    console.log(`Testing instance: ${instance}`);
    try {
      const res = await fetch(instance, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          url: videoUrl,
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

testInstances();
