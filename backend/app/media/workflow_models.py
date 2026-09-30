"""Phase 8 Stage 8.4 — Multimodal Media Workflow Models, Contracts & Templates.

Governs:
- Immutable MediaWorkflow & MediaWorkflowNode Contracts
- Media DAG Edge Bindings & Typed Variable Substitution
- Capability Graph Primitives & Media Compatibility Rules
- Checkpointing, Recovery, and Replay Metadata
- Deterministic Workflow Manifests & Cryptographic Hashing
"""

from enum import Enum
import hashlib
import json
import time
import uuid
from typing import Any, Dict, List, Optional, Set
from pydantic import BaseModel, Field

from backend.app.media.models import MediaType, ImageFormat
from backend.app.media.video_models import VideoFormat
from backend.app.media.edit_models import ImageEditType
from backend.app.services.skills.models import SkillRiskLevel

WorkflowRiskLevel = SkillRiskLevel


class WorkflowRetentionPolicy(str, Enum):
    """Artifact retention policy for intermediate workflow outputs."""
    KEEP_ALL = "KEEP_ALL"
    KEEP_FINAL_AND_SOURCES = "KEEP_FINAL_AND_SOURCES"
    KEEP_FINAL_ONLY = "KEEP_FINAL_ONLY"


class WorkflowMediaPortType(str, Enum):
    """Data and artifact types transported across workflow node connectors."""
    TEXT = "TEXT"
    IMAGE = "IMAGE"
    MASK = "MASK"
    VIDEO = "VIDEO"
    AUDIO = "AUDIO"
    SUBTITLES = "SUBTITLES"
    METADATA = "METADATA"
    ANY = "ANY"


class MediaWorkflowStatus(str, Enum):
    """Lifecycle states of an orchestrated multimodal media workflow."""
    QUEUED = "QUEUED"
    ADMITTED = "ADMITTED"
    RUNNING = "RUNNING"
    WAITING = "WAITING"
    BLOCKED = "BLOCKED"
    PARTIALLY_COMPLETED = "PARTIALLY_COMPLETED"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"
    RESOURCE_DENIED = "RESOURCE_DENIED"


class WorkflowNodeStatus(str, Enum):
    """Lifecycle status of a single media DAG node."""
    PENDING = "PENDING"
    READY = "READY"
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    SKIPPED = "SKIPPED"
    BLOCKED = "BLOCKED"
    CANCELLED = "CANCELLED"


class MediaCompositionProfile(str, Enum):
    """Fixed allowlisted media composition modes (strict command-injection defense)."""
    VIDEO_ONLY = "VIDEO_ONLY"
    VIDEO_PLUS_AUDIO = "VIDEO_PLUS_AUDIO"
    VIDEO_PLUS_AUDIO_SUBTITLES = "VIDEO_PLUS_AUDIO_SUBTITLES"
    IMAGE_SEQUENCE_TO_VIDEO = "IMAGE_SEQUENCE_TO_VIDEO"


class MediaCapability(BaseModel):
    """Declared capability of a registered media processing skill."""
    skill_id: str
    skill_version: str = "1.0.0"
    operation_name: str
    input_port_types: List[WorkflowMediaPortType]
    output_port_types: List[WorkflowMediaPortType]
    description: str = ""
    is_heavy_gpu: bool = False
    base_vram_mb: float = 0.0
    base_ram_mb: float = 1024.0
    estimated_duration_sec: float = 5.0


class MediaWorkflowEdge(BaseModel):
    """Directed dependency and data binding between two workflow nodes."""
    edge_id: str = Field(default_factory=lambda: f"edge_{uuid.uuid4().hex[:8]}")
    source_node_id: str
    source_output_key: str = "artifact_id"
    target_node_id: str
    target_input_key: str = "source_artifact_id"
    port_type: WorkflowMediaPortType = WorkflowMediaPortType.IMAGE

    def __init__(self, **data: Any):
        if "source_port" in data and "source_output_key" not in data:
            data["source_output_key"] = data.pop("source_port")
        if "target_port" in data and "target_input_key" not in data:
            data["target_input_key"] = data.pop("target_port")
        super().__init__(**data)


