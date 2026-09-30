"""Unit & Integration tests for Media Library REST API & Built-in Skills (Stage 8.7)."""

import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.services.skills.registry import skill_registry
from backend.app.services.skills.models import SkillInvocation
from backend.app.services.skills.runtime import skill_runtime
from backend.app.media.indexing_queue import media_indexing_manager
from backend.app.media.understanding_models import MediaUnderstandingRecord


@pytest.fixture
def client():
    return TestClient(app)


@pytest.mark.asyncio
async def test_skills_registration():
    skills = skill_registry.list_skills()
    skill_ids = [s.skill_id for s in skills]
    assert "media.library.search" in skill_ids
    assert "media.library.inspect" in skill_ids
    assert "media.library.similar" in skill_ids
    assert "media.library.reuse_candidate" in skill_ids
    assert "media.library.analyze" in skill_ids
    assert "media.library.index" in skill_ids


@pytest.mark.asyncio
async def test_media_library_search_skill():
    # Pre-populate understanding store
    media_indexing_manager._understanding_records["art_skill_test"] = MediaUnderstandingRecord(
        understanding_id="und_sk_1",
        artifact_id="art_skill_test",
        media_type="IMAGE",
        technical_metadata={"dimensions": [512, 512], "is_valid": True},
        semantic_metadata={"caption": "A robotic workstation in cyber studio", "visual_tags": ["robot", "studio"]},
    )

    inv = SkillInvocation(
        task_id="task_test_search",
        execution_id="exec_test_search",
        action_id="act_test_search",
        skill_id="media.library.search",
        skill_version="1.0.0",
        arguments={"query": "robotic workstation", "limit": 5},
    )
    result = await skill_runtime.execute_skill(inv)
    assert result.is_success is True
    assert "results" in result.output_data



def test_media_library_api_collections(client):
    # 1. Create collection
    res = client.post(
        "/api/v1/media/library/collections",
        json={"title": "SciFi Art", "description": "Concept art", "collection_type": "PROJECT"},
    )
    assert res.status_code == 201
    data = res.json()
    col_id = data["collection_id"]
    assert data["title"] == "SciFi Art"

    # 2. Add artifacts
    res_add = client.post(
        f"/api/v1/media/library/collections/{col_id}/artifacts",
        json={"artifact_ids": ["art_100", "art_101"]},
    )
    assert res_add.status_code == 200
    assert len(res_add.json()["artifact_ids"]) == 2

    # 3. List collections
    res_list = client.get("/api/v1/media/library/collections")
    assert res_list.status_code == 200
    assert len(res_list.json()) >= 1


def test_media_library_search_endpoints(client):
    # 1. GET search
    res_get = client.get("/api/v1/media/library/search?query=futuristic&limit=10")
    assert res_get.status_code == 200
    assert isinstance(res_get.json(), list)

    # 2. POST search
    res_post = client.post(
        "/api/v1/media/library/search",
        json={"query": "city lights", "media_types": ["IMAGE"], "limit": 5},
    )
    assert res_post.status_code == 200
    assert isinstance(res_post.json(), list)
