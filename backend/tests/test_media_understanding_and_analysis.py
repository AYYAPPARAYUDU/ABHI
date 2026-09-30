"""Unit & Integration tests for Multimodal Media Analyzer (Stage 8.7)."""

import os
import pytest
import struct
from backend.app.media.media_analyzer import MultimodalMediaAnalyzer
from backend.app.media.provenance_models import ProvenanceClass


def _create_dummy_png(path: str, width: int = 1024, height: int = 1024):
    png_sig = b"\x89PNG\r\n\x1a\n"
    ihdr_data = struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)
    ihdr_crc = struct.pack(">I", 0x12345678)
    ihdr_chunk = struct.pack(">I", 13) + b"IHDR" + ihdr_data + ihdr_crc
    iend_chunk = struct.pack(">I", 0) + b"IEND" + struct.pack(">I", 0xAE426082)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "wb") as f:
        f.write(png_sig + ihdr_chunk + iend_chunk)


def _create_dummy_wav(path: str, duration_s: float = 4.0, sample_rate: int = 24000):
    num_samples = int(duration_s * sample_rate)
    data_size = num_samples * 2
    header = bytearray()
    header.extend(b"RIFF")
    header.extend((data_size + 36).to_bytes(4, "little"))
    header.extend(b"WAVE")
    header.extend(b"fmt ")
    header.extend((16).to_bytes(4, "little"))
    header.extend((1).to_bytes(2, "little"))
    header.extend((1).to_bytes(2, "little"))
    header.extend(sample_rate.to_bytes(4, "little"))
    header.extend((sample_rate * 2).to_bytes(4, "little"))
    header.extend((2).to_bytes(2, "little"))
    header.extend((16).to_bytes(2, "little"))
    header.extend(b"data")
    header.extend(data_size.to_bytes(4, "little"))
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "wb") as f:
        f.write(header)
        f.write(b"\x00" * data_size)


@pytest.mark.asyncio
async def test_image_understanding_analysis(tmp_path):
    analyzer = MultimodalMediaAnalyzer()
    img_path = str(tmp_path / "cyber_city.png")
    _create_dummy_png(img_path, 1920, 1080)

    record = await analyzer.analyze_media(
        artifact_id="art_img_test_1",
        file_path=img_path,
        media_type="IMAGE",
        prompt_hint="Futuristic cyberpunk city at night with neon lights and text logo",
        provenance_class=ProvenanceClass.ACTUAL_MODEL_INFERENCE,
        model_id="sdxl-turbo-local",
    )

    assert record.artifact_id == "art_img_test_1"
    assert record.media_type == "IMAGE"
    assert record.environment == "futuristic_city"
    assert record.visual_style == "photorealistic"
    assert record.technical_metadata["dimensions"] == [1920, 1080]
    assert record.is_quarantined is False
    assert record.ocr_text_full == "ABHI Local AI System"
    assert len(record.ocr_blocks) >= 1
    assert "cyberpunk" in record.caption.lower() or "city" in record.caption.lower()


@pytest.mark.asyncio
async def test_video_understanding_scene_slicing(tmp_path):
    analyzer = MultimodalMediaAnalyzer()
    vid_path = str(tmp_path / "test_scene.mp4")
    # Write simple mp4 header
    os.makedirs(os.path.dirname(vid_path), exist_ok=True)
    with open(vid_path, "wb") as f:
        f.write(b"\x00\x00\x00\x20ftypisom\x00\x00\x02\x00isomiso2mp41\x00\x00\x00\x08free\x00\x00\x00\x08mdat")

    record = await analyzer.analyze_media(
        artifact_id="art_vid_test_1",
        file_path=vid_path,
        media_type="VIDEO",
        prompt_hint="A car drifting on high-speed neon track",
    )

    assert record.artifact_id == "art_vid_test_1"
    assert record.media_type == "VIDEO"
    assert len(record.scenes) >= 1
    assert record.scenes[0].video_artifact_id == "art_vid_test_1"
    assert record.scenes[0].start_time == 0.0


@pytest.mark.asyncio
async def test_audio_understanding_and_multilingual(tmp_path):
    analyzer = MultimodalMediaAnalyzer()
    aud_path = str(tmp_path / "telugu_narration.wav")
    _create_dummy_wav(aud_path, duration_s=6.0, sample_rate=24000)

    record = await analyzer.analyze_media(
        artifact_id="art_aud_te_1",
        file_path=aud_path,
        media_type="AUDIO",
        language="te",
        prompt_hint="ఈ వీడియో స్థానిక AI వ్యవస్థను చూపిస్తుంది",
    )

    assert record.artifact_id == "art_aud_te_1"
    assert record.language == "te"
    assert record.audio_transcript_full == "ఈ వీడియో స్థానిక AI వ్యవస్థను చూపిస్తుంది"
    assert len(record.audio_segments) == 1
    assert record.technical_metadata["sample_rate"] == 24000


@pytest.mark.asyncio
async def test_corrupted_media_quarantine(tmp_path):
    analyzer = MultimodalMediaAnalyzer()
    corrupt_path = str(tmp_path / "broken.png")
    os.makedirs(os.path.dirname(corrupt_path), exist_ok=True)
    with open(corrupt_path, "wb") as f:
        f.write(b"NOT_A_VALID_IMAGE_HEADER")

    record = await analyzer.analyze_media(
        artifact_id="art_corrupt_1",
        file_path=corrupt_path,
        media_type="IMAGE",
    )

    assert record.is_quarantined is True
    assert "failed" in record.quarantine_reason.lower() or "corrupt" in record.quarantine_reason.lower()
