import urllib.request
import json
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

payload = {
    "command_id": "test_telugu_cmd_1",
    "text": "మీరు ఎవరు మరియు మీ సామర్థ్యాలు ఏమిటి?",
    "input_mode": "TEXT",
    "language_hint": "te",
    "origin": "web"
}

data = json.dumps(payload).encode("utf-8")
req = urllib.request.Request(
    "http://127.0.0.1:8000/api/v1/agent-gateway/commands",
    data=data,
    headers={"Content-Type": "application/json"}
)

print("Dispatching Telugu command to Authoritative Gateway...")
with urllib.request.urlopen(req, timeout=60) as resp:
    res = json.loads(resp.read().decode("utf-8"))
    print("Gateway Response Status:", res.get("status"))
    print("Gateway Response Message:")
    print(res.get("message"))
