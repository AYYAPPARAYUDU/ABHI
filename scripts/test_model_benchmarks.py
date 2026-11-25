import urllib.request
import json
import time

def benchmark():
    models = ['abhi:latest', 'qwen3:8b']
    for m in models:
        try:
            start = time.perf_counter()
            req = urllib.request.Request(
                "http://127.0.0.1:11434/api/generate",
                data=json.dumps({"model": m, "prompt": "Hello Mamu in 4 words", "stream": False}).encode(),
                headers={"Content-Type": "application/json"}
            )
            with urllib.request.urlopen(req, timeout=30) as resp:
                data = json.loads(resp.read().decode())
                dur = time.perf_counter() - start
                eval_count = data.get("eval_count", 0)
                eval_duration = data.get("eval_duration", 1) / 1e9
                tps = eval_count / eval_duration if eval_duration > 0 else 0
                resp_text = data.get("response", "").strip().replace("\n", " ")
                print(f"MODEL={m} LATENCY={dur:.2f}s TOKENS={eval_count} SPEED={tps:.1f}tok/s TEXT={resp_text}")
        except Exception as e:
            print(f"MODEL={m} ERROR={e}")

if __name__ == "__main__":
    benchmark()
