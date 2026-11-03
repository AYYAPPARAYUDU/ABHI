import urllib.request
import json
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

def send_cmd(cmd_text, lang="auto"):
    payload = {
        "command_id": f"test_cmd_{abs(hash(cmd_text)) % 10000}",
        "text": cmd_text,
        "input_mode": "TEXT",
        "language_hint": lang,
        "origin": "web"
    }
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        "http://127.0.0.1:8000/api/v1/agent-gateway/commands",
        data=data,
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req, timeout=10) as resp:
        return json.loads(resp.read().decode("utf-8"))

print("1. Testing 'read my mails'...")
res1 = send_cmd("read my mails")
print(f"Status: {res1.get('status')} | Message: {res1.get('message')}")
print(f"Task ID: {res1.get('task_id')} | Title: {res1.get('result', {}).get('title')}")

print("\n2. Testing 'open whatsapp'...")
res2 = send_cmd("open whatsapp")
print(f"Status: {res2.get('status')} | Message: {res2.get('message')}")
print(f"Task ID: {res2.get('task_id')} | Title: {res2.get('result', {}).get('title')}")

print("\n3. Testing Telugu 'నా మెయిల్స్ చదువు' (Read my mails in Telugu)...")
res3 = send_cmd("నా మెయిల్స్ చదువు", lang="te")
print(f"Status: {res3.get('status')} | Message: {res3.get('message')}")
print(f"Task ID: {res3.get('task_id')}")

print("\nAll live Gateway tests completed!")