class MediaWorkflowNode(BaseModel):
    """A single executable step in a multimodal media workflow."""
    node_id: str
    title: str = ""
    skill_id: str
    skill_version: str = "1.0.0"
    parameters: Dict[str, Any] = Field(default_factory=dict)
    input_bindings: Dict[str, Any] = Field(
        default_factory=dict,
        description="Maps input parameter name to template variable, e.g. {'source_artifact_id': '{{node_1.artifact_id}}'}"
    )
    output_bindings: Dict[str, str] = Field(default_factory=dict)
    dependencies: List[str] = Field(default_factory=list)
    risk_level: SkillRiskLevel = SkillRiskLevel.LOW
    timeout_sec: float = 120.0
    status: WorkflowNodeStatus = WorkflowNodeStatus.PENDING
    job_id: Optional[str] = None
    output_artifact_id: Optional[str] = None
    output_path: Optional[str] = None
    output_sha256: Optional[str] = None
    result_data: Dict[str, Any] = Field(default_factory=dict)
    error_message: Optional[str] = None
    started_at: Optional[float] = None
    completed_at: Optional[float] = None
    duration_ms: int = 0
    estimated_vram_mb: float = 0.0
    estimated_ram_mb: float = 512.0


class MediaWorkflowSuccessContract(BaseModel):
    """Verifiable conditions defining complete workflow success."""
    required_output_keys: List[str] = Field(default_factory=lambda: ["primary_artifact_id"])
    required_media_types: List[WorkflowMediaPortType] = Field(default_factory=lambda: [WorkflowMediaPortType.IMAGE])
    require_hash_verification: bool = True
    minimum_completed_nodes: int = 1


class MediaWorkflow(BaseModel):
    """An immutable, versioned multimodal media DAG workflow."""
    workflow_id: str = Field(default_factory=lambda: f"mwf_{uuid.uuid4().hex[:12]}")
    task_id: Optional[str] = None
    execution_id: Optional[str] = None
    title: str = "Untitled Media Workflow"
    goal: str = "Compose multimodal media"
    version: int = 1
    nodes: Dict[str, MediaWorkflowNode] = Field(default_factory=dict)
    edges: List[MediaWorkflowEdge] = Field(default_factory=list)
    template_id: Optional[str] = None
    resource_budget: Dict[str, float] = Field(default_factory=dict)
    policy_profile: Dict[str, Any] = Field(default_factory=dict)
    retention_policy: WorkflowRetentionPolicy = WorkflowRetentionPolicy.KEEP_ALL
    success_contract: MediaWorkflowSuccessContract = Field(default_factory=MediaWorkflowSuccessContract)
    status: MediaWorkflowStatus = MediaWorkflowStatus.QUEUED
    current_node_id: Optional[str] = None
    progress: float = 0.0
    created_at: float = Field(default_factory=time.time)
    started_at: Optional[float] = None
    completed_at: Optional[float] = None
    failure_reason: Optional[str] = None
    primary_artifact_id: Optional[str] = None
    intermediate_artifact_ids: List[str] = Field(default_factory=list)
    provenance: str = "ACTUAL"

    def __init__(self, **data: Any):
        if "nodes" in data and isinstance(data["nodes"], list):
            data["nodes"] = {n.node_id if isinstance(n, MediaWorkflowNode) else n["node_id"]: n for n in data["nodes"]}
        super().__init__(**data)

    def compute_workflow_hash(self) -> str:
        """Calculate deterministic SHA-256 hash representing the complete workflow structure and params."""
        canonical_dict = {
            "title": self.title,
            "goal": self.goal,
            "version": self.version,
            "nodes": {
                nid: {
                    "skill_id": n.skill_id,
                    "skill_version": n.skill_version,
                    "parameters": n.parameters,
                    "input_bindings": n.input_bindings,
                    "dependencies": sorted(n.dependencies),
                }
                for nid, n in sorted(self.nodes.items())
            },
            "edges": [
                {"src": e.source_node_id, "src_k": e.source_output_key, "dst": e.target_node_id, "dst_k": e.target_input_key}
                for e in sorted(self.edges, key=lambda x: (x.source_node_id, x.target_node_id))
            ],
        }
        canonical_json = json.dumps(canonical_dict, sort_keys=True)
        return hashlib.sha256(canonical_json.encode("utf-8")).hexdigest()

    def get_runnable_nodes(self) -> List[MediaWorkflowNode]:
        """Return nodes whose prerequisite dependencies have successfully completed."""
        runnable = []
        for node in self.nodes.values():
            if node.status != WorkflowNodeStatus.PENDING:
                continue
            deps_met = all(
                self.nodes[dep_id].status == WorkflowNodeStatus.COMPLETED
                for dep_id in node.dependencies
                if dep_id in self.nodes
            )
            if deps_met:
                runnable.append(node)
        return runnable


