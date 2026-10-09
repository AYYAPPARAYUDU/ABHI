import urllib.request
import json

def check(url, method='GET', data=None):
    req = urllib.request.Request(url, method=method)
    if data:
        req.add_header('Content-Type', 'application/json')
        body = json.dumps(data).encode('utf-8')
    else:
        body = None
    with urllib.request.urlopen(req, data=body) as res:
        content = res.read().decode('utf-8')
        try:
            return json.loads(content)
        except Exception:
            return content

if __name__ == '__main__':
    print('=== 1. FRONTEND APP ===')
    html = check('http://127.0.0.1:4200/')
    print('Frontend HTML retrieved, length:', len(html))

    print('\n=== 2. NETWORK TOPOLOGY ===')
    net = check('http://127.0.0.1:8000/api/v1/agent/network')
    nodes = net.get('nodes', [])
    edges = net.get('edges', [])
    print(f'Registered Nodes: {len(nodes)}, Edges: {len(edges)}')
    for n in nodes:
        print(f"  - [{n['id']}] {n['name']} -> {n['status']} (Role: {n['role']})")

    print('\n=== 3. BUSINESS SECTORS & PROJECTS ===')
    sectors = check('http://127.0.0.1:8000/api/v1/business/sectors')
    print(f'Sectors ({len(sectors)}): {[s["name"] for s in sectors]}')
    projects = check('http://127.0.0.1:8000/api/v1/business/projects')
    print(f'Projects ({len(projects)}):')
    for p in projects:
        print(f"  - [{p['id']}] {p['name']} (Autonomy Level: {p['autonomy_level']}, Status: {p['status']})")

    print('\n=== 4. FINANCIAL INTEGRITY SUMMARY ===')
    fin = check('http://127.0.0.1:8000/api/v1/business/financial-summary')
    print('Financial Summary:', json.dumps(fin, indent=2))

    print('\n=== 5. TRAINING CAPABILITY HONEST STATUS ===')
    train = check('http://127.0.0.1:8000/api/v1/evaluation/training/capability')
    print('Training Status:', json.dumps(train, indent=2))

    print('\n=== 6. AUTHORITATIVE AGENT COMMAND ===')
    cmd = check('http://127.0.0.1:8000/api/v1/agent/command', method='POST', data={
        'text': 'Check system status and report ready agents',
        'thread_id': 'phase9-stage3-live-test'
    })
    print('Agent Command Response:', json.dumps(cmd, indent=2))

    print('\n=== 7. AUTONOMOUS BUSINESS STEP EXECUTION ===')
    if projects:
        step_res = check(f"http://127.0.0.1:8000/api/v1/business/projects/{projects[0]['id']}/execute-step", method='POST', data={
            'override_stop_conditions': False
        })
        print('Business Step Execution Result:', json.dumps(step_res, indent=2))
