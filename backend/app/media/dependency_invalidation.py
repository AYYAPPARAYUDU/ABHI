"""Phase 8 Stage 8.5 — Dependency Invalidation & Incremental Rebuild Engine.

Governs:
- Graph reachability analysis across Scenes, Assets, and Workflow Nodes
- Precise partial invalidation on revision (e.g. revise Scene 2 -> invalidates Scene 2 and downstream mux, preserves Scene 1, 3, and Audio)
- Incremental Rebuild Plans with estimated compute and GPU savings
"""

from collections import deque
import logging
from typing import Any, Dict, List, Set
from pydantic import BaseModel, Field

from backend.app.media.creative_models import CreativePipeline, Scene
from backend.app.media.workflow_models import MediaWorkflow, MediaWorkflowNode, MediaWorkflowEdge

logger = logging.getLogger(__name__)


class InvalidationPlan(BaseModel):
    """Result of dependency invalidation detailing affected and preserved components."""
    revised_target_id: str
    invalidated_scene_ids: List[str] = Field(default_factory=list)
    preserved_scene_ids: List[str] = Field(default_factory=list)
    invalidated_node_ids: List[str] = Field(default_factory=list)
    preserved_node_ids: List[str] = Field(default_factory=list)
    preserved_asset_ids: List[str] = Field(default_factory=list)
    estimated_gpu_savings_sec: float = Field(default=0.0)
    rebuild_required: bool = Field(default=True)


class DependencyInvalidationEngine:
    """Calculates downstream transitive closures to enable minimal incremental rebuilds."""

    def compute_workflow_invalidation(
        self,
        workflow: MediaWorkflow,
        modified_node_ids: Set[str],
    ) -> InvalidationPlan:
        """Finds all downstream nodes invalidated when specific nodes change."""
        # Build adjacency graph
        node_objs = list(workflow.nodes.values()) if isinstance(workflow.nodes, dict) else list(workflow.nodes)
        adj: Dict[str, List[str]] = {n.node_id: [] for n in node_objs}
        for edge in workflow.edges:
            if edge.source_node_id in adj:
                adj[edge.source_node_id].append(edge.target_node_id)

        # BFS / Queue to find all reachable downstream nodes
        invalidated: Set[str] = set(modified_node_ids)
        queue = deque(list(modified_node_ids))

        while queue:
            curr = queue.popleft()
            for neighbor in adj.get(curr, []):
                if neighbor not in invalidated:
                    invalidated.add(neighbor)
                    queue.append(neighbor)

        all_node_ids = {n.node_id for n in node_objs}
        preserved = all_node_ids - invalidated

        # Compute estimated savings (e.g. ~3.5s per preserved heavy generation node)
        savings = len(preserved) * 3.5

        return InvalidationPlan(
            revised_target_id=",".join(sorted(modified_node_ids)),
            invalidated_node_ids=sorted(list(invalidated)),
            preserved_node_ids=sorted(list(preserved)),
            estimated_gpu_savings_sec=savings,
            rebuild_required=len(invalidated) > 0,
        )

    def compute_scene_revision_invalidation(
        self,
        pipeline: CreativePipeline,
        revised_scene_id: str,
    ) -> InvalidationPlan:
        """Calculates which scenes, assets, and workflow nodes are invalidated by a scene revision."""
        scene_ids = [s.scene_id for s in pipeline.scenes]
        if revised_scene_id not in scene_ids:
            return InvalidationPlan(
                revised_target_id=revised_scene_id,
                rebuild_required=False,
            )

        # In standard linear scene pipelines:
        # - The revised scene's visual/video assets are invalidated
        # - The final composition / render nodes are invalidated
        # - Independent scenes (all other scene IDs) remain preserved
        invalidated_scenes = [revised_scene_id]
        preserved_scenes = [sid for sid in scene_ids if sid != revised_scene_id]

        # Invalidate related nodes
        invalidated_nodes: List[str] = []
        preserved_nodes: List[str] = []
        preserved_assets: List[str] = []

        # Map scene assets to preserved list
        for scn in pipeline.scenes:
            if scn.scene_id in preserved_scenes:
                preserved_assets.extend(scn.visual_assets)
                preserved_assets.extend(scn.video_assets)
                preserved_assets.extend(scn.audio_assets)

        # Invalidate composition node
        invalidated_nodes.append(f"node_mux_{revised_scene_id}")
        invalidated_nodes.append("node_final_composition")

        # Preserved GPU time estimate based on preserved scenes
        savings = float(len(preserved_scenes) * 5.0)

        return InvalidationPlan(
            revised_target_id=revised_scene_id,
            invalidated_scene_ids=invalidated_scenes,
            preserved_scene_ids=preserved_scenes,
            invalidated_node_ids=invalidated_nodes,
            preserved_node_ids=preserved_nodes,
            preserved_asset_ids=preserved_assets,
            estimated_gpu_savings_sec=savings,
            rebuild_required=True,
        )
