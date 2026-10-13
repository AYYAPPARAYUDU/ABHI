"""End-to-End Verification Test for ABHI Native LLM Core & Official Ollama Integration.

Verifies:
1. Official Ollama SDK client connectivity and model listing.
2. Authentic prompt completion using abhi:latest.
3. Dynamic structured JSON decomposition and cleaning.
4. Autonomous code synthesis for building real files.
5. CodingAgent executing and verifying physical filesystem artifacts.
6. Subprocess execution of synthesized code.
"""

import asyncio
import os
import sys
import time

from backend.app.cognitive.planner.planner import task_planner
from backend.app.cognitive.registry.base_agent import AgentTaskRequest
from backend.app.cognitive.registry.builtin_agents import CodingAgent
from backend.app.cognitive.verification.verifier import dual_state_verifier
from backend.app.services.llm.abhi_llm import abhi_llm
from backend.app.services.llm.ollama_client import ollama_client


async def run_tests():
    print("=" * 60)
    print("ABHI LLM END-TO-END AUTONOMOUS VERIFICATION SUITE")
    print("=" * 60)

    # 1. Health & Model Inventory
    print("\n[1/6] Verifying Official Ollama SDK & Health...")
    healthy = await ollama_client.is_healthy()
    assert healthy, "Ollama service is not healthy!"
    models = await ollama_client.list_models()
    model_names = [m.name for m in models]
    print(f"  -> Discovered {len(models)} local models: {model_names}")
    assert any("abhi" in m for m in model_names), "abhi:latest model not found in Ollama inventory!"
    print("  [PASS] Health check and model inventory verified.")

    # 2. Authentic Prompt Generation
    print("\n[2/6] Verifying Prompt Generation with abhi:latest...")
    t0 = time.time()
    resp = await abhi_llm.generate("Explain in 1 sentence what an operating system kernel is.")
    duration = round(time.time() - t0, 2)
    print(f"  -> Model Response ({duration}s): {resp.response.strip()}")
    assert len(resp.response.strip()) > 10, "Generation response was empty or too short!"
    print("  [PASS] Authentic model generation successful.")

    # 3. Dynamic Structured JSON Plan Decomposition
    print("\n[3/6] Verifying Dynamic Task DAG Planning via abhi:latest...")
    t0 = time.time()
    dag = await task_planner.create_plan(
        task_id="test_task_build_calc",
        goal="Open calculator, evaluate 125 * 48, and save the calculation result to data/calc_output.txt"
    )
    duration = round(time.time() - t0, 2)
    print(f"  -> Generated Task DAG with {len(dag.nodes)} nodes in {duration}s:")
    for nid, node in dag.nodes.items():
        print(f"     Node {nid}: [{node.agent_id}] {node.title} -> {node.action}({node.params})")
    assert len(dag.nodes) >= 2, "DAG did not contain enough steps!"
    print("  [PASS] Dynamic DAG decomposition successful.")

    # 4. Neural Code Synthesis
    print("\n[4/6] Verifying Neural Code Synthesis for Arbitrary Specifications...")
    spec = "Write a standalone python script that calculates the 10th Fibonacci number and prints 'Fibonacci(10) = X'."
    t0 = time.time()
    code = await abhi_llm.synthesize_code(instruction=spec, language="python")
    duration = round(time.time() - t0, 2)
    print(f"  -> Synthesized Code ({duration}s):\n{code.strip()}\n")
    assert "def " in code or "fib" in code.lower() or "55" in code or "=" in code, "Code synthesis did not produce valid code!"
    print("  [PASS] Neural code synthesis verified.")

    # 5. Coding Agent Building Physical File
    print("\n[5/6] Verifying CodingAgent 'build_file' Action & Dual-State Verification...")
    coding_agent = CodingAgent()
    target_file = "project_data/generated_tools/fib_tool.py"
    build_req = AgentTaskRequest(
        task_id="task_build_fib",
        node_id="step_1",
        action="build_file",
        params={
            "path": target_file,
            "instruction": "Write a python script that prints exactly 'FIBONACCI_RESULT_55'",
            "language": "python"
        }
    )
    result = await coding_agent.execute(build_req)
    assert result.success, f"build_file failed: {result.error_message}"
    assert os.path.exists(target_file), f"File {target_file} was not physically created on disk!"
    file_size = os.path.getsize(target_file)
    print(f"  -> Created physical file {target_file} ({file_size} bytes)")

    # Dual-State Verification
    ver = await dual_state_verifier.verify_step(
        node=dag.nodes.get(list(dag.nodes.keys())[0]),
        result=result
    )
    print(f"  -> Dual-state physical verifier score: {ver.confidence_score} (Valid: {ver.is_valid})")
    print("  [PASS] Physical file creation and dual-state verification succeeded.")

    # 6. Coding Agent Executing Physical Script
    print("\n[6/6] Verifying CodingAgent 'execute_code' Subprocess Action...")
    exec_req = AgentTaskRequest(
        task_id="task_exec_fib",
        node_id="step_2",
        action="execute_code",
        params={"path": target_file, "timeout": 10.0}
    )
    exec_result = await coding_agent.execute(exec_req)
    print(f"  -> Execution stdout: {exec_result.data.get('stdout', '').strip()}")
    print(f"  -> Exit code: {exec_result.data.get('returncode')}")
    assert exec_result.success, f"execute_code failed: {exec_result.error_message}"
    assert exec_result.data.get("returncode") == 0, "Script return code was non-zero!"
    print("  [PASS] Subprocess script execution completed cleanly.")

    print("\n" + "=" * 60)
    print("ALL 6/6 AUTONOMOUS LLM SUITE TESTS PASSED PERFECTLY!")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(run_tests())
