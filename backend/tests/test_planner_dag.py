"""Unit tests for Task DAG structure, dependency resolution, and planner."""

import pytest
from backend.app.cognitive.planner.models import DAGNode, NodeStatus, TaskDAG
from backend.app.cognitive.planner.planner import task_planner


def test_task_dag_dependency_resolution():
    n1 = DAGNode(
        node_id="step_1",
        title="First Step",
        agent_id="coding_agent",
        action="read_file",
        status=NodeStatus.PENDING
    )
    n2 = DAGNode(
        node_id="step_2",
        title="Second Step",
        agent_id="coding_agent",
        action="write_file",
        dependencies=["step_1"],
        status=NodeStatus.PENDING
    )

    dag = TaskDAG(
        dag_id="dag_test",
        task_id="task_test",
        goal="Two step pipeline",
        nodes={"step_1": n1, "step_2": n2}
    )

    # Initial state: only step_1 should be runnable
    runnable = dag.get_runnable_nodes()
    assert len(runnable) == 1
    assert runnable[0].node_id == "step_1"

    # Mark step_1 completed
    dag.update_node_status("step_1", NodeStatus.COMPLETED)
    runnable_next = dag.get_runnable_nodes()
    assert len(runnable_next) == 1
    assert runnable_next[0].node_id == "step_2"

    # Mark step_2 completed
    dag.update_node_status("step_2", NodeStatus.COMPLETED)
    assert dag.is_complete is True
    assert dag.is_failed is False


@pytest.mark.asyncio
async def test_heuristic_planner_generation():
    dag = await task_planner.create_plan(task_id="t_search", goal="search project architecture notes")
    assert dag is not None
    assert len(dag.nodes) >= 1
    first_node = list(dag.nodes.values())[0]
    assert first_node.status == NodeStatus.PENDING
