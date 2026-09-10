# Phone Network Access Setup Guide

## Problem
Dev server running on `localhost:3001` is not accessible from phone on same network.

## Solution
Configure dev server to listen on all network interfaces (0.0.0.0) instead of just localhost.

## Step 1: Find Your Computer IP Address

### Windows (CMD):
```cmd
ipconfig
```

Look for "IPv4 Address" under your network adapter. Usually looks like:
- `192.168.x.x` (home WiFi)
- `10.x.x.x` (corporate network)

**Example output:**
```
Ethernet adapter Ethernet:
   IPv4 Address . . . . . . . : 192.168.1.100
```

Your computer IP is: `192.168.1.100`

### Mac/Linux:
```bash
ifconfig
```

Look for `inet` address (not 127.0.0.1)

## Step 2: Start Dev Server with Network Access

The dev server is already configured to listen on all IPs. Just run:

```bash
npm run dev
```

This will start on:
- Local: `http://localhost:3001`
- Network: `http://192.168.1.100:3001` (replace with YOUR IP)

## Step 3: Connect Phone to Same WiFi Network

1. Ensure phone is connected to SAME WiFi network as computer
2. Open phone browser
3. Enter: `http://192.168.1.100:3001` (replace IP with yours)

**Example**: If your IP is `192.168.1.50`:
- Type in phone browser: `http://192.168.1.50:3001`

## Step 4: First Visit - Grant Permissions

When you first visit from phone:
- Click "Allow" when asked to install PWA app
- Wait for app to install (shows loading)
- App icon will appear on home screen
- Tap to launch

## Troubleshooting

### "Cannot reach server"
1. Verify phone and computer on SAME WiFi
2. Check IP address is correct (use `ipconfig` again)
3. Ensure firewall allows port 3001:
   - Windows: Check Windows Defender Firewall
   - Add exception for Node.js/npm if blocked

### "Connection refused"
- Dev server not running. Run: `npm run dev`
- Wait 5-10 seconds for server to start
- Reload phone browser

### "localhost:3001 not reachable from phone"
- This is expected - localhost only works on same device
- Always use IP address (192.168.x.x) from phone

## Test Connection

From phone browser, visit:
1. `http://192.168.1.100:3001` - Main app
2. `http://192.168.1.100:3001/landing` - Should see landing page

If both work, network is properly configured.

## For Production

Update `NEXT_PUBLIC_API_URL` in `.env.local`:
```
NEXT_PUBLIC_API_URL=http://192.168.1.100:3001
```

Or use actual domain when deployed.

## Common IPs

| Network Type | IP Range | Example |
|---|---|---|
| Home WiFi | 192.168.1.x | 192.168.1.100 |
| Mobile Hotspot | 192.168.43.x | 192.168.43.1 |
| Corporate | 10.x.x.x | 10.0.0.50 |

---

**Now your SMS app is accessible from your phone over the network!**
