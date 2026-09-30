"""Phase 8 Stage 8.5 — Unit Tests for Creative Pipeline Security & Adversarial Defense."""

import pytest
from backend.app.media.creative_models import CreativeBrief
from backend.app.media.creative_orchestrator import CreativePipelineOrchestrator
from backend.app.services.skills.builtin_creative_skills import _handle_creative_pipeline


@pytest.mark.asyncio
async def test_prompt_injection_is_treated_as_literal_text():
    # Attempting to inject shell commands via brief prompt
    malicious_prompt = "Futuristic city; rm -rf /; import os; os.system('calc')"
    brief = CreativeBrief(
        title="Injected Prompt Test",
        description=malicious_prompt,
        duration=4.0,
    )
    orch = CreativePipelineOrchestrator()
    pipeline = orch.create_pipeline(brief)
    executed = orch.execute_pipeline(pipeline.pipeline_id)

    # Must execute safely without running shell/code, treating string as literal prompt conditioning
    assert executed.status.value in ["COMPLETED", "PLANNED"]
    assert executed.creative_brief.description == malicious_prompt


def test_import_rejects_non_dict_payload():
    orch = CreativePipelineOrchestrator()
    with pytest.raises(ValueError, match="JSON object"):
        orch.import_project("string_payload")


def test_import_rejects_missing_creative_brief():
    orch = CreativePipelineOrchestrator()
    with pytest.raises(ValueError, match="creative_brief"):
        orch.import_project({"other_key": "val"})


def test_excessive_duration_clamped_by_pydantic():
    with pytest.raises(Exception):
        # max duration 120.0s
        CreativeBrief(title="Too Long", description="Long", duration=9999.0)


@pytest.mark.asyncio
async def test_creative_pipeline_skill_handles_invalid_arguments():
    # Missing required arguments
    res = await _handle_creative_pipeline({}, {"action_id": "act_test_bad"})
    # Defaults are applied gracefully
    assert res.is_success is True
    assert "pipeline_id" in res.output_data
