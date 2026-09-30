"""Phase 8 Stage 8.5 — Advanced Multimodal Creative Production Pipeline Models & Contracts.

Governs:
- CreativeBrief, CreativeScript, Storyboard, Scene, and Asset Models
- SubtitleTrack (SRT / WebVTT) and Multimodal MediaTimeline Models
- CreativePipeline, CreativeProjectManifest, and Render Profiles
- Dependency Invalidation, Quality Scorecards, and Deterministic Pipeline Hashing
"""

from enum import Enum
import hashlib
import json
import time
import uuid
from typing import Any, Dict, List, Optional, Set
from pydantic import BaseModel, Field

from backend.app.media.models import MediaType


class CreativePipelineType(str, Enum):
    """Supported high-level creative production pipeline categories."""
    SHORT_PROMOTIONAL_VIDEO = "SHORT_PROMOTIONAL_VIDEO"
    NARRATED_IMAGE_STORY = "NARRATED_IMAGE_STORY"
    SOCIAL_MEDIA_CLIP = "SOCIAL_MEDIA_CLIP"
    PRESENTATION_VISUAL = "PRESENTATION_VISUAL"
    CINEMATIC_SCENE = "CINEMATIC_SCENE"
    PHOTO_TO_VIDEO = "PHOTO_TO_VIDEO"
    CUSTOM = "CUSTOM"


class CreativePipelineStatus(str, Enum):
    """Lifecycle states of a creative production pipeline."""
    DRAFT = "DRAFT"
    PLANNED = "PLANNED"
    SIMULATED = "SIMULATED"
    ADMITTED = "ADMITTED"
    RUNNING = "RUNNING"
    PAUSED = "PAUSED"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"
    REVISED = "REVISED"


class CreativeAssetType(str, Enum):
    """Types of assets managed within a creative project."""
    IMAGE = "IMAGE"
    VIDEO = "VIDEO"
    AUDIO = "AUDIO"
    TEXT = "TEXT"
    SUBTITLE = "SUBTITLE"
    MASK = "MASK"


class SceneTransitionType(str, Enum):
    """Allowlisted cinematic transitions between timeline scenes."""
    CUT = "CUT"
    FADE = "FADE"
    CROSSFADE = "CROSSFADE"
    DISSOLVE = "DISSOLVE"


class SubtitleFormat(str, Enum):
    """Validated subtitle container formats."""
    SRT = "SRT"
    WEBVTT = "WEBVTT"


class RenderProfile(str, Enum):
    """Fixed allowlisted final video rendering and multiplexing profiles."""
    MP4_H264_STANDARD = "MP4_H264_STANDARD"
    MP4_H264_LOW_RESOURCE = "MP4_H264_LOW_RESOURCE"
    WEBM_STANDARD = "WEBM_STANDARD"


class PipelineRetentionPolicy(str, Enum):
    """Artifact retention policy for project deliverables."""
    FINAL_ONLY = "FINAL_ONLY"
    FINAL_PLUS_SOURCES = "FINAL_PLUS_SOURCES"
    FULL_PROJECT = "FULL_PROJECT"


class CreativeBrief(BaseModel):
    """User-specified or system-derived creative project requirements."""
    title: str = Field(..., max_length=256)
    description: str = Field(..., max_length=4096)
    style: str = Field(default="Cinematic Realistic", max_length=128)
    tone: str = Field(default="Professional", max_length=64)
    language: str = Field(default="en", max_length=16)
    duration: float = Field(default=10.0, ge=1.0, le=120.0)
    aspect_ratio: str = Field(default="16:9")
    resolution: List[int] = Field(default_factory=lambda: [512, 512])
    target_format: str = Field(default="MP4")
    audience: Optional[str] = Field(default="General", max_length=128)
    visual_requirements: List[str] = Field(default_factory=list)
    audio_requirements: List[str] = Field(default_factory=list)
    text_requirements: List[str] = Field(default_factory=list)
    constraints: Dict[str, Any] = Field(default_factory=dict)


class NarrationSegment(BaseModel):
    """A discrete spoken narration block bound to a scene."""
    segment_id: str = Field(default_factory=lambda: f"narr_{uuid.uuid4().hex[:8]}")
    scene_id: str
    speaker_voice: str = Field(default="default")
    text: str = Field(..., max_length=2000)
    language: str = Field(default="en")
    estimated_duration_sec: float = Field(default=3.0, ge=0.5)
    actual_duration_sec: Optional[float] = None
    audio_artifact_id: Optional[str] = None


