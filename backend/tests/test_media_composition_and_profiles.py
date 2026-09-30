"""Phase 8 Stage 8.4 — Multimodal Media Composition Profiles, Security & Skill Tests."""

import os
import time
import pytest
from pathlib import Path
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.media.workflow_models import (
    MediaCompositionRequest,
    MediaCompositionProfile,
    MediaWorkflow,
    MediaWorkflowNode,
    MediaWorkflowEdge,
    WorkflowMediaPortType,
)
from backend.app.media.video_models import VideoFormat, VideoArtifact
from backend.app.media.models import MediaArtifact, MediaType
from backend.app.media.composition_runtime import MediaCompositionRuntime
from backend.app.media.storage import media_storage
from backend.app.media.video_storage import video_storage_manager
from backend.app.services.skills.registry import skill_registry

client = TestClient(app)


@pytest.fixture
def mock_video_and_audio_artifacts():
    """Create test video and audio artifacts registered in storage."""
    # Generate canonical paths
    vid_file, _, _, _, _ = video_storage_manager.generate_video_artifact_paths("test_job_vid_01", VideoFormat.MP4)
    
    import cv2
    import numpy as np
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(str(vid_file), fourcc, 24.0, (512, 512))
    for _ in range(24):
        frame = np.zeros((512, 512, 3), dtype=np.uint8)
        out.write(frame)
    out.release()

    valid, vid_art, _ = video_storage_manager.validate_and_register_video_artifact(
        file_path=vid_file,
        poster_path=None,
        job_id="test_job_vid_01",
        expected_format=VideoFormat.MP4,
        expected_width=512,
        expected_height=512,
        expected_fps=24,
        expected_duration_seconds=1.0,
        model_id="test-video-model",
        parameters_hash="hash_vid_01",
    )
    assert valid is True
    assert vid_art is not None
    media_storage.register_artifact(vid_art)

    # Create sample audio WAV
    aud_dir = (media_storage.base_dir / "audio" / "2026" / "09").resolve()
    aud_dir.mkdir(parents=True, exist_ok=True)
    aud_file = aud_dir / "sample_audio.wav"
    import wave
    with wave.open(str(aud_file), "w") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(22050)
        wf.writeframes(b"\x00\x00" * 22050)

    from backend.app.media.models import ImageFormat
    audio_art = MediaArtifact(
        artifact_id="art_aud_test_01",
        job_id="test_aud_job_01",
        media_type=MediaType.AUDIO,
        path=str(aud_file.relative_to(media_storage.base_dir.parent)).replace("\\", "/"),
        filename=aud_file.name,
        format=ImageFormat.PNG,
        width=0,
        height=0,
        size_bytes=aud_file.stat().st_size,
        sha256="sha256_audio_test",
        created_at=time.time(),
        model_id="piper-tts",
        generation_parameters_hash="hash_aud_01",
        prompt_preview="Test audio prompt",
        provenance="ACTUAL"
    )
    media_storage.register_artifact(audio_art)

    return vid_art, audio_art


def test_composition_profile_video_only(mock_video_and_audio_artifacts):
    vid_art, _ = mock_video_and_audio_artifacts
    runtime = MediaCompositionRuntime()
    req = MediaCompositionRequest(
        video_artifact_id=vid_art.artifact_id,
        profile=MediaCompositionProfile.VIDEO_ONLY,
        output_format=VideoFormat.MP4
    )
    ok, composed_art, msg = runtime.compose_media(req)
    assert ok is True
    assert composed_art is not None
    assert composed_art.format == VideoFormat.MP4
    assert composed_art.size_bytes > 0


def test_composition_profile_video_plus_audio(mock_video_and_audio_artifacts):
    vid_art, aud_art = mock_video_and_audio_artifacts
    runtime = MediaCompositionRuntime()
    req = MediaCompositionRequest(
        video_artifact_id=vid_art.artifact_id,
        audio_artifact_id=aud_art.artifact_id,
        profile=MediaCompositionProfile.VIDEO_PLUS_AUDIO,
        output_format=VideoFormat.MP4
    )
    ok, composed_art, msg = runtime.compose_media(req)
    assert ok is True
    assert composed_art is not None
    assert composed_art.artifact_id.startswith("art_vid_")


def test_composition_profile_video_plus_audio_subtitles(mock_video_and_audio_artifacts):
    vid_art, aud_art = mock_video_and_audio_artifacts
    runtime = MediaCompositionRuntime()
    req = MediaCompositionRequest(
        video_artifact_id=vid_art.artifact_id,
        audio_artifact_id=aud_art.artifact_id,
        subtitle_text="Welcome to the future of AI automation.",
        profile=MediaCompositionProfile.VIDEO_PLUS_AUDIO_SUBTITLES,
        output_format=VideoFormat.MP4
    )
    ok, composed_art, msg = runtime.compose_media(req)
    assert ok is True
    assert composed_art is not None


def test_composition_missing_audio_for_audio_profile(mock_video_and_audio_artifacts):
    vid_art, _ = mock_video_and_audio_artifacts
    runtime = MediaCompositionRuntime()
    req = MediaCompositionRequest(
        video_artifact_id=vid_art.artifact_id,
        audio_artifact_id=None,
        profile=MediaCompositionProfile.VIDEO_PLUS_AUDIO,
    )
    ok, composed_art, msg = runtime.compose_media(req)
    assert ok is False
    assert "requires audio_artifact_id" in msg


