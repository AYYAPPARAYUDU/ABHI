"""Integration test verifying end-to-end DAG planning and execution for Windows Calculator."""

import asyncio
import pytest
from backend.app.cognitive.planner.planner import task_planner
from backend.app.cognitive.supervisor.supervisor import central_supervisor
from backend.app.cognitive.registry.registry import agent_registry


@pytest.mark.asyncio
async def test_calculator_dag_planning_and_resolution():
    """Verify that 'Open Calculator and calculate 125 times 48' plans with os_desktop_agent."""
    goal = "Open Calculator and calculate 125 times 48"
    dag = await task_planner.create_plan(task_id="test_calc_01", goal=goal)

    assert "step_1" in dag.nodes
    assert dag.nodes["step_1"].agent_id == "os_desktop_agent"
    assert dag.nodes["step_1"].action == "launch_application"

    assert "step_2" in dag.nodes
    assert dag.nodes["step_2"].agent_id == "os_desktop_agent"
    assert dag.nodes["step_2"].action == "calculate"
    assert "125" in str(dag.nodes["step_2"].params.get("expression"))
    assert "48" in str(dag.nodes["step_2"].params.get("expression"))

    # Verify agent resolution in registry
    agent = agent_registry.get_agent("os_desktop_agent")
    assert agent is not None
    assert agent.agent_id == "os_desktop_agent"


@pytest.mark.asyncio
async def test_calculator_supervisor_execution_end_to_end():
    """Verify end-to-end execution of Calculator goal through authoritative CentralSupervisor."""
    goal = "Open Calculator and calculate 125 times 48"
    status_obj = await central_supervisor.submit_goal(goal=goal)

    assert status_obj is not None
    assert status_obj.goal == goal

    # Poll until orchestration completes (up to 30 seconds for local Ollama planning)
    for _ in range(120):
        curr_status = central_supervisor.get_task_status(status_obj.task_id)
        if curr_status and curr_status.state.value in ["COMPLETED", "FAILED"]:
            break
        await asyncio.sleep(0.25)

    final_status = central_supervisor.get_task_status(status_obj.task_id)
    assert final_status is not None
    assert final_status.state.value == "COMPLETED"
    assert final_status.dag is not None
    assert "step_1" in final_status.dag.nodes
    assert final_status.dag.nodes["step_1"].status.value == "COMPLETED"
    assert "step_2" in final_status.dag.nodes
    assert final_status.dag.nodes["step_2"].status.value == "COMPLETED"
