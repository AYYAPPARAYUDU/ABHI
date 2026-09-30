"""Phase 8 Stage 8.5 — Creative Pipeline Planner & DAG Compiler.

Responsibilities:
- Synthesizes CreativeScript, Storyboard, Scenes, Subtitles, and MediaTimeline from CreativeBrief
- Supports multilingual scripts and narration timing (English, Telugu, Hindi, Tamil)
- Compiles the creative plan into a verified, executable MediaWorkflow DAG
- Preserves GoalContract integrity and enforces strict validation
"""

import logging
import math
import uuid
from typing import Any, Dict, List, Optional, Tuple

from backend.app.media.creative_models import (
    CreativeBrief,
    CreativePipeline,
    CreativePipelineType,
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
    TimelineTrack,
    CreativeAssetType,
    calculate_pipeline_hash,
)
from backend.app.media.workflow_models import (
    MediaWorkflow,
    MediaWorkflowNode,
    MediaWorkflowEdge,
    WorkflowMediaPortType,
    WorkflowNodeStatus,
)

logger = logging.getLogger(__name__)


# Multilingual sample narration templates for structured offline synthesis
MULTILINGUAL_TEMPLATES = {
    "en": {
        "intro": "Welcome to the future of high performance computing.",
        "climax": "Experience seamless multimodal intelligence directly on your device.",
        "outro": "Powered by ABHI. Local-first personal intelligence.",
    },
    "te": {
        "intro": "స్వాగతం, సరికొత్త అత్యాధునిక లోకల్ ఏఐ కంప్యూటింగ్ లోకి.",
        "climax": "మీ పరికరంలోనే సమగ్ర మల్టీమోడల్ ఆర్టిఫిషియల్ ఇంటెలిజెన్స్.",
        "outro": "అభి ద్వారా ఆధారితం. మీ వ్యక్తిగత ఏఐ సహాయకుడు.",
    },
    "hi": {
        "intro": "स्वागत है, अत्याधुनिक स्थानीय एआई कंप्यूटिंग की दुनिया में।",
        "climax": "अपने ही डिवाइस पर संपूर्ण मल्टीमॉडल बुद्धिमत्ता का अनुभव करें।",
        "outro": "अभि द्वारा संचालित। आपकी निजी एआई प्रणाली।",
    },
    "ta": {
        "intro": "வரவேற்கிறோம், நவீன உள்ளூர் ஏஐ கணினி உலகத்திற்கு.",
        "climax": "உங்கள் சாதனத்திலேயே முழுமையான பல மாதிரி நுண்ணறிவு.",
        "outro": "அபி மூலம் இயக்கப்படுகிறது. உங்கள் தனிப்பட்ட ஏஐ.",
    },
}


