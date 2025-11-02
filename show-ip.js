/**
 * Show-IP utility script
 * 
 * This script displays all available network interfaces and their IP addresses
 * to help you connect to your server from different devices.
 */

const os = require('os');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Get port from environment variables or use default
const PORT = process.env.PORT || 3000;

// Get all network interfaces
const networkInterfaces = os.networkInterfaces();

console.log('\n=========================================================');
console.log('   GWADAR ONLINE BAZAAR SERVER - CONNECTION DETAILS');
console.log('=========================================================\n');

console.log('Here are all available network interfaces and their IP addresses:');
console.log('Use these IP addresses to connect to your server from different devices.\n');

// Process and display each network interface
Object.keys(networkInterfaces).forEach((interfaceName) => {
  const interfaces = networkInterfaces[interfaceName];
  
  interfaces.forEach((iface) => {
    // Skip internal interfaces and non-IPv4 addresses
    if (iface.internal || iface.family !== 'IPv4') return;
    
    console.log(`Interface: ${interfaceName}`);
    console.log(`IP Address: ${iface.address}`);
    console.log(`Server URL: http://${iface.address}:${PORT}`);
    console.log(`API URL: http://${iface.address}:${PORT}/api`);
    console.log('--------------------------------------------------------');
  });
});

console.log('\nFor emulators and simulators:');
console.log('Android Emulator: http://10.0.2.2:3000');
console.log('iOS Simulator: http://localhost:3000');
console.log('--------------------------------------------------------\n');

console.log('To use these addresses in your Flutter app:');
console.log('1. Open lib/config/app_config.dart');
console.log('2. Update the appropriate URL configuration:');
console.log('   - Set _useEmulator = true for Android emulator');
console.log('   - Set _useLocalWifi = true and update _localWifiUrl for real devices');
console.log('3. Restart your app\n');

console.log('=========================================================\n'); 