class CreativeScript(BaseModel):
    """Structured narration, dialogues, and on-screen text for the project."""
    script_id: str = Field(default_factory=lambda: f"script_{uuid.uuid4().hex[:8]}")
    title: str
    language: str = Field(default="en")
    scenes_text: Dict[str, str] = Field(default_factory=dict, description="Scene ID to text prompt mapping")
    narration_segments: List[NarrationSegment] = Field(default_factory=list)
    on_screen_text: Dict[str, str] = Field(default_factory=dict)
    duration_estimates: Dict[str, float] = Field(default_factory=dict)
    version: str = Field(default="1.0.0")


class StoryboardScene(BaseModel):
    """Visual and temporal blueprint for an individual scene."""
    scene_id: str = Field(default_factory=lambda: f"scene_{uuid.uuid4().hex[:8]}")
    sequence: int = Field(default=1)
    duration: float = Field(default=3.0, ge=0.5, le=30.0)
    description: str = Field(..., max_length=1000)
    visual_prompt: str = Field(..., max_length=2000)
    camera_motion: str = Field(default="Static Pan", max_length=64)
    narration: Optional[str] = None
    on_screen_text: Optional[str] = None
    required_assets: List[str] = Field(default_factory=list)
    transition: SceneTransitionType = Field(default=SceneTransitionType.CUT)


class Storyboard(BaseModel):
    """Complete visual layout and sequencing blueprint."""
    storyboard_id: str = Field(default_factory=lambda: f"sb_{uuid.uuid4().hex[:8]}")
    title: str
    scenes: List[StoryboardScene] = Field(default_factory=list)
    version: str = Field(default="1.0.0")


class CreativeAsset(BaseModel):
    """Immutable tracked asset generated or reused in the pipeline."""
    asset_id: str = Field(default_factory=lambda: f"c_ast_{uuid.uuid4().hex[:8]}")
    artifact_id: str
    asset_type: CreativeAssetType
    source: str = Field(default="GENERATED", description="GENERATED, REUSED, or IMPORTED")
    model_id: Optional[str] = None
    model_digest: Optional[str] = None
    runtime: Optional[str] = None
    parent_assets: List[str] = Field(default_factory=list)
    parameters_hash: str = Field(default="")
    content_hash: str = Field(default="")
    file_path: Optional[str] = None
    size_bytes: int = Field(default=0)
    created_at: float = Field(default_factory=time.time)
    is_reused: bool = Field(default=False)


class CreativeSceneStatus(str, Enum):
    PENDING = "PENDING"
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"


class Scene(BaseModel):
    """Operational unit of the creative production DAG."""
    scene_id: str = Field(default_factory=lambda: f"scn_{uuid.uuid4().hex[:8]}")
    order: int
    duration: float = Field(default=3.0)
    visual_assets: List[str] = Field(default_factory=list, description="Asset IDs for images")
    video_assets: List[str] = Field(default_factory=list, description="Asset IDs for videos")
    audio_assets: List[str] = Field(default_factory=list, description="Asset IDs for voice/SFX")
    text_assets: List[str] = Field(default_factory=list)
    transition: SceneTransitionType = Field(default=SceneTransitionType.CUT)
    output_artifact_id: Optional[str] = None
    status: CreativeSceneStatus = Field(default=CreativeSceneStatus.PENDING)


class SubtitleSegment(BaseModel):
    """Single timed subtitle line."""
    index: int
    start_time: float = Field(..., ge=0.0)
    end_time: float = Field(..., ge=0.0)
    text: str = Field(..., max_length=500)
    style: Optional[str] = None


class SubtitleTrack(BaseModel):
    """Timed subtitle track synchronized with the media timeline."""
    track_id: str = Field(default_factory=lambda: f"sub_{uuid.uuid4().hex[:8]}")
    language: str = Field(default="en")
    format: SubtitleFormat = Field(default=SubtitleFormat.SRT)
    segments: List[SubtitleSegment] = Field(default_factory=list)
    raw_content: Optional[str] = None


class TimelineClip(BaseModel):
    """A media clip positioned in time on a timeline track."""
    clip_id: str = Field(default_factory=lambda: f"clip_{uuid.uuid4().hex[:8]}")
    track_type: CreativeAssetType
    start_time: float
    end_time: float
    source_artifact_id: str
    layer: int = Field(default=0)
    transition: SceneTransitionType = Field(default=SceneTransitionType.CUT)
    metadata: Dict[str, Any] = Field(default_factory=dict)


