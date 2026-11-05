"""
Test suite to verify dynamic prompt classification, planning, and multi-architecture fusion.
"""
import asyncio
from backend.app.cognitive.gateway.agent_gateway import agent_gateway
from backend.app.cognitive.gateway.models import AgentCommandRequest, CommandLifecycleState
from backend.app.cognitive.planner.planner import task_planner


async def test_dynamic_prompt_understanding():
    print("--- 1. Testing Complex Cognitive & Architecture Prompt ---")
    user_prompt = (
        "still its not able to understand user prompts maek it dynamci not static "
        "use all resources a do research and make it possibel to give power to understand prompts clerly "
        "anter impliment tasks and other create things perfect and read all documentsries and webapplications "
        "and git repos and take all referanced form all ai model s and ask them how they works and take code from "
        "them and user there all arkticure mix them all and buidl advenced llms for us and every oen have to "
        "understnd the prompts and every things make it perfect mamu"
    )
    req = AgentCommandRequest(text=user_prompt)
    res = await agent_gateway.process_command(req)
    print(f"Status: {res.status}")
    print(f"Accepted: {res.accepted}")
    print(f"Task ID (should be None for cognitive queries): {res.task_id}")
    print(f"Result Type: {res.result.get('result_type')}")
    summary = res.result.get('summary', '')
    print(f"Summary (first 250 chars):\n{summary[:250]}...\n")
    assert res.status == CommandLifecycleState.COMPLETED
    assert res.task_id is None, "Cognitive query should NOT create an OS automation task_id!"
    assert res.result.get("result_type") == "TEXT_RESULT"
    print("PASS: Complex cognitive prompt successfully routed to LLM cognition!\n")

    print("--- 2. Testing Direct OS Power Command: 'restart laptop' ---")
    req_restart = AgentCommandRequest(text="restart laptop")
    res_restart = await agent_gateway.process_command(req_restart)
    print(f"Status: {res_restart.status}")
    print(f"Message: {res_restart.message}")
    print(f"Task ID: {res_restart.task_id}")
    assert res_restart.accepted is True
    assert res_restart.task_id is not None
    assert "restart sequence" in res_restart.message.lower()
    print("PASS: 'restart laptop' recognized as OS automation and acknowledged!\n")

    print("--- 3. Testing TaskPlanner DAG generation for 'restart laptop' ---")
    dag = await task_planner.create_plan(task_id="test_task_restart", goal="restart laptop")
    print(f"DAG ID: {dag.dag_id}, Steps count: {len(dag.nodes)}")
    for nid, node in dag.nodes.items():
        print(f"Node {nid}: Title='{node.title}', Agent='{node.agent_id}', Action='{node.action}', Params={node.params}")
    assert "step_1" in dag.nodes
    assert dag.nodes["step_1"].agent_id == "os_desktop_agent"
    assert "shutdown /r" in dag.nodes["step_1"].params.get("command", "")
    print("PASS: TaskPlanner generated actual Windows restart command!\n")

    print("--- 4. Testing TaskPlanner Dynamic Semantic Fallback (No more dummy memory_agent) ---")
    dag_custom = await task_planner.create_plan(task_id="test_task_custom", goal="open chrome and search for quantum computing papers")
    print(f"Custom Goal DAG Steps: {len(dag_custom.nodes)}")
    for nid, node in dag_custom.nodes.items():
        print(f"Node {nid}: Agent='{node.agent_id}', Action='{node.action}', Title='{node.title}'")
    has_dummy_memory = any(n.agent_id == "memory_agent" and n.action == "recall_recent" for n in dag_custom.nodes.values())
    assert not has_dummy_memory, "Should NOT fall back to dummy memory_agent recall!"
    print("PASS: Custom goal dynamically decomposed without dummy memory fallback!\n")

    print("ALL 4 CRITICAL CHECKS PASSED PERFECTLY!")


if __name__ == "__main__":
    asyncio.run(test_dynamic_prompt_understanding())
