import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const version = crypto.randomBytes(8).toString('hex');
const publicDir = path.join(process.cwd(), 'public');

if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

const versionData = {
  version,
  timestamp: Date.now(),
};

fs.writeFileSync(
  path.join(publicDir, 'version.json'),
  JSON.stringify(versionData, null, 2)
);

// Update sw.js to ensure byte-difference and cache invalidation
const swPath = path.join(publicDir, 'sw.js');
if (fs.existsSync(swPath)) {
  let swContent = fs.readFileSync(swPath, 'utf8');
  // Replace the CACHE_NAME with a versioned one
  swContent = swContent.replace(/const CACHE_NAME = 'musifi-cache-[^']+';/, `const CACHE_NAME = 'musifi-cache-${version}';`);
  fs.writeFileSync(swPath, swContent);
}

console.log(`[Version Generator] Generated new version ID: ${version}`);