def calculate_workflow_hash(workflow: MediaWorkflow) -> str:
    """Calculate deterministic SHA-256 hash for workflow definition."""
    return workflow.compute_workflow_hash()



class MediaWorkflowCheckpoint(BaseModel):
    """Persisted verified checkpoint of a workflow execution state."""
    checkpoint_id: str = Field(default_factory=lambda: f"ckpt_{uuid.uuid4().hex[:12]}")
    workflow_id: str
    node_id: str
    status: MediaWorkflowStatus
    completed_node_ids: List[str]
    artifact_ids: List[str]
    artifact_hashes: Dict[str, str] = Field(default_factory=dict)
    node_results: Dict[str, Any] = Field(default_factory=dict)
    timestamp: float = Field(default_factory=time.time)
    workflow_hash: str


class MediaWorkflowSimulationResult(BaseModel):
    """Dry-run estimation of resources, duration, bottlenecks, and feasibility."""
    workflow_id: str
    workflow_hash: str
    node_count: int
    estimated_duration_sec: float
    peak_vram_mb: float
    peak_ram_mb: float
    estimated_storage_mb: float
    required_skills: List[str]
    required_models: List[str]
    bottlenecks: List[str] = Field(default_factory=list)
    feasible: bool = True
    warnings: List[str] = Field(default_factory=list)
    provenance: str = "ESTIMATED"

    @property
    def is_feasible(self) -> bool:
        return self.feasible

    @property
    def total_nodes(self) -> int:
        return self.node_count

    @property
    def estimated_peak_vram_mb(self) -> float:
        return self.peak_vram_mb

    @property
    def estimated_total_storage_mb(self) -> float:
        return self.estimated_storage_mb

    @property
    def estimated_duration_seconds(self) -> float:
        return self.estimated_duration_sec

    @property
    def risk_level(self) -> SkillRiskLevel:
        if not self.feasible:
            return SkillRiskLevel.CRITICAL
        if self.peak_vram_mb > 4000:
            return SkillRiskLevel.MEDIUM
        return SkillRiskLevel.LOW


class MediaWorkflowManifest(BaseModel):

    """Cryptographically verifiable final manifest packaging all workflow outputs."""
    manifest_id: str = Field(default_factory=lambda: f"mnf_{uuid.uuid4().hex[:12]}")
    workflow_id: str
    workflow_hash: str
    title: str
    goal: str
    primary_artifact_id: Optional[str] = None
    artifacts: List[Dict[str, Any]] = Field(default_factory=list)
    lineage_records: List[Dict[str, Any]] = Field(default_factory=list)
    nodes_executed: List[str] = Field(default_factory=list)
    resource_summary: Dict[str, Any] = Field(default_factory=dict)
    verification_passed: bool = True
    created_at: float = Field(default_factory=time.time)
    completed_at: float = Field(default_factory=time.time)


class MediaWorkflowTemplate(BaseModel):
    """Reusable, versioned multimodal workflow template."""
    template_id: str
    title: str
    description: str
    version: str = "1.0.0"
    category: str = "creative"
    tags: List[str] = Field(default_factory=list)
    nodes: Dict[str, MediaWorkflowNode]
    edges: List[MediaWorkflowEdge]
    default_inputs: Dict[str, Any] = Field(default_factory=dict)
    success_contract: MediaWorkflowSuccessContract = Field(default_factory=MediaWorkflowSuccessContract)
    is_builtin: bool = True


class MediaCompositionRequest(BaseModel):
    """Request to safely mux/compose video and audio streams into a final verified artifact."""
    video_artifact_id: str
    audio_artifact_id: Optional[str] = None
    subtitle_text: Optional[str] = None
    profile: MediaCompositionProfile = MediaCompositionProfile.VIDEO_PLUS_AUDIO
    output_format: VideoFormat = VideoFormat.MP4
    output_filename: Optional[str] = None
