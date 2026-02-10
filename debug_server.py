import urllib.request
import json
import traceback

def debug_server():
    import os
    port = os.environ.get("PORT", 8000)
    url = f"http://localhost:{port}/api/pay-notification"
    data = json.dumps({"studentCode": "DEBUG_USER", "message": "Debug Message"}).encode('utf-8')
    req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'}, method='POST')

    print(f"Attempting POST to {url}...")
    try:
        with urllib.request.urlopen(req) as response:
            print(f"SUCCESS. Status Code: {response.status}")
            print("Response Body:", response.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        print(f"FAILURE. HTTP Error Code: {e.code}")
        print("Error Reason:", e.reason)
        print("Error Body:", e.read().decode('utf-8'))
    except Exception as e:
        print("CONNECTION FAILURE:")
        traceback.print_exc()

if __name__ == "__main__":
    debug_server()
