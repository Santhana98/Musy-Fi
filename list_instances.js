async function getInstances() {
  try {
    const res = await fetch('https://instances.cobalt.best/api/v1/instances');
    if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
    const data = await res.json();
    
    // Sort by response time or score and filter active ones
    const active = data
      .filter(inst => inst.status === 'up' && inst.score >= 90)
      .map(inst => ({
        url: inst.url,
        score: inst.score,
        api: inst.apiAddress || inst.url
      }));
    
    console.log(JSON.stringify(active, null, 2));
  } catch (err) {
    console.error('Failed to get instances:', err.message);
  }
}
getInstances();