class CreativePipelinePlanner:
    """Plans, structures, and compiles high-level creative briefs into executable media DAGs."""

    def plan_from_brief(self, brief: CreativeBrief, task_id: Optional[str] = None) -> CreativePipeline:
        """Decomposes a creative brief into script, storyboard, scenes, timeline, and pipeline."""
        lang = brief.language.lower() if brief.language else "en"
        if lang not in MULTILINGUAL_TEMPLATES:
            lang = "en"

        total_duration = max(1.0, float(brief.duration))
        # Decide scene count (typically 2 to 4 scenes depending on duration)
        scene_count = max(1, min(4, math.ceil(total_duration / 4.0)))
        scene_dur = round(total_duration / scene_count, 2)

        # 1. Generate Structured Script
        script = self._generate_script(brief, lang, scene_count, scene_dur)

        # 2. Generate Storyboard
        storyboard = self._generate_storyboard(brief, script, scene_count, scene_dur)

        # 3. Generate Scenes
        scenes = self._generate_scenes(storyboard)

        # 4. Generate Subtitles
        subtitles = self._generate_subtitles(script, lang)

        # 5. Generate Timeline
        timeline = self._generate_timeline(scenes, subtitles, total_duration)

        pipeline = CreativePipeline(
            task_id=task_id,
            goal=brief.description,
            pipeline_type=self._infer_pipeline_type(brief),
            creative_brief=brief,
            script=script,
            storyboard=storyboard,
            scenes=scenes,
            timeline=timeline,
            subtitle_tracks=[subtitles],
            status="PLANNED",
        )
        pipeline.pipeline_hash = calculate_pipeline_hash(pipeline)
        return pipeline

    def compile_to_media_workflow(
        self,
        pipeline: CreativePipeline,
        asset_reuse_map: Optional[Dict[str, str]] = None,
    ) -> MediaWorkflow:
        """Compiles a CreativePipeline and its scenes into an executable DAG MediaWorkflow.

        Graph structure:
        - Image Generation Node(s) per scene (skipped if reused asset provided)
        - Video Generation Node(s) conditioned on image output
        - TTS Audio Generation Node for full narration
        - Final Multimodal Video Compose Node muxing video and audio
        """
        asset_map = asset_reuse_map or {}
        nodes: List[MediaWorkflowNode] = []
        edges: List[MediaWorkflowEdge] = []

        video_node_ids: List[str] = []

        for scene in pipeline.scenes:
            img_node_id = f"node_img_{scene.scene_id}"
            vid_node_id = f"node_vid_{scene.scene_id}"

            # Step 1: Image synthesis node
            reused_artifact = asset_map.get(scene.scene_id)
            if not reused_artifact:
                # Find visual prompt from storyboard
                sb_scene = next((s for s in (pipeline.storyboard.scenes if pipeline.storyboard else []) if s.scene_id == scene.scene_id), None)
                v_prompt = sb_scene.visual_prompt if sb_scene else f"{pipeline.creative_brief.title} scene {scene.order}"

                img_node = MediaWorkflowNode(
                    node_id=img_node_id,
                    title=f"Synthesize Scene {scene.order} Image",
                    skill_id="media.image.generate",
                    skill_version="1.0.0",
                    parameters={
                        "prompt": f"{v_prompt}, {pipeline.creative_brief.style}",
                        "width": pipeline.creative_brief.resolution[0],
                        "height": pipeline.creative_brief.resolution[1],
                        "steps": 20,
                    },
                    status=WorkflowNodeStatus.PENDING,
                )
                nodes.append(img_node)
                source_for_vid = f"{{{{{img_node_id}.artifact_id}}}}"
            else:
                source_for_vid = reused_artifact

            # Step 2: Video animation node
            vid_node = MediaWorkflowNode(
                node_id=vid_node_id,
                title=f"Animate Scene {scene.order} Video",
                skill_id="media.video.generate",
                skill_version="1.0.0",
                parameters={
                    "prompt": f"Cinematic motion, {pipeline.creative_brief.style}",
                    "source_image_id": source_for_vid,
                    "duration_seconds": min(4.0, scene.duration),
                    "fps": 24,
                },
                status=WorkflowNodeStatus.PENDING,
            )
            nodes.append(vid_node)
            video_node_ids.append(vid_node_id)

            if not reused_artifact:
                edges.append(
                    MediaWorkflowEdge(
                        source_node_id=img_node_id,
                        source_output_key="artifact_id",
                        target_node_id=vid_node_id,
                        target_input_key="source_image_id",
                        port_type=WorkflowMediaPortType.IMAGE,
                    )
                )

        # Step 3: Narration Audio TTS Node
        tts_node_id = "node_narration_tts"
        full_text = " ".join([seg.text for seg in (pipeline.script.narration_segments if pipeline.script else [])])
        if not full_text:
            full_text = pipeline.creative_brief.title

        tts_node = MediaWorkflowNode(
            node_id=tts_node_id,
            title="Generate Narration Voiceover",
            skill_id="audio.tts",
            skill_version="1.0.0",
            parameters={
                "text": full_text,
                "language": pipeline.creative_brief.language,
            },
            status=WorkflowNodeStatus.PENDING,
        )
        nodes.append(tts_node)

        # Step 4: Final Multimodal Video Compose Node
        primary_vid_node = video_node_ids[0] if video_node_ids else vid_node_id
        compose_node_id = "node_final_composition"
        compose_node = MediaWorkflowNode(
            node_id=compose_node_id,
            title="Multiplex Video & Audio Render",
            skill_id="media.video.compose",
            skill_version="1.0.0",
            parameters={
                "video_artifact_id": f"{{{{{primary_vid_node}.artifact_id}}}}",
                "audio_artifact_id": f"{{{{{tts_node_id}.artifact_id}}}}",
                "profile": "VIDEO_PLUS_AUDIO",
            },
            status=WorkflowNodeStatus.PENDING,
        )
        nodes.append(compose_node)

        # Connect primary video -> compose
        edges.append(
            MediaWorkflowEdge(
                source_node_id=primary_vid_node,
                source_output_key="artifact_id",
                target_node_id=compose_node_id,
                target_input_key="video_artifact_id",
                port_type=WorkflowMediaPortType.VIDEO,
            )
        )

        # Connect audio -> compose
        edges.append(
            MediaWorkflowEdge(
                source_node_id=tts_node_id,
                source_output_key="artifact_id",
                target_node_id=compose_node_id,
                target_input_key="audio_artifact_id",
                port_type=WorkflowMediaPortType.AUDIO,
            )
        )

        return MediaWorkflow(
            workflow_id=f"wf_{pipeline.pipeline_id}",
            title=f"Creative Workflow: {pipeline.creative_brief.title}",
            goal=pipeline.goal,
            nodes=nodes,
            edges=edges,
        )

    def _generate_script(
        self,
        brief: CreativeBrief,
        lang: str,
        scene_count: int,
        scene_dur: float,
    ) -> CreativeScript:
        """Constructs narration segments and on-screen text matching the brief."""
        narr_texts = MULTILINGUAL_TEMPLATES.get(lang, MULTILINGUAL_TEMPLATES["en"])
        segments: List[NarrationSegment] = []

        keys = ["intro", "climax", "outro"]
        for i in range(scene_count):
            k = keys[i % len(keys)]
            text = f"{brief.title}. {narr_texts.get(k, '')}"
            segments.append(
                NarrationSegment(
                    scene_id=f"scn_{i+1}",
                    text=text,
                    language=lang,
                    estimated_duration_sec=scene_dur,
                )
            )

        return CreativeScript(
            title=brief.title,
            language=lang,
            narration_segments=segments,
            on_screen_text={f"scn_{i+1}": f"Scene {i+1}: {brief.title}" for i in range(scene_count)},
            duration_estimates={f"scn_{i+1}": scene_dur for i in range(scene_count)},
        )

    def _generate_storyboard(
        self,
        brief: CreativeBrief,
        script: CreativeScript,
        scene_count: int,
        scene_dur: float,
    ) -> Storyboard:
        """Constructs storyboard visual shots."""
        sb_scenes: List[StoryboardScene] = []
        for i in range(scene_count):
            desc = f"Visual shot {i+1} focusing on {brief.title}"
            v_prompt = f"{brief.title}, scene {i+1}, {brief.style}, high quality masterpiece"
            narr = script.narration_segments[i].text if i < len(script.narration_segments) else None
            sb_scenes.append(
                StoryboardScene(
                    scene_id=f"scn_{i+1}",
                    sequence=i + 1,
                    duration=scene_dur,
                    description=desc,
                    visual_prompt=v_prompt,
                    camera_motion="Slow Zoom In",
                    narration=narr,
                    on_screen_text=f"Scene {i+1}",
                    transition=SceneTransitionType.CUT if i == 0 else SceneTransitionType.CROSSFADE,
                )
            )

        return Storyboard(
            title=f"Storyboard: {brief.title}",
            scenes=sb_scenes,
        )

    def _generate_scenes(self, storyboard: Storyboard) -> List[Scene]:
        """Translates storyboard scenes into operational Scene nodes."""
        scenes: List[Scene] = []
        for sb in storyboard.scenes:
            scenes.append(
                Scene(
                    scene_id=sb.scene_id,
                    order=sb.sequence,
                    duration=sb.duration,
                    transition=sb.transition,
                )
            )
        return scenes

    def _generate_subtitles(self, script: CreativeScript, lang: str) -> SubtitleTrack:
        """Generates synchronized SubtitleTrack segments from narration."""
        segments: List[SubtitleSegment] = []
        curr_time = 0.0
        idx = 1
        for narr in script.narration_segments:
            dur = narr.estimated_duration_sec
            segments.append(
                SubtitleSegment(
                    index=idx,
                    start_time=curr_time,
                    end_time=curr_time + dur,
                    text=narr.text,
                )
            )
            curr_time += dur
            idx += 1

        return SubtitleTrack(
            language=lang,
            format=SubtitleFormat.SRT,
            segments=segments,
        )

    def _generate_timeline(
        self,
        scenes: List[Scene],
        subtitles: SubtitleTrack,
        total_duration: float,
    ) -> MediaTimeline:
        """Builds multi-track timeline."""
        video_clips: List[TimelineClip] = []
        audio_clips: List[TimelineClip] = []
        curr_t = 0.0

        for scn in scenes:
            video_clips.append(
                TimelineClip(
                    clip_id=f"clip_vid_{scn.scene_id}",
                    track_type=CreativeAssetType.VIDEO,
                    start_time=curr_t,
                    end_time=curr_t + scn.duration,
                    source_artifact_id=f"art_vid_{scn.scene_id}",
                    layer=0,
                    transition=scn.transition,
                )
            )
            audio_clips.append(
                TimelineClip(
                    clip_id=f"clip_aud_{scn.scene_id}",
                    track_type=CreativeAssetType.AUDIO,
                    start_time=curr_t,
                    end_time=curr_t + scn.duration,
                    source_artifact_id=f"art_aud_{scn.scene_id}",
                    layer=0,
                )
            )
            curr_t += scn.duration

        tracks = [
            TimelineTrack(track_id="track_video_main", track_type=CreativeAssetType.VIDEO, clips=video_clips),
            TimelineTrack(track_id="track_audio_narration", track_type=CreativeAssetType.AUDIO, clips=audio_clips),
        ]

        return MediaTimeline(
            total_duration=curr_t,
            tracks=tracks,
            clips=video_clips + audio_clips,
        )

    def _infer_pipeline_type(self, brief: CreativeBrief) -> CreativePipelineType:
        """Infers appropriate pipeline type from brief keywords."""
        desc = (brief.description + " " + brief.title).lower()
        if "story" in desc or "narrat" in desc:
            return CreativePipelineType.NARRATED_IMAGE_STORY
        if "social" in desc or "reel" in desc or "clip" in desc:
            return CreativePipelineType.SOCIAL_MEDIA_CLIP
        if "presentation" in desc or "slide" in desc:
            return CreativePipelineType.PRESENTATION_VISUAL
        if "cinema" in desc or "film" in desc:
            return CreativePipelineType.CINEMATIC_SCENE
        if "photo" in desc:
            return CreativePipelineType.PHOTO_TO_VIDEO
        return CreativePipelineType.SHORT_PROMOTIONAL_VIDEO
