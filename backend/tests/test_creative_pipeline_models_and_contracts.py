"""Phase 8 Stage 8.5 — Unit Tests for Creative Pipeline Models & Contracts."""

import pytest
from backend.app.media.creative_models import (
    CreativeBrief,
    CreativePipeline,
    CreativePipelineType,
    CreativePipelineStatus,
    CreativeScript,
    NarrationSegment,
    Storyboard,
    StoryboardScene,
    Scene,
    SceneTransitionType,
    SubtitleTrack,
    SubtitleSegment,
    SubtitleFormat,
    MediaTimeline,
    TimelineClip,
    CreativeAssetType,
    calculate_pipeline_hash,
    validate_timeline_integrity,
    generate_srt_content,
    generate_vtt_content,
)


def test_creative_brief_defaults_and_validation():
    brief = CreativeBrief(
        title="Cyberpunk Teaser",
        description="A 10s teaser video of a cyberpunk city.",
        style="Cyberpunk Neon",
        duration=10.0,
    )
    assert brief.title == "Cyberpunk Teaser"
    assert brief.duration == 10.0
    assert brief.language == "en"
    assert brief.resolution == [512, 512]


def test_pipeline_hash_determinism_and_tampering():
    brief = CreativeBrief(
        title="Promo Video",
        description="Launch announcement video",
        style="Modern Minimalist",
        duration=8.0,
    )
    pipeline1 = CreativePipeline(
        goal="Launch announcement video",
        creative_brief=brief,
        scenes=[Scene(scene_id="s1", order=1, duration=4.0), Scene(scene_id="s2", order=2, duration=4.0)],
    )
    hash1 = calculate_pipeline_hash(pipeline1)
    hash2 = calculate_pipeline_hash(pipeline1)
    assert hash1 == hash2
    assert len(hash1) == 64

    # Tampering scene duration changes hash
    pipeline1.scenes[0].duration = 5.0
    hash3 = calculate_pipeline_hash(pipeline1)
    assert hash1 != hash3


def test_validate_timeline_integrity_valid():
    timeline = MediaTimeline(
        total_duration=10.0,
        clips=[
            TimelineClip(
                clip_id="c1",
                track_type=CreativeAssetType.VIDEO,
                start_time=0.0,
                end_time=5.0,
                source_artifact_id="art_vid_1",
            ),
            TimelineClip(
                clip_id="c2",
                track_type=CreativeAssetType.VIDEO,
                start_time=5.0,
                end_time=10.0,
                source_artifact_id="art_vid_2",
            ),
        ],
    )
    errors = validate_timeline_integrity(timeline)
    assert len(errors) == 0


def test_validate_timeline_integrity_invalid_ranges():
    timeline = MediaTimeline(
        total_duration=10.0,
        clips=[
            TimelineClip(
                clip_id="c1",
                track_type=CreativeAssetType.VIDEO,
                start_time=-1.0,  # Negative start
                end_time=5.0,
                source_artifact_id="art_vid_1",
            ),
            TimelineClip(
                clip_id="c2",
                track_type=CreativeAssetType.VIDEO,
                start_time=6.0,
                end_time=4.0,  # End before start
                source_artifact_id="art_vid_2",
            ),
            TimelineClip(
                clip_id="c3",
                track_type=CreativeAssetType.VIDEO,
                start_time=0.0,
                end_time=15.0,  # Exceeds total_duration
                source_artifact_id="art_vid_3",
            ),
            TimelineClip(
                clip_id="c4",
                track_type=CreativeAssetType.VIDEO,
                start_time=0.0,
                end_time=3.0,
                source_artifact_id="",  # Missing source artifact
            ),
        ],
    )
    errors = validate_timeline_integrity(timeline)
    assert len(errors) == 4
    assert any("negative start" in e for e in errors)
    assert any("invalid range" in e for e in errors)
    assert any("exceeds timeline duration" in e for e in errors)
    assert any("missing source artifact" in e for e in errors)


def test_generate_srt_content_formatting():
    track = SubtitleTrack(
        language="en",
        format=SubtitleFormat.SRT,
        segments=[
            SubtitleSegment(index=1, start_time=0.0, end_time=3.5, text="Hello world!"),
            SubtitleSegment(index=2, start_time=3.5, end_time=7.0, text="Welcome to ABHI."),
        ],
    )
    srt_text = generate_srt_content(track)
    assert "1" in srt_text
    assert "00:00:00,000 --> 00:00:03,500" in srt_text
    assert "Hello world!" in srt_text
    assert "2" in srt_text
    assert "00:00:03,500 --> 00:00:07,000" in srt_text
    assert "Welcome to ABHI." in srt_text


def test_generate_vtt_content_formatting():
    track = SubtitleTrack(
        language="en",
        format=SubtitleFormat.WEBVTT,
        segments=[
            SubtitleSegment(index=1, start_time=0.0, end_time=2.25, text="WebVTT Subtitle"),
        ],
    )
    vtt_text = generate_vtt_content(track)
    assert vtt_text.startswith("WEBVTT")
    assert "00:00:00.000 --> 00:00:02.250" in vtt_text
    assert "WebVTT Subtitle" in vtt_text


def test_storyboard_and_script_structures():
    script = CreativeScript(
        title="Short Story",
        language="en",
        narration_segments=[
            NarrationSegment(scene_id="s1", text="Opening narration", estimated_duration_sec=3.0),
        ],
    )
    storyboard = Storyboard(
        title="Storyboard 1",
        scenes=[
            StoryboardScene(
                scene_id="s1",
                sequence=1,
                duration=3.0,
                description="Opening visual",
                visual_prompt="A futuristic station",
                transition=SceneTransitionType.FADE,
            )
        ],
    )
    assert len(script.narration_segments) == 1
    assert len(storyboard.scenes) == 1
    assert storyboard.scenes[0].transition == SceneTransitionType.FADE
