# 📱 How to Get Your IP Address & Connect Phone

The IP address is needed to access the app from your phone on the same network.

---

## Step 1: Get Your Computer's IP Address

### On Windows (Easiest)

**Method 1: Command Prompt (CMD)**
```
1. Press: Windows Key + R
2. Type: cmd
3. Press: Enter
4. Type: ipconfig
5. Press: Enter
6. Look for: "IPv4 Address"
   Example: 192.168.1.100
```

**Method 2: Settings**
```
1. Go to: Settings
2. Click: Network & Internet
3. Click: Wi-Fi (or Ethernet)
4. Click: Properties
5. Scroll down to: "IPv4 address"
   Example: 192.168.1.100
```

### What You're Looking For

```
IPv4 Address . . . . . . . . . . . . : 192.168.1.100
                                        ↑
                                   THIS IS YOUR IP
```

**Note:** The IP usually starts with:
- `192.168.x.x` (most common)
- `10.x.x.x` (some networks)
- `172.16-31.x.x` (some networks)

---

## Step 2: Make Sure Phone & Computer Are on Same Network

✅ **Both on WiFi:**
- Computer connected to WiFi router
- Phone connected to SAME WiFi router
- ✓ Same network name (SSID)
- ✓ Same WiFi password

❌ **Won't work if:**
- Computer on WiFi, phone on mobile data
- Different WiFi networks
- One is on 2.4GHz, other on 5GHz (usually OK, but try same band)

---

## Step 3: Open App on Phone

### On Phone Browser

```
1. Open browser (Chrome, Safari, Firefox)
2. In address bar, type:
   http://192.168.1.100:3001
   (replace 100 with YOUR last IP number)
3. Press Enter / Go
4. ✅ App should load!
```

### Example IP Addresses

| Your Computer IP | Phone URL |
|------------------|-----------|
| 192.168.1.100 | http://192.168.1.100:3001 |
| 192.168.1.50 | http://192.168.1.50:3001 |
| 192.168.0.25 | http://192.168.0.25:3001 |
| 10.0.0.5 | http://10.0.0.5:3001 |

---

## Step 4: Troubleshooting Phone Connection

### Phone Shows "Can't Reach Server"

**Check:**
- [ ] Are you on same WiFi network as computer?
- [ ] Is the IP address correct? (Use ipconfig to verify)
- [ ] Is the port correct? (Should be :3001)
- [ ] Is the server running? (Check computer - should see terminal with "Ready in X seconds")
- [ ] Is there a firewall blocking? (Try disabling Windows Firewall temporarily)

**To verify server is running on computer:**
```
Open terminal/CMD:
You should see:
✓ Ready in 50s
- Local: http://localhost:3001
- Network: http://0.0.0.0:3001
```

### Phone Still Can't Connect

**Try these fixes:**

1. **Restart Dev Server**
   ```
   On your computer:
   Press Ctrl+C in terminal (stops server)
   Type: npm run dev
   Wait for "Ready" message
   ```

2. **Disable Firewall Temporarily**
   ```
   Windows: Settings → Firewall & Network Protection
           → Turn off defender firewall temporarily
   Then try phone connection again
   ```

3. **Try localhost on Computer First**
   ```
   On computer browser:
   http://localhost:3001
   Should work fine
   If this works, the issue is network/firewall
   ```

4. **Check if Network is Blocked**
   ```
   On computer, open CMD:
   ping [YOUR_IP]
   Example: ping 192.168.1.100
   Should see "Reply from..." messages
   ```

---

## Example: Complete Connection Guide

### You Run These Commands

**On Windows (Press Windows Key + R):**
```
cmd
↓
ipconfig
↓
(You see: IPv4 Address . . . : 192.168.1.100)
```

### You Go to Phone Browser

**Phone URL:**
```
http://192.168.1.100:3001
↓
Wait 3-5 seconds
↓
App loads! 🎉
```

---

## What If I See Different Types of IPs?

| IP Type | Meaning | Use for Phone? |
|---------|---------|---|
| 127.0.0.1 | Localhost (computer only) | ❌ NO |
| 192.168.x.x | Local network (common) | ✅ YES |
| 10.x.x.x | Local network (work networks) | ✅ YES |
| 172.16-31.x.x | Local network (some routers) | ✅ YES |
| 8.8.8.8 | Public internet | ❌ NO |

---

## Still Not Working? Follow This Checklist

- [ ] Found computer IP using ipconfig
- [ ] IP starts with 192.168, 10, or 172
- [ ] Phone on same WiFi as computer
- [ ] Typed IP correctly in phone browser
- [ ] Included :3001 at end of URL
- [ ] Pressed Enter on phone
- [ ] Waited 5 seconds for page to load
- [ ] Server is running (terminal shows "Ready")
- [ ] No firewall blocking

**If STILL not working:**
1. Try disabling Windows Firewall
2. Restart both computer and phone
3. Restart the development server
4. Try on different phone or device

---

## Quick Reference Card

```
1. Get IP:     Windows Key + R → cmd → ipconfig
2. Find:       "IPv4 Address"
3. Note it:    192.168.1.100 (example)
4. Open phone: http://192.168.1.100:3001
5. Wait:       3-5 seconds
6. Done!       App loads on phone ✅
```

---

## Need Help?

**Common Issues:**

| Problem | Solution |
|---------|----------|
| Can't find ipconfig | Search "Command Prompt" in Windows Start menu |
| Forgot the URL format | http://[YOUR_IP]:3001 |
| Says "Connection refused" | Firewall is blocking - disable it |
| Phone on mobile data | Won't work - use WiFi instead |
| Wrong WiFi network | Phone and computer must be on same WiFi |
| Too many numbers | Just use first part: 192.168.1.x |

---

## Server Status On Your Computer

When you run `npm run dev`, you should see:

```
✓ Ready in 50s
  - Local:        http://localhost:3001       (on this computer only)
  - Network:      http://0.0.0.0:3001         (all computers on network)
```

The "Network" line means it's ready for your phone to connect!

---

**Once you have your IP, go to your phone and try:**

```
http://192.168.X.X:3001
(Replace X with your IP numbers)
```

**It will work! 📱✅**
