import pytest
from backend.app.cognitive.gateway.agent_gateway import agent_gateway
from backend.app.cognitive.gateway.models import AgentCommandRequest, CommandLifecycleState
from backend.app.cognitive.planner.planner import task_planner
from backend.app.cognitive.multi_agent.daily_evolution import daily_evolution_service


@pytest.mark.asyncio
async def test_dynamic_system_restart_response_and_plan():
    # 1. Test Gateway dynamic response synthesis for restart
    req = AgentCommandRequest(text="restart laptop")
    res = await agent_gateway.process_command(req)
    assert res.accepted is True
    assert "restart" in res.message.lower() or "రీస్టార్ట్" in res.message
    assert res.task_id is not None

    # 2. Test Planner generates system_restart action with Tier 2 risk
    plan = await task_planner.create_plan(
        task_id="test_restart_task_001",
        goal="restart laptop"
    )
    assert len(plan.nodes) > 0
    first_node = list(plan.nodes.values())[0]
    assert first_node.action == "system_power_shield_check"
    assert first_node.risk_tier == "Tier 0"
    assert first_node.agent_id == "os_desktop_agent"


@pytest.mark.asyncio
async def test_dynamic_system_shutdown_response_and_plan():
    # 1. Test Gateway dynamic response synthesis for shutdown
    req = AgentCommandRequest(text="shutdown computer")
    res = await agent_gateway.process_command(req)
    assert res.accepted is True
    assert "shutdown" in res.message.lower() or "షట్‌డౌన్" in res.message
    assert res.task_id is not None

    # 2. Test Planner generates system_shutdown action with Tier 2 risk
    plan = await task_planner.create_plan(
        task_id="test_shutdown_task_001",
        goal="shutdown computer"
    )
    assert len(plan.nodes) > 0
    first_node = list(plan.nodes.values())[0]
    assert first_node.action == "system_power_shield_check"
    assert first_node.risk_tier == "Tier 0"
    assert first_node.agent_id == "os_desktop_agent"


@pytest.mark.asyncio
async def test_dynamic_unrecognized_command_synthesis_and_squad_coordination():
    # Test an OS automation command dispatched to squads
    req = AgentCommandRequest(text="open notepad and draft quantum computing summary")
    res = await agent_gateway.process_command(req)
    assert res.accepted is True
    assert res.task_id is not None

    # Verify that squad-command and squad-backend received live broadcast messages
    squad_cmd = daily_evolution_service.get_channel_messages("squad-command")
    assert any("open notepad and draft quantum computing summary" in m["message"] for m in squad_cmd)
