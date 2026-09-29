"""Phase 8 Stage 8.2 — Video Built-in Skill & Workflow Execution Unit Tests."""

import pytest
from backend.app.services.skills.registry import skill_registry
from backend.app.services.skills.models import SkillResult, SkillFailureCode
from backend.app.services.skills.builtin_video_skills import register_video_skills
from backend.app.cognitive.workflow.engine import LongHorizonWorkflowEngine
from backend.app.cognitive.planner.models import TaskDAG, DAGNode, NodeStatus


@pytest.mark.asyncio
async def test_video_skill_registration():
    register_video_skills(skill_registry)
    skill = skill_registry.get("media.video.generate")
    assert skill is not None
    assert skill.name == "Generate Local Video"
    assert skill.category.value == "MEDIA"
    assert "GPU_INFERENCE" in skill.permissions


@pytest.mark.asyncio
async def test_video_skill_execution_success():
    handler = skill_registry.get_handler("media.video.generate")
    assert handler is not None

    args = {
        "prompt": "An autonomous drone flying through a dense forest",
        "model_id": "svd-xt-local",
        "width": 256,
        "height": 256,
        "fps": 12,
        "duration_seconds": 1.0,
        "steps": 5,
        "output_format": "MP4"
    }
    ctx = {"action_id": "act_vid_001", "task_id": "task_vid_001", "interactive": True}

    result: SkillResult = await handler(args, ctx)
    assert result.is_success is True
    assert result.verification_passed is True
    assert "artifact_id" in result.output_data
    assert "path" in result.output_data
    assert result.output_data["fps"] == 12


@pytest.mark.asyncio
async def test_video_skill_invalid_arguments():
    handler = skill_registry.get_handler("media.video.generate")
    assert handler is not None

    # Missing prompt
    res1: SkillResult = await handler({}, {"action_id": "act_bad"})
    assert res1.is_success is False
    assert res1.failure_code == SkillFailureCode.INVALID_ARGUMENTS

    # Invalid dimension
    res2: SkillResult = await handler({"prompt": "test", "width": 500}, {"action_id": "act_bad_dim"})
    assert res2.is_success is False
    assert res2.failure_code == SkillFailureCode.INVALID_ARGUMENTS


from backend.app.services.skills.runtime import skill_runtime
from backend.app.services.skills.models import SkillInvocation


@pytest.mark.asyncio
async def test_video_workflow_runtime_integration():
    invocation = SkillInvocation(
        task_id="task_video_dag_1",
        execution_id="exec_vid_1",
        action_id="act_gen_video",
        skill_id="media.video.generate",
        skill_version="1.0.0",
        arguments={
            "prompt": "A stylish electric vehicle accelerating smoothly",
            "width": 256,
            "height": 256,
            "fps": 12,
            "duration_seconds": 1.0,
            "steps": 5
        }
    )

    result = await skill_runtime.execute_skill(invocation)
    assert result.is_success is True
    assert result.verification_passed is True
    assert "artifact_id" in result.output_data
    assert "path" in result.output_data
    assert result.output_data["fps"] == 12
    assert result.observed_state.get("artifact_created") is True
