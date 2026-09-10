const os = require('os');

// Get all network interfaces
const interfaces = os.networkInterfaces();

// Find the IPv4 address (excluding localhost)
let ipAddress = null;

for (const name of Object.keys(interfaces)) {
  for (const iface of interfaces[name]) {
    // Skip internal and non-IPv4 addresses
    if (iface.family === 'IPv4' && !iface.internal) {
      ipAddress = iface.address;
      break;
    }
  }
  if (ipAddress) break;
}

if (ipAddress) {
  console.log(`\n✅ YOUR SYSTEM IP ADDRESS:\n\n${ipAddress}\n`);
  console.log(`📱 Access your app on phone:\nhttp://${ipAddress}:3000\n`);
} else {
  console.log('❌ Could not detect IP address');
}
