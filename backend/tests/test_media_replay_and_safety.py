"""
Test Suite: Media Replay Inspector & Safety Controls (Phase 8 Stage 8.6).
"""

import pytest
from backend.app.media.replay_engine import MediaReplayEngine
from backend.app.media.provenance_models import ReplayMode


def test_replay_inspect_valid_project():
    engine = MediaReplayEngine()
    project = {
        "pipeline_id": "cpipe_replay_001",
        "scenes": [
            {"scene_id": "scn_1", "visual_prompt": "Futuristic skyline", "duration": 4.0, "image_artifact_id": "art_1"},
            {"scene_id": "scn_2", "visual_prompt": "Flying shuttle", "duration": 6.0},
        ],
        "assets": [
            {"asset_id": "art_1", "model_id": "sd-turbo-local", "model_digest": "sha256:4b9a8c17e0a2d5f8"},
        ],
    }

    result = engine.inspect_replay(project)
    assert result.mode == ReplayMode.INSPECT
    assert result.is_safe_to_execute is True
    assert result.reusable_artifact_count == 1
    assert result.regenerate_node_count == 1
    assert result.estimated_duration_s == 10.0


def test_replay_inspect_unauthenticated_model():
    engine = MediaReplayEngine()
    project = {
        "pipeline_id": "cpipe_bad_model",
        "scenes": [{"scene_id": "scn_1", "visual_prompt": "Scene"}],
        "assets": [
            {"asset_id": "art_bad", "model_id": "unregistered-model-xyz", "model_digest": "sha256:000"},
        ],
    }

    result = engine.inspect_replay(project)
    assert result.models_authenticated is False
    assert len(result.discrepancies) > 0


def test_replay_simulation_phase():
    engine = MediaReplayEngine()
    project = {
        "pipeline_id": "cpipe_sim",
        "scenes": [{"scene_id": "scn_1", "visual_prompt": "Scene", "duration": 5.0}],
        "assets": [],
    }

    sim = engine.simulate_replay(project)
    assert sim.mode == ReplayMode.SIMULATE
    assert sim.resource_feasible is True
    assert sim.estimated_peak_vram_mb <= 6400.0