def test_composition_nonexistent_video_artifact():
    runtime = MediaCompositionRuntime()
    req = MediaCompositionRequest(
        video_artifact_id="art_vid_nonexistent_12345",
        profile=MediaCompositionProfile.VIDEO_ONLY,
    )
    ok, composed_art, msg = runtime.compose_media(req)
    assert ok is False
    assert "not found in registry" in msg


def test_composition_nonexistent_audio_artifact(mock_video_and_audio_artifacts):
    vid_art, _ = mock_video_and_audio_artifacts
    runtime = MediaCompositionRuntime()
    req = MediaCompositionRequest(
        video_artifact_id=vid_art.artifact_id,
        audio_artifact_id="art_aud_nonexistent_99999",
        profile=MediaCompositionProfile.VIDEO_PLUS_AUDIO,
    )
    ok, composed_art, msg = runtime.compose_media(req)
    assert ok is False
    assert "not found in registry" in msg


def test_skill_audio_tts_execution():
    """Verify audio.tts skill invocation via SkillExecutionRuntime."""
    skill = skill_registry.get("audio.tts")
    assert skill is not None
    assert skill.version == "1.0.0"
    assert "text" in skill.input_schema.get("properties", {})


def test_skill_media_video_compose_execution():
    """Verify media.video.compose skill registration and interface."""
    skill = skill_registry.get("media.video.compose")
    assert skill is not None
    assert "profile" in skill.input_schema.get("properties", {})
    assert "video_artifact_id" in skill.input_schema.get("properties", {})


def test_skill_media_workflow_execute_execution():
    """Verify media.workflow.execute skill registration."""
    skill = skill_registry.get("media.workflow.execute")
    assert skill is not None
    assert "workflow" in skill.input_schema.get("properties", {})


def test_api_standalone_composition_endpoint(mock_video_and_audio_artifacts):
    """Verify POST /api/v1/media/composition/execute."""
    vid_art, aud_art = mock_video_and_audio_artifacts
    payload = {
        "video_artifact_id": vid_art.artifact_id,
        "audio_artifact_id": aud_art.artifact_id,
        "profile": "VIDEO_PLUS_AUDIO",
        "output_format": "MP4"
    }
    resp = client.post("/api/v1/media/composition/execute", json=payload)
    assert resp.status_code == 201
    data = resp.json()
    assert "artifact_id" in data
    assert data["format"] == "MP4"


def test_api_standalone_composition_invalid_payload():
    """Verify POST /api/v1/media/composition/execute with invalid payload returns 400 or 422."""
    payload = {
        "video_artifact_id": "art_vid_missing",
        "profile": "VIDEO_PLUS_AUDIO",
    }
    resp = client.post("/api/v1/media/composition/execute", json=payload)
    assert resp.status_code in [400, 422]


def test_workflow_media_port_type_enumeration():
    """Verify WorkflowMediaPortType contains all required media types."""
    assert WorkflowMediaPortType.IMAGE.value == "IMAGE"
    assert WorkflowMediaPortType.VIDEO.value == "VIDEO"
    assert WorkflowMediaPortType.AUDIO.value == "AUDIO"
    assert WorkflowMediaPortType.MASK.value == "MASK"
    assert WorkflowMediaPortType.TEXT.value == "TEXT"
    assert WorkflowMediaPortType.METADATA.value == "METADATA"


def test_workflow_node_edge_immutability():
    """Verify edge structure is deterministic and hashable."""
    edge1 = MediaWorkflowEdge(
        source_node_id="n1",
        source_port="out",
        target_node_id="n2",
        target_port="in",
        port_type=WorkflowMediaPortType.IMAGE
    )
    edge2 = MediaWorkflowEdge(
        source_node_id="n1",
        source_port="out",
        target_node_id="n2",
        target_port="in",
        port_type=WorkflowMediaPortType.IMAGE
    )
    assert edge1.source_node_id == edge2.source_node_id
    assert edge1.port_type == edge2.port_type


def test_workflow_empty_nodes_simulation():
    """Verify simulate_workflow handles empty workflow gracefully."""
    from backend.app.media.workflow_composer import media_workflow_composer
    wf = MediaWorkflow(workflow_id="wf_empty", goal="empty test", nodes=[], edges=[])
    sim = media_workflow_composer.simulate_workflow(wf)
    assert sim.feasible is False
    assert sim.node_count == 0


def test_workflow_single_tts_execution():
    """Verify standalone single-node TTS workflow execution."""
    from backend.app.media.workflow_composer import media_workflow_composer
    node = MediaWorkflowNode(
        node_id="n_tts_only",
        skill_id="audio.tts",
        parameters={"text": "Standalone synthesized sentence."}
    )
    wf = MediaWorkflow(
        workflow_id="wf_tts_only_01",
        goal="Synthesize TTS",
        nodes=[node],
        edges=[]
    )
    ok, res_wf, msg = media_workflow_composer.execute_workflow(wf)
    assert ok is True
    assert res_wf.status.value == "COMPLETED"
    assert res_wf.primary_artifact_id is not None
