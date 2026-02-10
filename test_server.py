import urllib.request
import json
import traceback

def test_endpoint():
    import os
    port = os.environ.get("PORT", 8000)
    url = f"http://localhost:{port}/api/pay-notification"
    data = json.dumps({"studentCode": "TEST_CODE", "message": "Test Message"}).encode('utf-8')
    req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'}, method='POST')

    try:
        with urllib.request.urlopen(req) as response:
            print(f"Status Code: {response.status}")
            print(response.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        print(f"HTTP Error: {e.code}")
        print(e.read().decode('utf-8'))
    except Exception as e:
        print("Error connecting to server:")
        traceback.print_exc()

if __name__ == "__main__":
    test_endpoint()
