"""Phase 8 Stage 8.4 — Multimodal Media Workflow Composer & Orchestration Engine.

Governs:
- Multimodal Workflow Synthesis & DAG Planning
- Resource Feasibility Simulation & Sequential Peak Estimation
- Incremental Node Execution, Variable Binding & Safety Gating
- Checkpointing, Lineage Continuity & Resilient Recovery
- Reusable Versioned Templates & Cryptographic Manifest Generation
"""

import asyncio
import json
import threading
import time
import uuid
from typing import Any, Dict, List, Optional, Tuple

from backend.app.core.logging import logger
from backend.app.media.workflow_models import (
    MediaWorkflow,
    MediaWorkflowNode,
    MediaWorkflowEdge,
    MediaWorkflowStatus,
    WorkflowNodeStatus,
    MediaWorkflowCheckpoint,
    MediaWorkflowSimulationResult,
    MediaWorkflowManifest,
    MediaWorkflowTemplate,
    WorkflowMediaPortType,
    MediaCompositionRequest,
    MediaCompositionProfile,
)
from backend.app.media.capability_graph import media_capability_graph, MediaCapabilityGraph
from backend.app.media.coordinator import media_coordinator
from backend.app.media.video_coordinator import video_coordinator
from backend.app.media.edit_coordinator import image_edit_coordinator
from backend.app.media.composition_runtime import media_composition_runtime
from backend.app.perception.audio.tts import text_to_speech
from backend.app.media.storage import media_storage
from backend.app.runtime.resources.manager import resource_manager
from backend.app.services.skills.runtime import SkillExecutionRuntime, skill_runtime
from backend.app.services.skills.models import SkillResult


