"""Phase 8 Stage 8.3 — Image Edit Skills & DAG Workflow Integration Tests."""

import pytest
import numpy as np
import cv2
from backend.app.services.skills.registry import skill_registry
from backend.app.media.models import ImageFormat
from backend.app.media.coordinator import media_coordinator
from backend.app.media.edit_coordinator import image_edit_coordinator
from backend.app.media.edit_models import MaskSemantics, OutpaintBounds


@pytest.fixture(autouse=True)
def setup_source_and_mask(tmp_path):
    # Create source image
    src = np.full((512, 512, 3), 120, dtype=np.uint8)
    src_path = tmp_path / "skill_test_src.png"
    cv2.imwrite(str(src_path), src)

    ok, art, msg = media_coordinator.storage.validate_and_register_artifact(
        file_path=src_path,
        job_id="job_skill_src_seed",
        expected_format=ImageFormat.PNG,
        expected_width=512,
        expected_height=512,
        model_id="sd-turbo-local",
        parameters_hash="src_param_hash_001",
        prompt_preview="Skill test source"
    )
    if art:
        media_coordinator.register_artifact(art)

    # Create mask
    mask = np.zeros((512, 512), dtype=np.uint8)
    cv2.circle(mask, (256, 256), 60, 255, -1)
    _, encoded = cv2.imencode(".png", mask)

    ok_m, mask_art, msg_m = image_edit_coordinator.storage.validate_and_register_mask(
        mask_bytes=encoded.tobytes(),
        source_artifact_id=art.artifact_id,
        expected_width=512,
        expected_height=512,
        semantics=MaskSemantics.WHITE_EDIT_BLACK_PRESERVE
    )
    if mask_art:
        image_edit_coordinator.register_mask(mask_art)

    return art, mask_art


def test_image_edit_skills_registration():
    """Verify all Stage 8.3 skills are registered in the SkillRegistry."""
    skills = skill_registry.list_skills()
    skill_ids = [s.skill_id for s in skills]

    assert "media.image.edit" in skill_ids
    assert "media.image.inpaint" in skill_ids
    assert "media.image.outpaint" in skill_ids


@pytest.mark.asyncio
async def test_execute_media_image_edit_skill(setup_source_and_mask):
    """Test execution of media.image.edit skill."""
    art, _ = setup_source_and_mask
    handler = skill_registry.get_handler("media.image.edit")
    assert handler is not None

    result = await handler(
        {
            "source_artifact_id": art.artifact_id,
            "prompt": "Cyberpunk digital oil painting",
            "model_id": "instruct-pix2pix-local",
            "strength": 0.75,
            "steps": 10
        },
        {"action_id": "act_test_edit", "interactive": True}
    )

    assert result.is_success is True
    assert result.output_data["artifact_id"] is not None
    assert result.output_data["operation"] == "IMAGE_TO_IMAGE"
    assert result.duration_ms > 0


@pytest.mark.asyncio
async def test_execute_media_image_inpaint_skill(setup_source_and_mask):
    """Test execution of media.image.inpaint skill."""
    art, mask_art = setup_source_and_mask
    handler = skill_registry.get_handler("media.image.inpaint")
    assert handler is not None

    result = await handler(
        {
            "source_artifact_id": art.artifact_id,
            "mask_artifact_id": mask_art.mask_id,
            "prompt": "An illuminated crystalline flower",
            "model_id": "sdxl-inpainting-local",
            "steps": 10
        },
        {"action_id": "act_test_inpaint", "interactive": True}
    )

    assert result.is_success is True
    assert result.output_data["artifact_id"] is not None
    assert result.output_data["operation"] == "INPAINTING"


@pytest.mark.asyncio
async def test_execute_media_image_outpaint_skill(setup_source_and_mask):
    """Test execution of media.image.outpaint skill."""
    art, _ = setup_source_and_mask
    handler = skill_registry.get_handler("media.image.outpaint")
    assert handler is not None

    result = await handler(
        {
            "source_artifact_id": art.artifact_id,
            "prompt": "Expansive starry sky backdrop",
            "model_id": "sdxl-inpainting-local",
            "outpaint_bounds": {"top": 64, "bottom": 64, "left": 64, "right": 64},
            "steps": 10
        },
        {"action_id": "act_test_outpaint", "interactive": True}
    )

    assert result.is_success is True
    assert result.output_data["artifact_id"] is not None
    assert result.output_data["operation"] == "OUTPAINTING"


@pytest.mark.asyncio
async def test_image_edit_skill_invalid_arguments():
    """Test that missing required arguments fail gracefully."""
    handler = skill_registry.get_handler("media.image.edit")
    assert handler is not None

    result = await handler(
        {},
        {"action_id": "act_test_invalid"}
    )
    assert result.is_success is False
    assert result.failure_code.value == "INVALID_ARGUMENTS"

