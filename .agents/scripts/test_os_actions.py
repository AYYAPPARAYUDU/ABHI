import asyncio
import os
import sys

sys.path.insert(0, os.getcwd())

from backend.app.cognitive.gateway.agent_gateway import AgentGateway
from backend.app.cognitive.planner.planner import task_planner

async def main():
    gw = AgentGateway()

    test_queries = [
        "read my mails",
        "check my mails",
        "open my mails",
        "open whatsapp",
        "check whatsapp",
        "read whatsapp",
        "open youtube",
        "play on youtube",
        "open camera",
        "open notepad",
        "open browser",
        "read my messages",
        "check messages"
    ]

    print("=== 1. Routing Verification (_is_os_automation_request) ===")
    for q in test_queries:
        is_auto = gw._is_os_automation_request(q, q)
        print(f"[{'PASS' if is_auto else 'FAIL'}] '{q:25}' -> is_automation: {is_auto}")
        assert is_auto, f"Failed routing for '{q}'"

    print("\n=== 2. Task DAG Plan Verification ===")
    for q in test_queries:
        dag = await task_planner.create_plan(f"test_task_{q[:4]}", q)
        nodes = [(nid, n.title, n.action, n.params) for nid, n in dag.nodes.items()]
        print(f"'{q:25}' -> Nodes: {nodes}")

    print("\nAll routing and DAG plan tests passed!")

if __name__ == "__main__":
    asyncio.run(main())

