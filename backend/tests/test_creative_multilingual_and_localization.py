"""Phase 8 Stage 8.5 — Unit Tests for Multilingual Scripts, Narration & Subtitles."""

import pytest
from backend.app.media.creative_models import (
    CreativeBrief,
)
from backend.app.media.creative_planner import CreativePipelinePlanner, MULTILINGUAL_TEMPLATES


def test_multilingual_templates_contain_target_languages():
    for lang in ["en", "te", "hi", "ta"]:
        assert lang in MULTILINGUAL_TEMPLATES
        tmpl = MULTILINGUAL_TEMPLATES[lang]
        assert "intro" in tmpl
        assert "climax" in tmpl
        assert "outro" in tmpl


def test_telugu_pipeline_planning():
    planner = CreativePipelinePlanner()
    brief = CreativeBrief(
        title="అభి ప్రారంభం",
        description="వ్యక్తిగత ఏఐ కంప్యూటర్ ప్రదర్శన",
        language="te",
        duration=8.0,
    )
    pipeline = planner.plan_from_brief(brief)
    assert pipeline.creative_brief.language == "te"
    assert pipeline.script.language == "te"
    assert "స్వాగతం" in pipeline.script.narration_segments[0].text
    assert pipeline.subtitle_tracks[0].language == "te"
    assert "స్వాగతం" in pipeline.subtitle_tracks[0].segments[0].text


def test_hindi_pipeline_planning():
    planner = CreativePipelinePlanner()
    brief = CreativeBrief(
        title="अभि परिचय",
        description="निजी एआई का परिचय",
        language="hi",
        duration=6.0,
    )
    pipeline = planner.plan_from_brief(brief)
    assert pipeline.creative_brief.language == "hi"
    assert "स्वागत है" in pipeline.script.narration_segments[0].text


def test_tamil_pipeline_planning():
    planner = CreativePipelinePlanner()
    brief = CreativeBrief(
        title="அபி அறிமுகம்",
        description="தனிப்பட்ட ஏஐ விளக்கம்",
        language="ta",
        duration=6.0,
    )
    pipeline = planner.plan_from_brief(brief)
    assert pipeline.creative_brief.language == "ta"
    assert "வரவேற்கிறோம்" in pipeline.script.narration_segments[0].text


def test_fallback_to_english_for_unsupported_language():
    planner = CreativePipelinePlanner()
    brief = CreativeBrief(
        title="Global Announcement",
        description="Worldwide release",
        language="fr",  # Not in primary target 4
        duration=6.0,
    )
    pipeline = planner.plan_from_brief(brief)
    assert "Welcome" in pipeline.script.narration_segments[0].text


def test_multilingual_subtitle_segment_durations():
    planner = CreativePipelinePlanner()
    for lang in ["en", "te", "hi", "ta"]:
        brief = CreativeBrief(title=f"Demo {lang}", description="Demo", language=lang, duration=10.0)
        pipeline = planner.plan_from_brief(brief)
        track = pipeline.subtitle_tracks[0]
        assert track.language == lang
        assert len(track.segments) > 0
        for seg in track.segments:
            assert seg.start_time < seg.end_time
            assert seg.end_time <= 10.05


def test_multilingual_storyboard_scenes_alignment():
    planner = CreativePipelinePlanner()
    brief = CreativeBrief(title="Multi Scene", description="Short Promo", language="te", duration=9.0)
    pipeline = planner.plan_from_brief(brief)
    assert len(pipeline.scenes) == 3
    assert len(pipeline.storyboard.scenes) == 3
    total_dur = sum(s.duration for s in pipeline.scenes)
    assert abs(total_dur - 9.0) < 0.1
