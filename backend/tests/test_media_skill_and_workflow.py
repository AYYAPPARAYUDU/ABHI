"""Unit tests for Phase 8 Stage 8.1 Media Skill Integration & Autonomous Workflows."""

import pytest
from backend.app.services.skills.registry import skill_registry
from backend.app.services.skills.runtime import skill_runtime
from backend.app.services.skills.models import SkillInvocation, SkillFailureCode
from backend.app.services.skills.builtin_media_skills import register_media_skills


@pytest.fixture(autouse=True)
def setup_media_skills():
    register_media_skills(skill_registry)


def test_media_skill_registration():
    """Verify media.image.generate@1.0.0 is registered in skill registry."""
    skill = skill_registry.get("media.image.generate", "1.0.0")
    assert skill is not None
    assert skill.name == "Generate Local Image"
    assert skill.category.value == "MEDIA"
    assert "LOCAL_STORAGE_WRITE" in skill.permissions


@pytest.mark.asyncio
async def test_media_skill_execution_success():
    """Test executing media.image.generate skill through SkillExecutionRuntime."""
    invocation = SkillInvocation(
        task_id="task_workflow_1",
        execution_id="exec_1",
        action_id="act_gen_img",
        skill_id="media.image.generate",
        skill_version="1.0.0",
        arguments={
            "prompt": "An astronaut riding a horse on Mars",
            "width": 256,
            "height": 256,
            "steps": 10,
            "seed": 42
        }
    )

    result = await skill_runtime.execute_skill(invocation)
    assert result.is_success is True
    assert result.verification_passed is True
    assert "artifact_id" in result.output_data
    assert "path" in result.output_data
    assert result.output_data["width"] == 256
    assert result.output_data["height"] == 256


@pytest.mark.asyncio
async def test_media_skill_invalid_arguments():
    """Test skill failure when missing required prompt argument."""
    invocation = SkillInvocation(
        task_id="task_workflow_2",
        execution_id="exec_2",
        action_id="act_bad_arg",
        skill_id="media.image.generate",
        skill_version="1.0.0",
        arguments={
            "width": 256,
            # Missing prompt
        }
    )

    result = await skill_runtime.execute_skill(invocation)
    assert result.is_success is False
    assert result.failure_code == SkillFailureCode.INVALID_ARGUMENTS
