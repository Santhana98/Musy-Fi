async function getInvidious() {
  try {
    const res = await fetch('https://api.invidious.io/instances.json?sort_by=type,health');
    const data = await res.json();
    
    const active = [];
    for (const [domain, info] of data) {
      if (info.type === 'https' && info.monitor && info.monitor.last_status === 200) {
        active.push({
          uri: info.uri,
          uptime: info.monitor.uptime,
          region: info.region
        });
      }
    }
    
    console.log(JSON.stringify(active.slice(0, 15), null, 2));
  } catch (err) {
    console.error('Error:', err.message);
  }
}

getInvidious();
