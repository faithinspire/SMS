const os = require('os');

const interfaces = os.networkInterfaces();
let found = false;

console.log('\n' + '='.repeat(60));
console.log('YOUR PHONE CONNECTION DETAILS');
console.log('='.repeat(60) + '\n');

for (const name in interfaces) {
  const addrs = interfaces[name];
  if (addrs) {
    for (const addr of addrs) {
      if (addr.family === 'IPv4' && !addr.internal) {
        console.log(`✅ YOUR IP ADDRESS: ${addr.address}`);
        console.log(`✅ SERVER PORT: 3000`);
        console.log(`\n📱 OPEN ON YOUR PHONE:\n`);
        console.log(`   http://${addr.address}:3000\n`);
        console.log('='.repeat(60));
        console.log('⚡ QUICK INSTRUCTIONS:');
        console.log('='.repeat(60));
        console.log('1. Make sure phone WiFi is ON (same network as PC)');
        console.log('2. Open Chrome or Safari on phone');
        console.log(`3. Type: http://${addr.address}:3000`);
        console.log('4. Press Enter');
        console.log('5. App loads! 🎉\n');
        console.log('='.repeat(60) + '\n');
        found = true;
        break;
      }
    }
    if (found) break;
  }
}

if (!found) {
  console.log('❌ Could not detect IP address\n');
}
