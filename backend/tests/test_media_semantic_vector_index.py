"""Unit & Integration tests for Media Semantic Vector Index (Stage 8.7)."""

import pytest
from backend.app.media.semantic_index import MediaSemanticVectorIndex
from backend.app.media.understanding_models import MediaSearchRequest, SearchMode, ProvenanceClass


@pytest.mark.asyncio
async def test_semantic_index_and_search(tmp_path):
    index = MediaSemanticVectorIndex(db_dir=str(tmp_path / "vector_test"))

    # Index two distinct media assets
    await index.index_artifact_semantic(
        artifact_id="art_cyber_01",
        media_type="IMAGE",
        searchable_text="Futuristic cyberpunk skyscraper in neon night city",
        technical_meta={"dimensions": [1920, 1080], "duration": 0.0},
        language="en",
        provenance_class="ACTUAL_MODEL_INFERENCE",
        tags=["cyberpunk", "city", "night"],
    )

    await index.index_artifact_semantic(
        artifact_id="art_nature_01",
        media_type="IMAGE",
        searchable_text="Serene mountain river flowing through lush green forest",
        technical_meta={"dimensions": [1024, 1024], "duration": 0.0},
        language="en",
        provenance_class="PROCEDURAL",
        tags=["nature", "forest", "mountain"],
    )

    # Search for cyberpunk
    req = MediaSearchRequest(query="cyberpunk city lights", limit=5)
    results = await index.hybrid_search(req)

    assert len(results) >= 1
    assert results[0]["artifact_id"] == "art_cyber_01"
    assert results[0]["score"] > 0.35


@pytest.mark.asyncio
async def test_semantic_index_filtered_search(tmp_path):
    index = MediaSemanticVectorIndex(db_dir=str(tmp_path / "vector_test_2"))

    await index.index_artifact_semantic(
        artifact_id="art_vid_hd",
        media_type="VIDEO",
        searchable_text="High resolution aerial shot of technological metropolis",
        technical_meta={"dimensions": [1920, 1080], "duration": 12.0},
        language="en",
        provenance_class="ACTUAL_MODEL_INFERENCE",
    )

    await index.index_artifact_semantic(
        artifact_id="art_aud_te",
        media_type="AUDIO",
        searchable_text="Telugu voiceover explanation of system architecture",
        technical_meta={"duration": 8.5},
        language="te",
        provenance_class="PROCEDURAL",
    )

    # Filter by media_type = VIDEO
    req_vid = MediaSearchRequest(media_types=["VIDEO"])
    res_vid = await index.hybrid_search(req_vid)
    assert len(res_vid) == 1
    assert res_vid[0]["artifact_id"] == "art_vid_hd"

    # Filter by language = te
    req_te = MediaSearchRequest(languages=["te"])
    res_te = await index.hybrid_search(req_te)
    assert len(res_te) == 1
    assert res_te[0]["artifact_id"] == "art_aud_te"


@pytest.mark.asyncio
async def test_scene_search_and_artifact_deletion(tmp_path):
    index = MediaSemanticVectorIndex(db_dir=str(tmp_path / "vector_test_3"))

    await index.index_artifact_semantic(
        artifact_id="art_clip_1",
        media_type="VIDEO",
        searchable_text="Full robot race video",
        technical_meta={"duration": 10.0},
    )

    await index.index_scene(
        scene_id="scn_01",
        video_artifact_id="art_clip_1",
        start_time=0.0,
        end_time=4.0,
        searchable_text="Robots running on starting grid",
    )

    scenes = await index.search_scenes("starting grid robots", video_artifact_id="art_clip_1")
    assert len(scenes) >= 1
    assert scenes[0]["scene_id"] == "scn_01"

    # Delete artifact
    await index.delete_artifact("art_clip_1")
    empty_scenes = await index.search_scenes("starting grid", video_artifact_id="art_clip_1")
    assert len(empty_scenes) == 0
