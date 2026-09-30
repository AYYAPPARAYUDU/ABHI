"""Phase 8 Stage 8.5 — Unit Tests for Subtitles & Media Timeline Processing."""

import pytest
from backend.app.services.skills.builtin_creative_skills import _handle_subtitles_generate
from backend.app.media.creative_models import (
    SubtitleTrack,
    SubtitleSegment,
    SubtitleFormat,
    MediaTimeline,
    TimelineClip,
    TimelineTrack,
    CreativeAssetType,
    generate_srt_content,
    generate_vtt_content,
    validate_timeline_integrity,
)


@pytest.mark.asyncio
async def test_subtitles_generate_skill_srt():
    args = {
        "format": "SRT",
        "language": "en",
        "segments": [
            {"start_time": 0.0, "end_time": 2.5, "text": "Welcome to ABHI"},
            {"start_time": 2.5, "end_time": 5.0, "text": "Local multimodal intelligence"},
        ],
    }
    result = await _handle_subtitles_generate(args, {"action_id": "act_test_sub"})
    assert result.is_success is True
    assert result.output_data["segment_count"] == 2
    assert "00:00:00,000 --> 00:00:02,500" in result.output_data["raw_content"]
    assert "Welcome to ABHI" in result.output_data["raw_content"]


@pytest.mark.asyncio
async def test_subtitles_generate_skill_vtt():
    args = {
        "format": "WEBVTT",
        "language": "en",
        "segments": [
            {"start_time": 0.0, "end_time": 3.0, "text": "WebVTT Subtitle Track"},
        ],
    }
    result = await _handle_subtitles_generate(args, {"action_id": "act_test_vtt"})
    assert result.is_success is True
    assert result.output_data["format"] == "WEBVTT"
    assert result.output_data["raw_content"].startswith("WEBVTT")


@pytest.mark.asyncio
async def test_subtitles_generate_invalid_arguments():
    args = {"segments": "not_a_list"}
    result = await _handle_subtitles_generate(args, {"action_id": "act_invalid_sub"})
    assert result.is_success is False
    assert result.error_message is not None


def test_timeline_multi_track_layering():
    video_clip = TimelineClip(
        clip_id="c_v1",
        track_type=CreativeAssetType.VIDEO,
        start_time=0.0,
        end_time=6.0,
        source_artifact_id="art_vid_main",
        layer=0,
    )
    audio_clip = TimelineClip(
        clip_id="c_a1",
        track_type=CreativeAssetType.AUDIO,
        start_time=0.0,
        end_time=6.0,
        source_artifact_id="art_aud_narr",
        layer=0,
    )

    timeline = MediaTimeline(
        total_duration=6.0,
        tracks=[
            TimelineTrack(track_id="t_v", track_type=CreativeAssetType.VIDEO, clips=[video_clip]),
            TimelineTrack(track_id="t_a", track_type=CreativeAssetType.AUDIO, clips=[audio_clip]),
        ],
        clips=[video_clip, audio_clip],
    )

    errors = validate_timeline_integrity(timeline)
    assert len(errors) == 0
    assert len(timeline.tracks) == 2
    assert len(timeline.clips) == 2


def test_timeline_rejects_zero_duration():
    timeline = MediaTimeline(total_duration=0.0, clips=[])
    errors = validate_timeline_integrity(timeline)
    assert len(errors) > 0
    assert "total duration must be greater than zero" in errors[0]


def test_subtitle_track_formatting_empty_segments():
    track = SubtitleTrack(language="en", format=SubtitleFormat.SRT, segments=[])
    srt = generate_srt_content(track)
    assert srt == ""

    vtt = generate_vtt_content(track)
    assert vtt.strip() == "WEBVTT"