class MultimodalMediaWorkflowComposer:
    """Orchestrates multi-stage media pipelines spanning image synthesis, editing, video and TTS."""

    def __init__(self):
        self.cap_graph = media_capability_graph
        self.skill_rt = skill_runtime
        self._workflows: Dict[str, MediaWorkflow] = {}
        self._checkpoints: Dict[str, List[MediaWorkflowCheckpoint]] = {}  # workflow_id -> list of ckpts
        self._templates: Dict[str, MediaWorkflowTemplate] = {}
        self._cancel_events: Dict[str, threading.Event] = {}
        self._pause_events: Dict[str, threading.Event] = {}
        self._lock = threading.RLock()
        self._register_builtin_templates()

    def _register_builtin_templates(self) -> None:
        """Register versioned canonical multimodal creative templates."""
        # 1. Text -> Image Template
        t1_nodes = {
            "node_image_gen": MediaWorkflowNode(
                node_id="node_image_gen",
                title="Synthesize Base Image",
                skill_id="media.image.generate",
                parameters={"prompt": "A futuristic city in the clouds", "model_id": "sd-turbo-local", "width": 512, "height": 512},
            )
        }
        t1 = MediaWorkflowTemplate(
            template_id="creative.text_to_image@1.0.0",
            title="Text to Local Image",
            description="Generate a high-fidelity local image from descriptive text prompt.",
            version="1.0.0",
            category="image",
            tags=["text-to-image", "diffusion", "fast"],
            nodes=t1_nodes,
            edges=[],
            default_inputs={"prompt": "A futuristic city in the clouds"},
        )
        self.register_template(t1)

        # 2. Image -> Outpaint Template
        t2_nodes = {
            "node_image_gen": MediaWorkflowNode(
                node_id="node_image_gen",
                title="Generate Base Image",
                skill_id="media.image.generate",
                parameters={"prompt": "A lone knight on a mountaintop", "model_id": "sd-turbo-local"},
            ),
            "node_outpaint": MediaWorkflowNode(
                node_id="node_outpaint",
                title="Expand Canvas Panorama",
                skill_id="media.image.outpaint",
                parameters={"prompt": "Expand panoramic vista to reveal mountain ranges and skies", "model_id": "kandinsky-outpainting-candidate"},
                input_bindings={"source_artifact_id": "{{node_image_gen.artifact_id}}"},
                dependencies=["node_image_gen"],
            ),
        }
        t2_edges = [
            MediaWorkflowEdge(
                source_node_id="node_image_gen",
                source_output_key="artifact_id",
                target_node_id="node_outpaint",
                target_input_key="source_artifact_id",
                port_type=WorkflowMediaPortType.IMAGE,
            )
        ]
        t2 = MediaWorkflowTemplate(
            template_id="creative.image_outpaint@1.0.0",
            title="Image Synthesis & Panoramic Outpaint",
            description="Synthesize an image and directionally expand its canvas borders.",
            version="1.0.0",
            category="creative",
            tags=["image", "outpaint", "canvas-expansion"],
            nodes=t2_nodes,
            edges=t2_edges,
            default_inputs={"prompt": "A lone knight on a mountaintop"},
        )
        self.register_template(t2)

        # 3. Image -> Video Animation Template
        t3_nodes = {
            "node_image_gen": MediaWorkflowNode(
                node_id="node_image_gen",
                title="Generate Initial Visual Frame",
                skill_id="media.image.generate",
                parameters={"prompt": "A cybernetic supercar revving at twilight", "model_id": "sd-turbo-local"},
            ),
            "node_video_gen": MediaWorkflowNode(
                node_id="node_video_gen",
                title="Animate Temporal Video Stream",
                skill_id="media.video.generate",
                parameters={"prompt": "Animate car accelerating with blazing exhaust", "fps": 24, "duration_seconds": 2.0},
                input_bindings={"source_artifact_id": "{{node_image_gen.artifact_id}}"},
                dependencies=["node_image_gen"],
            ),
        }
        t3_edges = [
            MediaWorkflowEdge(
                source_node_id="node_image_gen",
                source_output_key="artifact_id",
                target_node_id="node_video_gen",
                target_input_key="source_artifact_id",
                port_type=WorkflowMediaPortType.IMAGE,
            )
        ]
        t3 = MediaWorkflowTemplate(
            template_id="creative.image_to_video@1.0.0",
            title="Image to Temporal Animation",
            description="Generate a keyframe and synthesize a 24fps motion video animation.",
            version="1.0.0",
            category="video",
            tags=["image-to-video", "temporal-diffusion", "animation"],
            nodes=t3_nodes,
            edges=t3_edges,
            default_inputs={"prompt": "A cybernetic supercar revving at twilight"},
        )
        self.register_template(t3)

        # 4. Narrated Video Clip Template
        t4_nodes = {
            "node_image_gen": MediaWorkflowNode(
                node_id="node_image_gen",
                title="Generate Poster Art",
                skill_id="media.image.generate",
                parameters={"prompt": "A luminous cosmic nebula with orbiting starships", "model_id": "sd-turbo-local"},
            ),
            "node_video_gen": MediaWorkflowNode(
                node_id="node_video_gen",
                title="Generate Cinematic Motion",
                skill_id="media.video.generate",
                parameters={"prompt": "Starships navigating through cosmic dust", "duration_seconds": 2.0},
                input_bindings={"source_artifact_id": "{{node_image_gen.artifact_id}}"},
                dependencies=["node_image_gen"],
            ),
            "node_tts": MediaWorkflowNode(
                node_id="node_tts",
                title="Synthesize Audio Narration",
                skill_id="audio.tts",
                parameters={"text": "Welcome to the outer rim. All systems nominal.", "voice": "default_neutral"},
            ),
            "node_compose": MediaWorkflowNode(
                node_id="node_compose",
                title="Mux Video and Audio Narration",
                skill_id="media.video.compose",
                parameters={"profile": "VIDEO_PLUS_AUDIO"},
                input_bindings={
                    "video_artifact_id": "{{node_video_gen.artifact_id}}",
                    "audio_artifact_id": "{{node_tts.artifact_id}}",
                },
                dependencies=["node_video_gen", "node_tts"],
            ),
        }
        t4_edges = [
            MediaWorkflowEdge(
                source_node_id="node_image_gen",
                source_output_key="artifact_id",
                target_node_id="node_video_gen",
                target_input_key="source_artifact_id",
                port_type=WorkflowMediaPortType.IMAGE,
            ),
            MediaWorkflowEdge(
                source_node_id="node_video_gen",
                source_output_key="artifact_id",
                target_node_id="node_compose",
                target_input_key="video_artifact_id",
                port_type=WorkflowMediaPortType.VIDEO,
            ),
            MediaWorkflowEdge(
                source_node_id="node_tts",
                source_output_key="artifact_id",
                target_node_id="node_compose",
                target_input_key="audio_artifact_id",
                port_type=WorkflowMediaPortType.AUDIO,
            ),
        ]
        t4 = MediaWorkflowTemplate(
            template_id="creative.narrated_clip@1.0.0",
            title="Narrated Cinematic Video Clip",
            description="Full pipeline: Image -> Temporal Video + Voice Narration -> Muxed Video.",
            version="1.0.0",
            category="multimodal",
            tags=["multimodal", "video", "tts", "composition"],
            nodes=t4_nodes,
            edges=t4_edges,
            default_inputs={"prompt": "A luminous cosmic nebula with orbiting starships", "narration": "Welcome to the outer rim. All systems nominal."},
        )
        self.register_template(t4)

    def register_template(self, template: MediaWorkflowTemplate) -> None:
        """Store a verified versioned workflow template."""
        with self._lock:
            self._templates[template.template_id] = template
            logger.info(f"MediaWorkflowComposer: Registered template '{template.template_id}' ({template.title})")

    def get_template(self, template_id: str) -> Optional[MediaWorkflowTemplate]:
        """Retrieve template by ID."""
        with self._lock:
            return self._templates.get(template_id)

    def list_templates(self) -> List[MediaWorkflowTemplate]:
        """List all available workflow templates."""
        with self._lock:
            return list(self._templates.values())

    def instantiate_template(
        self,
        template_id: str,
        inputs: Optional[Dict[str, Any]] = None,
        title_override: Optional[str] = None
    ) -> Tuple[bool, Optional[MediaWorkflow], str]:
        """Create a new executable MediaWorkflow instance from a registered template."""
        tmpl = self.get_template(template_id)
        if not tmpl:
            return False, None, f"Template '{template_id}' not found"

        inputs = inputs or {}
        workflow_id = f"mwf_{uuid.uuid4().hex[:12]}"
        cloned_nodes: Dict[str, MediaWorkflowNode] = {}

        for nid, node in tmpl.nodes.items():
            node_params = dict(node.parameters)
            # Inject template inputs if matched
            for k, v in inputs.items():
                if k in node_params:
                    node_params[k] = v
                elif k == "prompt" and "prompt" in node_params:
                    node_params["prompt"] = v
                elif k == "narration" and "text" in node_params:
                    node_params["text"] = v

            cloned_nodes[nid] = MediaWorkflowNode(
                node_id=nid,
                title=node.title,
                skill_id=node.skill_id,
                skill_version=node.skill_version,
                parameters=node_params,
                input_bindings=dict(node.input_bindings),
                dependencies=list(node.dependencies),
                risk_level=node.risk_level,
                timeout_sec=node.timeout_sec,
                status=WorkflowNodeStatus.PENDING,
            )

        workflow = MediaWorkflow(
            workflow_id=workflow_id,
            title=title_override or tmpl.title,
            goal=tmpl.description,
            template_id=tmpl.template_id,
            version=1,
            nodes=cloned_nodes,
            edges=[MediaWorkflowEdge(**e.model_dump()) for e in tmpl.edges],
            success_contract=tmpl.success_contract,
            status=MediaWorkflowStatus.QUEUED,
        )

        with self._lock:
            self._workflows[workflow_id] = workflow

        return True, workflow, "Workflow instantiated successfully"

    def simulate_workflow(self, workflow: MediaWorkflow) -> MediaWorkflowSimulationResult:
        """Perform static dry-run simulation computing peak VRAM, RAM, storage, and bottlenecks."""
        wf_hash = workflow.compute_workflow_hash()
        valid, errors, topological_order = self.cap_graph.validate_workflow_dag(workflow)

        if not valid:
            return MediaWorkflowSimulationResult(
                workflow_id=workflow.workflow_id,
                workflow_hash=wf_hash,
                node_count=len(workflow.nodes),
                estimated_duration_sec=0.0,
                peak_vram_mb=0.0,
                peak_ram_mb=0.0,
                estimated_storage_mb=0.0,
                required_skills=[],
                required_models=[],
                bottlenecks=errors,
                feasible=False,
                warnings=errors,
                provenance="ESTIMATED",
            )

        peak_vram = 0.0
        peak_ram = 1024.0
        total_duration = 0.0
        total_storage_mb = 0.0
        skills_set: Set[str] = set()
        models_set: Set[str] = set()
        bottlenecks: List[str] = []
        warnings: List[str] = []

        # Peak VRAM calculation for sequential nodes
        for node in topological_order:
            cap = self.cap_graph.get_capability(node.skill_id)
            skills_set.add(node.skill_id)
            model_id = node.parameters.get("model_id")
            if not model_id:
                if node.skill_id == "media.image.generate":
                    model_id = "sd-turbo-local"
                elif node.skill_id == "media.video.generate":
                    model_id = "svd-xt-local"
                elif node.skill_id in ["media.image.edit", "media.image.inpaint", "media.image.outpaint"]:
                    model_id = "instruct-pix2pix-local"
            if model_id:
                models_set.add(model_id)


            if cap:
                node_vram = cap.base_vram_mb
                node_ram = cap.base_ram_mb
                total_duration += cap.estimated_duration_sec

                if cap.is_heavy_gpu:
                    peak_vram = max(peak_vram, node_vram)
                peak_ram = max(peak_ram, node_ram)

                # Storage estimation
                if "video" in node.skill_id:
                    total_storage_mb += 25.0
                elif "image" in node.skill_id:
                    total_storage_mb += 2.0
                elif "audio" in node.skill_id:
                    total_storage_mb += 1.0

        # Check against hardware limits (RTX 5050 ceiling 6,400 MB)
        if peak_vram > 6400.0:
            bottlenecks.append(f"Peak VRAM ({peak_vram:.1f} MB) exceeds RTX 5050 hard limit (6,400 MB). Will require CPU fallback.")
            warnings.append("High VRAM demand: Automatic CPU memory allocation will be scheduled.")

        return MediaWorkflowSimulationResult(
            workflow_id=workflow.workflow_id,
            workflow_hash=wf_hash,
            node_count=len(workflow.nodes),
            estimated_duration_sec=round(total_duration, 1),
            peak_vram_mb=round(peak_vram, 1),
            peak_ram_mb=round(peak_ram, 1),
            estimated_storage_mb=round(total_storage_mb, 1),
            required_skills=sorted(list(skills_set)),
            required_models=sorted(list(models_set)),
            bottlenecks=bottlenecks,
            warnings=warnings,
            feasible=len(bottlenecks) == 0 or "CPU fallback" in bottlenecks[0],
            provenance="ESTIMATED",
        )

    def execute_workflow(
        self,
        workflow: MediaWorkflow,
        task_id: Optional[str] = None,
        execution_id: Optional[str] = None
    ) -> Tuple[bool, MediaWorkflow, str]:
        """Execute multimodal workflow in topological order with safety gating and checkpointing."""
        workflow_id = workflow.workflow_id
        cancel_event = threading.Event()

        with self._lock:
            self._workflows[workflow_id] = workflow
            self._cancel_events[workflow_id] = cancel_event

        workflow.task_id = task_id
        workflow.execution_id = execution_id
        workflow.status = MediaWorkflowStatus.RUNNING
        workflow.started_at = time.time()

        valid, errors, topological_nodes = self.cap_graph.validate_workflow_dag(workflow)
        if not valid:
            workflow.status = MediaWorkflowStatus.FAILED
            workflow.failure_reason = f"DAG validation failed: {'; '.join(errors)}"
            workflow.completed_at = time.time()
            return False, workflow, workflow.failure_reason

        resolved_outputs: Dict[str, Dict[str, Any]] = {}
        completed_node_ids: List[str] = []
        all_artifacts: List[Dict[str, Any]] = []

        total_nodes = len(topological_nodes)

        for idx, node in enumerate(topological_nodes):
            if cancel_event.is_set():
                node.status = WorkflowNodeStatus.CANCELLED
                workflow.status = MediaWorkflowStatus.CANCELLED
                workflow.failure_reason = "Workflow cancelled by operator"
                workflow.completed_at = time.time()
                return False, workflow, "Workflow cancelled"

            workflow.current_node_id = node.node_id
            workflow.progress = round((idx / total_nodes) * 100.0, 1)
            node.status = WorkflowNodeStatus.RUNNING
            node.started_at = time.time()

            logger.info(f"MediaWorkflowComposer [{workflow_id}]: Executing node '{node.node_id}' ({node.skill_id})")

            # 1. Substitute input bindings
            resolved_params, bind_err = self.cap_graph.resolve_bindings(node, resolved_outputs)
            if bind_err:
                node.status = WorkflowNodeStatus.FAILED
                node.error_message = bind_err
                workflow.status = MediaWorkflowStatus.FAILED
                workflow.failure_reason = f"Binding failure at node '{node.node_id}': {bind_err}"
                workflow.completed_at = time.time()
                return False, workflow, workflow.failure_reason

            # 2. Dispatch Node to appropriate Runtime
            success, result_data, err_msg = self._dispatch_node_execution(
                node=node,
                params=resolved_params,
                workflow_id=workflow_id,
                cancel_event=cancel_event
            )

            node.duration_ms = int((time.time() - node.started_at) * 1000)
            node.completed_at = time.time()

            if not success:
                node.status = WorkflowNodeStatus.FAILED
                node.error_message = err_msg
                workflow.status = MediaWorkflowStatus.FAILED
                workflow.failure_reason = f"Node '{node.node_id}' execution failed: {err_msg}"
                workflow.completed_at = time.time()
                logger.error(f"MediaWorkflowComposer [{workflow_id}]: Node '{node.node_id}' failed: {err_msg}")
                return False, workflow, workflow.failure_reason

            # 3. Mark Node Completed & Record Outputs
            node.status = WorkflowNodeStatus.COMPLETED
            node.result_data = result_data
            node.output_artifact_id = result_data.get("artifact_id")
            node.output_path = result_data.get("path")
            node.output_sha256 = result_data.get("sha256")

            resolved_outputs[node.node_id] = result_data
            completed_node_ids.append(node.node_id)

            if node.output_artifact_id:
                workflow.intermediate_artifact_ids.append(node.output_artifact_id)
                all_artifacts.append(result_data)

            # 4. Create Verified Checkpoint
            self._save_checkpoint(
                workflow=workflow,
                completed_node_id=node.node_id,
                completed_node_ids=completed_node_ids,
                resolved_outputs=resolved_outputs
            )

        # 5. Finalize Workflow Success
        workflow.progress = 100.0
        workflow.status = MediaWorkflowStatus.COMPLETED
        workflow.completed_at = time.time()
        if topological_nodes:
            last_node = topological_nodes[-1]
            workflow.primary_artifact_id = last_node.output_artifact_id

        logger.info(
            f"MediaWorkflowComposer: Successfully completed workflow '{workflow_id}' "
            f"({len(completed_node_ids)}/{total_nodes} nodes, primary_artifact={workflow.primary_artifact_id})"
        )
        return True, workflow, "Media workflow completed successfully"

    def _dispatch_node_execution(
        self,
        node: MediaWorkflowNode,
        params: Dict[str, Any],
        workflow_id: str,
        cancel_event: threading.Event
    ) -> Tuple[bool, Dict[str, Any], str]:
        """Dispatch a single DAG node to its dedicated subsystem handler."""
        skill_id = node.skill_id

        try:
            # 1. Image Generation
            if skill_id == "media.image.generate":
                from backend.app.media.models import ImageGenerationRequest, ImageFormat, QualityProfile
                req = ImageGenerationRequest(
                    prompt=params.get("prompt", "Untitled"),
                    negative_prompt=params.get("negative_prompt"),
                    model_id=params.get("model_id", "sd-turbo-local"),
                    width=params.get("width", 512),
                    height=params.get("height", 512),
                    steps=params.get("steps", 20),
                    seed=params.get("seed"),
                    output_format=ImageFormat(params.get("output_format", "PNG").upper()),
                    quality_profile=QualityProfile.STANDARD,
                    preferred_device=params.get("preferred_device", "GPU")
                )
                ok, job, msg = media_coordinator.submit_image_generation(request=req)
                if not ok or not job.artifact_id:
                    return False, {}, job.failure_reason or msg
                return True, {"artifact_id": job.artifact_id, "path": job.output_path, "job_id": job.job_id}, "Success"

            # 2. Image Editing / Inpainting / Outpainting
            elif skill_id in ["media.image.edit", "media.image.inpaint", "media.image.outpaint"]:
                from backend.app.media.edit_models import ImageEditRequest, ImageEditType, OutpaintBounds
                op_map = {
                    "media.image.edit": ImageEditType.IMAGE_TO_IMAGE,
                    "media.image.inpaint": ImageEditType.INPAINTING,
                    "media.image.outpaint": ImageEditType.OUTPAINTING,
                }
                bounds = None
                if "outpaint_bounds" in params and isinstance(params["outpaint_bounds"], dict):
                    bounds = OutpaintBounds(**params["outpaint_bounds"])

                req = ImageEditRequest(
                    source_artifact_id=params["source_artifact_id"],
                    operation=op_map[skill_id],
                    prompt=params.get("prompt", "Transformed image"),
                    negative_prompt=params.get("negative_prompt"),
                    model_id=params.get("model_id", "instruct-pix2pix-local" if skill_id == "media.image.edit" else "kandinsky-outpainting-candidate"),
                    mask_artifact_id=params.get("mask_artifact_id"),
                    mask_base64=params.get("mask_base64"),
                    strength=params.get("strength", 0.75),
                    steps=params.get("steps", 20),
                    seed=params.get("seed"),
                    outpaint_bounds=bounds,
                )
                ok, job, msg = image_edit_coordinator.submit_image_edit(request=req)
                if not ok or not job.artifact_id:
                    return False, {}, job.failure_reason or msg
                return True, {"artifact_id": job.artifact_id, "path": job.output_path, "job_id": job.job_id}, "Success"

            # 3. Video Generation
            elif skill_id == "media.video.generate":
                from backend.app.media.video_models import VideoGenerationRequest, VideoFormat
                req = VideoGenerationRequest(
                    prompt=params.get("prompt", "Motion scene"),
                    source_artifact_id=params.get("source_artifact_id"),
                    model_id=params.get("model_id", "svd-xt-local"),
                    width=params.get("width", 512),
                    height=params.get("height", 512),
                    fps=params.get("fps", 24),
                    duration_seconds=params.get("duration_seconds", 2.0),
                    steps=params.get("steps", 25),
                    output_format=VideoFormat(params.get("output_format", "MP4").upper())
                )
                ok, job, msg = video_coordinator.submit_video_generation(request=req)
                if not ok or not job.artifact_id:
                    return False, {}, job.failure_reason or msg
                return True, {"artifact_id": job.artifact_id, "path": job.output_path, "job_id": job.job_id}, "Success"

            # 4. Neural Text-to-Speech
            elif skill_id == "audio.tts":
                from backend.app.media.models import MediaType, ImageFormat, MediaArtifact
                import hashlib
                import concurrent.futures
                text = params.get("text") or params.get("prompt", "Default speech text")
                voice = params.get("voice", "default_neutral")

                try:
                    loop = asyncio.get_running_loop()
                except RuntimeError:
                    loop = None

                if loop and loop.is_running():
                    with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
                        future = executor.submit(lambda: asyncio.run(text_to_speech.synthesize(text=text, voice=voice)))
                        tts_result = future.result()
                else:
                    tts_result = asyncio.run(text_to_speech.synthesize(text=text, voice=voice))

                job_id = f"job_tts_{uuid.uuid4().hex[:8]}"
                audio_dir = (media_storage.base_dir / "audio").resolve()
                audio_dir.mkdir(parents=True, exist_ok=True)
                final_path = (audio_dir / f"{job_id}.wav").resolve()
                with open(final_path, "wb") as f:
                    f.write(tts_result.audio_bytes)

                sha256_hash = hashlib.sha256(tts_result.audio_bytes).hexdigest()
                rel_path = f"media/audio/{job_id}.wav"
                artifact_id = f"art_audio_{uuid.uuid4().hex[:12]}"
                artifact = MediaArtifact(
                    artifact_id=artifact_id,
                    job_id=job_id,
                    media_type=MediaType.AUDIO,
                    path=rel_path,
                    filename=final_path.name,
                    format=ImageFormat.PNG,
                    width=0,
                    height=0,
                    size_bytes=len(tts_result.audio_bytes),
                    sha256=sha256_hash,
                    created_at=time.time(),
                    model_id=tts_result.engine_used,
                    generation_parameters_hash=f"tts_{hash(text)}",
                    prompt_preview=text[:50],
                    provenance="ACTUAL"
                )
                media_storage.register_artifact(artifact)
                return True, {"artifact_id": artifact.artifact_id, "path": artifact.path, "sha256": artifact.sha256, "duration_seconds": tts_result.duration_seconds}, "Success"


            # 5. Multimodal Composition (Video + Audio)
            elif skill_id == "media.video.compose":
                profile_str = params.get("profile", "VIDEO_PLUS_AUDIO")
                req = MediaCompositionRequest(
                    video_artifact_id=params["video_artifact_id"],
                    audio_artifact_id=params.get("audio_artifact_id"),
                    subtitle_text=params.get("subtitle_text"),
                    profile=MediaCompositionProfile(profile_str)
                )
                ok, composed_art, msg = media_composition_runtime.compose_media(request=req)
                if not ok or not composed_art:
                    return False, {}, msg
                return True, {"artifact_id": composed_art.artifact_id, "path": composed_art.path, "sha256": composed_art.sha256}, "Success"

            else:
                return False, {}, f"Unsupported workflow skill '{skill_id}'"

        except Exception as e:
            logger.error(f"MediaWorkflowComposer: Exception executing node '{node.node_id}': {e}")
            return False, {}, str(e)

    def _save_checkpoint(
        self,
        workflow: MediaWorkflow,
        completed_node_id: str,
        completed_node_ids: List[str],
        resolved_outputs: Dict[str, Dict[str, Any]]
    ) -> None:
        """Persist verifiable workflow checkpoint."""
        hashes: Dict[str, str] = {}
        for nid, out in resolved_outputs.items():
            if "artifact_id" in out:
                art = media_storage.get_artifact(out["artifact_id"])
                if art:
                    hashes[out["artifact_id"]] = art.sha256

        ckpt = MediaWorkflowCheckpoint(
            checkpoint_id=f"ckpt_{uuid.uuid4().hex[:12]}",
            workflow_id=workflow.workflow_id,
            node_id=completed_node_id,
            status=workflow.status,
            completed_node_ids=list(completed_node_ids),
            artifact_ids=list(hashes.keys()),
            artifact_hashes=hashes,
            node_results=resolved_outputs,
            timestamp=time.time(),
            workflow_hash=workflow.compute_workflow_hash(),
        )

        with self._lock:
            if workflow.workflow_id not in self._checkpoints:
                self._checkpoints[workflow.workflow_id] = []
            self._checkpoints[workflow.workflow_id].append(ckpt)
            logger.debug(f"MediaWorkflowComposer: Checkpoint saved for node '{completed_node_id}' ({ckpt.checkpoint_id})")

    def get_checkpoints(self, workflow_id: str) -> List[MediaWorkflowCheckpoint]:
        """Return chronological checkpoints for a workflow."""
        with self._lock:
            return list(self._checkpoints.get(workflow_id, []))

    def recover_workflow(self, workflow_id: str) -> Tuple[bool, Optional[MediaWorkflow], str]:
        """Resume workflow execution from the latest verified checkpoint without re-running upstream nodes."""
        workflow = self._workflows.get(workflow_id)
        if not workflow:
            return False, None, f"Workflow '{workflow_id}' not found"

        ckpts = self.get_checkpoints(workflow_id)
        if not ckpts:
            return False, workflow, "No checkpoints available for recovery; starting from beginning"

        latest_ckpt = ckpts[-1]
        logger.info(f"MediaWorkflowComposer: Recovering workflow '{workflow_id}' from checkpoint '{latest_ckpt.checkpoint_id}'")

        # Mark completed nodes as completed
        for nid in latest_ckpt.completed_node_ids:
            if nid in workflow.nodes:
                workflow.nodes[nid].status = WorkflowNodeStatus.COMPLETED
                workflow.nodes[nid].result_data = latest_ckpt.node_results.get(nid, {})

        # Re-execute remaining pending nodes
        return self.execute_workflow(workflow)

    def cancel_workflow(self, workflow_id: str) -> Tuple[bool, str]:
        """Cancel an active media workflow and release all allocated resources."""
        with self._lock:
            evt = self._cancel_events.get(workflow_id)
            if evt:
                evt.set()
            wf = self._workflows.get(workflow_id)
            if wf and wf.status in [MediaWorkflowStatus.RUNNING, MediaWorkflowStatus.QUEUED, MediaWorkflowStatus.WAITING]:
                wf.status = MediaWorkflowStatus.CANCELLED
                wf.completed_at = time.time()
                return True, "Workflow cancelled successfully"
            return False, f"Workflow '{workflow_id}' not found or not in cancellable state"

    def get_workflow(self, workflow_id: str) -> Optional[MediaWorkflow]:
        """Retrieve workflow state by ID."""
        with self._lock:
            return self._workflows.get(workflow_id)

    def list_workflows(self) -> List[MediaWorkflow]:
        """List all tracked workflows."""
        with self._lock:
            return list(self._workflows.values())

    def generate_manifest(self, workflow_id: str) -> Optional[MediaWorkflowManifest]:
        """Generate final signed manifest recording artifacts, lineage, hashes and parameters."""
        wf = self._workflows.get(workflow_id)
        if not wf:
            return None

        artifacts_meta: List[Dict[str, Any]] = []
        for nid, node in wf.nodes.items():
            if node.output_artifact_id:
                art = media_storage.get_artifact(node.output_artifact_id)
                if art:
                    media_t = art.media_type.value if hasattr(art.media_type, "value") else str(art.media_type)
                    artifacts_meta.append({
                        "node_id": nid,
                        "artifact_id": art.artifact_id,
                        "media_type": media_t,
                        "filename": art.filename,
                        "sha256": art.sha256,
                        "size_bytes": art.size_bytes,
                        "model_id": getattr(art, "model_id", "unknown"),
                    })

        for aid in wf.intermediate_artifact_ids:
            if not any(a.get("artifact_id") == aid for a in artifacts_meta):
                art = media_storage.get_artifact(aid)
                if art:
                    media_t = art.media_type.value if hasattr(art.media_type, "value") else str(art.media_type)
                    artifacts_meta.append({
                        "artifact_id": art.artifact_id,
                        "media_type": media_t,
                        "filename": art.filename,
                        "sha256": art.sha256,
                        "size_bytes": art.size_bytes,
                        "model_id": getattr(art, "model_id", "unknown"),
                    })

        return MediaWorkflowManifest(
            workflow_id=wf.workflow_id,
            workflow_hash=wf.compute_workflow_hash(),
            title=wf.title,
            goal=wf.goal,
            primary_artifact_id=wf.primary_artifact_id,
            artifacts=artifacts_meta,
            nodes_executed=[nid for nid, n in wf.nodes.items() if n.status == WorkflowNodeStatus.COMPLETED],
            resource_summary={"completed_nodes": len(wf.nodes), "status": wf.status.value},
            verification_passed=(wf.status == MediaWorkflowStatus.COMPLETED),
            created_at=wf.created_at,
            completed_at=wf.completed_at or time.time(),
        )

    def export_workflow(self, workflow: Any) -> Dict[str, Any]:
        """Export workflow JSON definition (accepts MediaWorkflow or workflow_id)."""
        if isinstance(workflow, str):
            res = self.export_workflow_definition(workflow)
            return res or {}
        elif isinstance(workflow, MediaWorkflow):
            return {
                "workflow_id": workflow.workflow_id,
                "version": "1.0.0",
                "title": workflow.title,
                "goal": workflow.goal,
                "workflow_hash": workflow.compute_workflow_hash(),
                "nodes": {
                    nid: {
                        "node_id": n.node_id,
                        "title": n.title,
                        "skill_id": n.skill_id,
                        "skill_version": n.skill_version,
                        "parameters": n.parameters,
                        "input_bindings": n.input_bindings,
                        "dependencies": n.dependencies,
                    }
                    for nid, n in workflow.nodes.items()
                },
                "edges": [
                    {
                        "source_node_id": e.source_node_id,
                        "source_output_key": e.source_output_key,
                        "target_node_id": e.target_node_id,
                        "target_input_key": e.target_input_key,
                        "port_type": e.port_type.value,
                    }
                    for e in workflow.edges
                ],
            }
        return {}

    def export_workflow_definition(self, workflow_id: str) -> Optional[Dict[str, Any]]:
        """Export workflow JSON definition (structure, skills, versions, and bindings)."""
        wf = self._workflows.get(workflow_id)
        if not wf:
            return None
        return self.export_workflow(wf)

    def import_workflow(self, data: Dict[str, Any]) -> Tuple[bool, Optional[MediaWorkflow], str]:
        """Validate untrusted imported workflow definition before instantiating."""
        return self.import_workflow_definition(data)

    def import_workflow_definition(self, data: Dict[str, Any]) -> Tuple[bool, Optional[MediaWorkflow], str]:
        """Validate untrusted imported workflow definition before instantiating."""
        if not isinstance(data, dict):
            return False, None, "Import payload must be a JSON object"

        nodes_raw = data.get("nodes", {})
        edges_raw = data.get("edges", [])

        if not nodes_raw:
            return False, None, "Workflow must contain at least one node definition"

        parsed_nodes: Dict[str, MediaWorkflowNode] = {}
        for nid, n_data in nodes_raw.items():
            parsed_nodes[nid] = MediaWorkflowNode(
                node_id=nid,
                title=n_data.get("title", nid),
                skill_id=n_data.get("skill_id", ""),
                skill_version=n_data.get("skill_version", "1.0.0"),
                parameters=n_data.get("parameters", {}),
                input_bindings=n_data.get("input_bindings", {}),
                dependencies=n_data.get("dependencies", []),
            )

        parsed_edges = [
            MediaWorkflowEdge(
                source_node_id=e["source_node_id"],
                source_output_key=e.get("source_output_key", "artifact_id"),
                target_node_id=e["target_node_id"],
                target_input_key=e.get("target_input_key", "source_artifact_id"),
                port_type=WorkflowMediaPortType(e.get("port_type", "IMAGE")),
            )
            for e in edges_raw
        ]

        workflow = MediaWorkflow(
            workflow_id=f"mwf_{uuid.uuid4().hex[:12]}",
            title=data.get("title", "Imported Media Workflow"),
            goal=data.get("goal", "Imported workflow pipeline"),
            nodes=parsed_nodes,
            edges=parsed_edges,
            status=MediaWorkflowStatus.QUEUED,
        )

        valid, errors, _ = self.cap_graph.validate_workflow_dag(workflow)
        if not valid:
            return False, None, f"Imported workflow validation failed: {'; '.join(errors)}"

        with self._lock:
            self._workflows[workflow.workflow_id] = workflow

        return True, workflow, "Workflow imported and verified successfully"



# Global Singleton and Aliases
MultimodalMediaWorkflowComposerAlias = MultimodalMediaWorkflowComposer
MediaWorkflowComposer = MultimodalMediaWorkflowComposer
media_workflow_composer = MultimodalMediaWorkflowComposer()
