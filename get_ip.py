import socket
import sys

def get_local_ip():
    try:
        # Create a socket and connect to a remote server (doesn't actually send data)
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except:
        try:
            # Fallback: get hostname and resolve
            hostname = socket.gethostname()
            ip = socket.gethostbyname(hostname)
            return ip
        except:
            return None

ip = get_local_ip()

if ip:
    print("\n" + "="*50)
    print("✅ YOUR SYSTEM IP ADDRESS:")
    print("="*50)
    print(f"\n    {ip}\n")
    print("📱 ACCESS ON YOUR PHONE:")
    print(f"\n    http://{ip}:3000\n")
    print("="*50)
    print("Server Port: 3000")
    print("Make sure your phone is on same WiFi!")
    print("="*50 + "\n")
else:
    print("❌ Could not detect IP address")
    sys.exit(1)