class TimelineTrack(BaseModel):
    """Layered track containing sequential or composable clips."""
    track_id: str
    track_type: CreativeAssetType
    clips: List[TimelineClip] = Field(default_factory=list)


class MediaTimeline(BaseModel):
    """Multi-track timeline orchestrating video, audio, and subtitle placement."""
    timeline_id: str = Field(default_factory=lambda: f"tl_{uuid.uuid4().hex[:8]}")
    total_duration: float = Field(default=0.0, ge=0.0)
    tracks: List[TimelineTrack] = Field(default_factory=list)
    clips: List[TimelineClip] = Field(default_factory=list)


class CreativeStyleProfile(BaseModel):
    """Brand and aesthetic guidelines preserving creative consistency."""
    profile_id: str = Field(default_factory=lambda: f"style_{uuid.uuid4().hex[:8]}")
    name: str = Field(..., max_length=128)
    fonts: List[str] = Field(default_factory=lambda: ["Inter", "Roboto"])
    palette: List[str] = Field(default_factory=lambda: ["#0f172a", "#06b6d4", "#6366f1"])
    tone: str = Field(default="Cinematic")
    visual_references: List[str] = Field(default_factory=list, description="Artifact IDs of reference images")
    logo_artifact_id: Optional[str] = None
    voice_preference: str = Field(default="default")
    subtitle_style: Dict[str, Any] = Field(default_factory=dict)


class PipelineQualityScore(BaseModel):
    """Multi-dimensional verification quality scorecard."""
    technical_integrity: float = Field(default=1.0, ge=0.0, le=1.0)
    resource_efficiency: float = Field(default=1.0, ge=0.0, le=1.0)
    workflow_completion: float = Field(default=1.0, ge=0.0, le=1.0)
    prompt_adherence: float = Field(default=1.0, ge=0.0, le=1.0)
    temporal_consistency: float = Field(default=1.0, ge=0.0, le=1.0)
    audio_video_alignment: float = Field(default=1.0, ge=0.0, le=1.0)
    reused_assets_count: int = Field(default=0)
    gpu_seconds_saved: float = Field(default=0.0)
    overall_passed: bool = Field(default=True)
    validation_notes: List[str] = Field(default_factory=list)


class CreativePipeline(BaseModel):
    """Top-level immutable representation of a creative production pipeline."""
    pipeline_id: str = Field(default_factory=lambda: f"pipe_{uuid.uuid4().hex[:12]}")
    task_id: Optional[str] = None
    execution_id: Optional[str] = None
    goal: str = Field(..., max_length=4096)
    pipeline_type: CreativePipelineType = Field(default=CreativePipelineType.SHORT_PROMOTIONAL_VIDEO)
    version: str = Field(default="1.0.0")
    creative_brief: CreativeBrief
    script: Optional[CreativeScript] = None
    storyboard: Optional[Storyboard] = None
    scenes: List[Scene] = Field(default_factory=list)
    assets: List[CreativeAsset] = Field(default_factory=list)
    timeline: Optional[MediaTimeline] = None
    subtitle_tracks: List[SubtitleTrack] = Field(default_factory=list)
    outputs: List[str] = Field(default_factory=list, description="Output artifact IDs")
    render_profile: RenderProfile = Field(default=RenderProfile.MP4_H264_STANDARD)
    resource_budget: Dict[str, Any] = Field(default_factory=dict)
    storage_budget_mb: float = Field(default=500.0)
    retention_policy: PipelineRetentionPolicy = Field(default=PipelineRetentionPolicy.FINAL_PLUS_SOURCES)
    quality_report: Optional[PipelineQualityScore] = None
    status: CreativePipelineStatus = Field(default=CreativePipelineStatus.DRAFT)
    underlying_workflow_id: Optional[str] = None
    pipeline_hash: str = Field(default="")
    seed: Optional[int] = None
    created_at: float = Field(default_factory=time.time)
    started_at: Optional[float] = None
    completed_at: Optional[float] = None
    error_message: Optional[str] = None


