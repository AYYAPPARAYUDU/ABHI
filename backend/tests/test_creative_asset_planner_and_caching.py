"""Phase 8 Stage 8.5 — Unit Tests for AssetPlanner & CreativeCache."""

import pytest
from backend.app.media.creative_models import (
    CreativeAsset,
    CreativeAssetType,
    Scene,
    Storyboard,
    StoryboardScene,
)
from backend.app.media.asset_planner import AssetPlanner, CreativeCache


def test_creative_cache_lifecycle():
    cache = CreativeCache()
    assert cache.count() == 0

    key = cache.compute_cache_key(
        asset_type=CreativeAssetType.IMAGE,
        skill_id="media.image.generate",
        parameters={"prompt": "A futuristic car", "steps": 20},
        model_id="sd-turbo-local",
    )
    assert len(key) == 64

    asset = CreativeAsset(
        artifact_id="art_car_1",
        asset_type=CreativeAssetType.IMAGE,
        source="GENERATED",
        parameters_hash=key,
    )
    cache.put(key, asset)
    assert cache.count() == 1
    assert cache.get(key) is not None
    assert cache.get(key).artifact_id == "art_car_1"

    # Invalidation
    assert cache.invalidate(key) is True
    assert cache.get(key) is None
    assert cache.count() == 0


def test_asset_planner_plans_new_assets():
    planner = AssetPlanner()
    scenes = [Scene(scene_id="s1", order=1, duration=3.0), Scene(scene_id="s2", order=2, duration=3.0)]
    storyboard = Storyboard(
        title="SB",
        scenes=[
            StoryboardScene(scene_id="s1", sequence=1, duration=3.0, description="D1", visual_prompt="Cyberpunk Alley"),
            StoryboardScene(scene_id="s2", sequence=2, duration=3.0, description="D2", visual_prompt="Cyberpunk Tower"),
        ],
    )

    assets, reused_count = planner.plan_scene_assets(scenes, storyboard)
    assert len(assets) == 2
    assert reused_count == 0
    assert assets[0].source == "GENERATED"
    assert assets[0].is_reused is False
    assert len(scenes[0].visual_assets) == 1


def test_asset_planner_reuses_cached_assets():
    cache = CreativeCache()
    planner = AssetPlanner(cache=cache)

    prompt = "A majestic dragon, Fantasy"
    key = cache.compute_cache_key(
        asset_type=CreativeAssetType.IMAGE,
        skill_id="media.image.generate",
        parameters={"prompt": prompt},
    )
    cached_asset = CreativeAsset(
        artifact_id="art_dragon_01",
        asset_type=CreativeAssetType.IMAGE,
        source="GENERATED",
        parameters_hash=key,
    )
    cache.put(key, cached_asset)

    scenes = [Scene(scene_id="s1", order=1, duration=4.0)]
    storyboard = Storyboard(
        title="SB Dragon",
        scenes=[
            StoryboardScene(scene_id="s1", sequence=1, duration=4.0, description="Dragon", visual_prompt="A majestic dragon"),
        ],
    )

    assets, reused_count = planner.plan_scene_assets(scenes, storyboard, style_notes="Fantasy")
    assert len(assets) == 1
    assert reused_count == 1
    assert assets[0].is_reused is True
    assert assets[0].artifact_id == "art_dragon_01"


def test_asset_planner_registers_newly_generated_asset():
    cache = CreativeCache()
    planner = AssetPlanner(cache=cache)

    asset = planner.register_generated_asset(
        artifact_id="art_synth_100",
        asset_type=CreativeAssetType.VIDEO,
        skill_id="media.video.generate",
        parameters={"prompt": "Ocean waves", "fps": 24},
        model_id="svd-xt-local",
        file_path="/path/to/video.mp4",
        size_bytes=1048576,
    )
    assert asset.artifact_id == "art_synth_100"
    assert asset.asset_type == CreativeAssetType.VIDEO
    assert asset.is_reused is False
    assert cache.count() == 1


def test_creative_cache_clear_and_multi_key_invalidation():
    cache = CreativeCache()
    k1 = cache.compute_cache_key(CreativeAssetType.IMAGE, "media.image.generate", {"prompt": "p1"})
    k2 = cache.compute_cache_key(CreativeAssetType.VIDEO, "media.video.generate", {"prompt": "p2"})

    cache.put(k1, CreativeAsset(artifact_id="art1", asset_type=CreativeAssetType.IMAGE, source="GENERATED"))
    cache.put(k2, CreativeAsset(artifact_id="art2", asset_type=CreativeAssetType.VIDEO, source="GENERATED"))
    assert cache.count() == 2

    cache.clear()
    assert cache.count() == 0
    assert cache.get(k1) is None


def test_asset_planner_video_and_audio_asset_tracking():
    cache = CreativeCache()
    planner = AssetPlanner(cache=cache)

    aud_asset = planner.register_generated_asset(
        artifact_id="art_audio_99",
        asset_type=CreativeAssetType.AUDIO,
        skill_id="audio.tts",
        parameters={"text": "Speech narration"},
        model_id="piper-tts",
        size_bytes=44100,
    )
    assert aud_asset.asset_type == CreativeAssetType.AUDIO
    assert aud_asset.model_id == "piper-tts"
