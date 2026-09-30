"""Unit & Integration tests for Background Indexing Queue, Caching & Collections (Stage 8.7)."""

import os
import pytest
import asyncio
import struct
from backend.app.media.indexing_queue import MediaIndexingManager
from backend.app.media.understanding_models import MediaAnalysisStatus, MediaSearchRequest


def _create_dummy_png(path: str, width: int = 512, height: int = 512):
    png_sig = b"\x89PNG\r\n\x1a\n"
    ihdr_data = struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)
    ihdr_crc = struct.pack(">I", 0x12345678)
    ihdr_chunk = struct.pack(">I", 13) + b"IHDR" + ihdr_data + ihdr_crc
    iend_chunk = struct.pack(">I", 0) + b"IEND" + struct.pack(">I", 0xAE426082)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "wb") as f:
        f.write(png_sig + ihdr_chunk + iend_chunk)


@pytest.mark.asyncio
async def test_indexing_queue_and_cache(tmp_path):
    mgr = MediaIndexingManager()
    img_path = str(tmp_path / "sample_img.png")
    _create_dummy_png(img_path, 512, 512)

    # 1. Submit initial indexing job
    job1 = await mgr.submit_indexing_job(
        artifact_id="art_job_01",
        file_path=img_path,
        media_type="IMAGE",
        prompt_hint="A sample graphic for testing",
    )

    # Wait briefly for async task completion
    await asyncio.sleep(0.1)

    rec1 = await mgr.get_understanding("art_job_01")
    assert rec1 is not None
    assert rec1.media_type == "IMAGE"
    assert rec1.caption == "A sample graphic for testing"

    # 2. Submit second job with identical file (cache hit)
    job2 = await mgr.submit_indexing_job(
        artifact_id="art_job_02",
        file_path=img_path,
        media_type="IMAGE",
        prompt_hint="A sample graphic for testing",
    )
    await asyncio.sleep(0.05)

    rec2 = await mgr.get_understanding("art_job_02")
    assert rec2 is not None
    assert rec2.technical_metadata["dimensions"] == [512, 512]


@pytest.mark.asyncio
async def test_collections_crud(tmp_path):
    mgr = MediaIndexingManager()
    col = await mgr.create_collection(
        title="Cyberpunk Campaign",
        description="Assets for Q4 product release",
        collection_type="CAMPAIGN",
        tags=["cyberpunk", "q4"],
    )

    assert col.title == "Cyberpunk Campaign"
    assert col.collection_type == "CAMPAIGN"

    updated = await mgr.add_to_collection(col.collection_id, ["art_01", "art_02"])
    assert updated is not None
    assert len(updated.artifact_ids) == 2

    all_cols = await mgr.list_collections()
    assert len(all_cols) >= 1