class CreativeProjectManifest(BaseModel):
    """Cryptographically signed audit package for completed creative projects."""
    manifest_id: str = Field(default_factory=lambda: f"cmnf_{uuid.uuid4().hex[:10]}")
    pipeline_id: str
    pipeline_hash: str
    creative_brief: CreativeBrief
    script: Optional[CreativeScript] = None
    storyboard: Optional[Storyboard] = None
    scenes: List[Scene] = Field(default_factory=list)
    assets: List[CreativeAsset] = Field(default_factory=list)
    models: List[str] = Field(default_factory=list)
    artifacts: List[Dict[str, Any]] = Field(default_factory=list)
    timeline: Optional[MediaTimeline] = None
    subtitles: List[SubtitleTrack] = Field(default_factory=list)
    quality_report: Optional[PipelineQualityScore] = None
    resource_summary: Dict[str, Any] = Field(default_factory=dict)
    verification_passed: bool = Field(default=True)
    created_at: float = Field(default_factory=time.time)


class CreativePipelineTemplate(BaseModel):
    """Reusable high-level creative pipeline blueprint."""
    template_id: str
    title: str
    description: str
    category: str = Field(default="creative_production")
    version: str = Field(default="1.0.0")
    pipeline_type: CreativePipelineType
    default_brief: Dict[str, Any] = Field(default_factory=dict)
    supported_languages: List[str] = Field(default_factory=lambda: ["en", "te", "hi", "ta"])
    is_builtin: bool = Field(default=True)


def calculate_pipeline_hash(pipeline: CreativePipeline) -> str:
    """Calculates canonical SHA-256 hash over pipeline definition, brief, and scene layout."""
    data = {
        "pipeline_type": pipeline.pipeline_type.value,
        "goal": pipeline.goal,
        "brief": {
            "title": pipeline.creative_brief.title,
            "description": pipeline.creative_brief.description,
            "style": pipeline.creative_brief.style,
            "language": pipeline.creative_brief.language,
            "duration": pipeline.creative_brief.duration,
            "resolution": pipeline.creative_brief.resolution,
        },
        "scenes": [
            {
                "scene_id": s.scene_id,
                "order": s.order,
                "duration": s.duration,
            }
            for s in pipeline.scenes
        ],
        "render_profile": pipeline.render_profile.value,
    }
    encoded = json.dumps(data, sort_keys=True).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()


def validate_timeline_integrity(timeline: MediaTimeline) -> List[str]:
    """Validates timeline clips, ensuring positive timings, bounds, and no orphan references."""
    errors = []
    if timeline.total_duration <= 0:
        errors.append("Timeline total duration must be greater than zero.")

    for clip in timeline.clips:
        if clip.start_time < 0:
            errors.append(f"Clip '{clip.clip_id}' has negative start time ({clip.start_time}).")
        if clip.end_time <= clip.start_time:
            errors.append(f"Clip '{clip.clip_id}' has invalid range ({clip.start_time} -> {clip.end_time}).")
        if clip.end_time > timeline.total_duration + 0.05:
            errors.append(
                f"Clip '{clip.clip_id}' exceeds timeline duration ({clip.end_time} > {timeline.total_duration})."
            )
        if not clip.source_artifact_id:
            errors.append(f"Clip '{clip.clip_id}' is missing source artifact ID.")

    return errors


def generate_srt_content(track: SubtitleTrack) -> str:
    """Generates standard SubRip (.srt) text from SubtitleTrack segments."""
    def _format_time(seconds: float) -> str:
        hrs = int(seconds // 3600)
        mins = int((seconds % 3600) // 60)
        secs = int(seconds % 60)
        millis = int((seconds - int(seconds)) * 1000)
        return f"{hrs:02d}:{mins:02d}:{secs:02d},{millis:03d}"

    lines = []
    for seg in track.segments:
        lines.append(str(seg.index))
        lines.append(f"{_format_time(seg.start_time)} --> {_format_time(seg.end_time)}")
        lines.append(seg.text)
        lines.append("")
    return "\n".join(lines)


def generate_vtt_content(track: SubtitleTrack) -> str:
    """Generates standard WebVTT (.vtt) text from SubtitleTrack segments."""
    def _format_time(seconds: float) -> str:
        hrs = int(seconds // 3600)
        mins = int((seconds % 3600) // 60)
        secs = int(seconds % 60)
        millis = int((seconds - int(seconds)) * 1000)
        return f"{hrs:02d}:{mins:02d}:{secs:02d}.{millis:03d}"

    lines = ["WEBVTT", ""]
    for seg in track.segments:
        lines.append(f"{_format_time(seg.start_time)} --> {_format_time(seg.end_time)}")
        lines.append(seg.text)
        lines.append("")
    return "\n".join(lines)
