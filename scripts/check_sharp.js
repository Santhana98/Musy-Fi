const fs = require('fs');
try {
  require.resolve('sharp');
  console.log('Sharp is installed!');
} catch (e) {
  console.log('Sharp is NOT installed!');
}
