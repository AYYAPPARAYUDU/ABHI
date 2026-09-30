"""Phase 8 Stage 8.4 — Media Capability Graph & Type Compatibility Engine.

Governs:
- Media Processing Capability Map & Port Typing (Image, Video, Audio, Mask, Text)
- Strict Type Compatibility Validation between Connected Workflow Nodes
- Deterministic DAG Cycle Detection & Topological Ordering
- Bounded Node, Edge & Resource Scale Validation (Max 20 Nodes)
- Safe Template Variable Extraction & Dependency Resolution
"""

import re
from typing import Any, Dict, List, Optional, Set, Tuple
from backend.app.core.logging import logger
from backend.app.media.workflow_models import (
    MediaCapability,
    MediaWorkflow,
    MediaWorkflowNode,
    MediaWorkflowEdge,
    WorkflowMediaPortType,
)


class MediaCapabilityGraph:
    """Authoritative registry mapping skills to media port types and validating DAG topologies."""

    MAX_WORKFLOW_NODES = 20
    MAX_WORKFLOW_EDGES = 50

    def __init__(self, max_nodes: int = 20, max_edges: int = 50):
        self.MAX_WORKFLOW_NODES = max_nodes
        self.MAX_WORKFLOW_EDGES = max_edges
        self._capabilities: Dict[str, MediaCapability] = {}
        self._register_default_capabilities()

    def _register_default_capabilities(self) -> None:
        """Register canonical Phase 8 media capabilities."""
        caps = [
            MediaCapability(
                skill_id="media.image.generate",
                operation_name="Local Image Synthesis",
                input_port_types=[WorkflowMediaPortType.TEXT],
                output_port_types=[WorkflowMediaPortType.IMAGE],
                description="Generates local image artifact from text conditioning.",
                is_heavy_gpu=True,
                base_vram_mb=3200.0,
                base_ram_mb=2048.0,
                estimated_duration_sec=3.0,
            ),
            MediaCapability(
                skill_id="media.image.edit",
                operation_name="Image-to-Image Transformation",
                input_port_types=[WorkflowMediaPortType.IMAGE, WorkflowMediaPortType.TEXT],
                output_port_types=[WorkflowMediaPortType.IMAGE],
                description="Performs non-destructive strength-controlled latent editing.",
                is_heavy_gpu=True,
                base_vram_mb=3400.0,
                base_ram_mb=2500.0,
                estimated_duration_sec=3.5,
            ),
            MediaCapability(
                skill_id="media.image.inpaint",
                operation_name="Inpainting Regional Synthesis",
                input_port_types=[WorkflowMediaPortType.IMAGE, WorkflowMediaPortType.MASK, WorkflowMediaPortType.TEXT],
                output_port_types=[WorkflowMediaPortType.IMAGE],
                description="Generates localized content in masked region with soft feathering.",
                is_heavy_gpu=True,
                base_vram_mb=4800.0,
                base_ram_mb=3000.0,
                estimated_duration_sec=4.5,
            ),
            MediaCapability(
                skill_id="media.image.outpaint",
                operation_name="Canvas Outpainting Expansion",
                input_port_types=[WorkflowMediaPortType.IMAGE, WorkflowMediaPortType.TEXT],
                output_port_types=[WorkflowMediaPortType.IMAGE],
                description="Expands canvas borders with deterministic border mask generation.",
                is_heavy_gpu=True,
                base_vram_mb=4200.0,
                base_ram_mb=2800.0,
                estimated_duration_sec=4.0,
            ),
            MediaCapability(
                skill_id="media.video.generate",
                operation_name="Temporal Video Generation",
                input_port_types=[WorkflowMediaPortType.IMAGE, WorkflowMediaPortType.TEXT],
                output_port_types=[WorkflowMediaPortType.VIDEO],
                description="Synthesizes temporal video clip from image or text conditioning.",
                is_heavy_gpu=True,
                base_vram_mb=4500.0,
                base_ram_mb=3500.0,
                estimated_duration_sec=8.0,
            ),
            MediaCapability(
                skill_id="audio.tts",
                operation_name="Neural Text-to-Speech",
                input_port_types=[WorkflowMediaPortType.TEXT],
                output_port_types=[WorkflowMediaPortType.AUDIO],
                description="Synthesizes local neural speech audio from text narration.",
                is_heavy_gpu=False,
                base_vram_mb=0.0,
                base_ram_mb=1024.0,
                estimated_duration_sec=1.5,
            ),
            MediaCapability(
                skill_id="media.video.compose",
                operation_name="Multimodal Media Composition",
                input_port_types=[WorkflowMediaPortType.VIDEO, WorkflowMediaPortType.AUDIO],
                output_port_types=[WorkflowMediaPortType.VIDEO],
                description="Muxes video frames and audio narration into a final verified artifact.",
                is_heavy_gpu=False,
                base_vram_mb=0.0,
                base_ram_mb=1500.0,
                estimated_duration_sec=2.0,
            ),
        ]
        for c in caps:
            self._capabilities[c.skill_id] = c

    def get_capability(self, skill_id: str) -> Optional[MediaCapability]:
        """Retrieve capability definition for a registered skill."""
        return self._capabilities.get(skill_id)

    def list_capabilities(self) -> List[MediaCapability]:
        """Return all registered media workflow capabilities."""
        return list(self._capabilities.values())

    def validate_type_compatibility(
        self,
        source_skill_id: str,
        target_skill_id: str,
        port_type: WorkflowMediaPortType
    ) -> Tuple[bool, str]:
        """Verify whether target skill can consume output port type produced by source skill."""
        src_cap = self.get_capability(source_skill_id)
        if not src_cap:
            return False, f"Source skill '{source_skill_id}' is not a registered media capability"

        dst_cap = self.get_capability(target_skill_id)
        if not dst_cap:
            return False, f"Target skill '{target_skill_id}' is not a registered media capability"

        if port_type not in src_cap.output_port_types:
            return False, f"Source '{source_skill_id}' does not produce output port type '{port_type.value}'"

        if port_type not in dst_cap.input_port_types:
            return False, f"Target '{target_skill_id}' cannot accept input port type '{port_type.value}'"

        return True, f"Compatible connection ({src_cap.operation_name} -> {dst_cap.operation_name} via {port_type.value})"

    def validate_workflow_dag(
        self,
        workflow: MediaWorkflow
    ) -> Tuple[bool, List[str], List[MediaWorkflowNode]]:
        """Validate structure, limits, port compatibility, cycle absence, and return topological order."""
        errors: List[str] = []

        # 1. Bounded Node & Edge scale check
        num_nodes = len(workflow.nodes)
        if num_nodes == 0:
            return False, ["Workflow must contain at least one node"], []

        if num_nodes > self.MAX_WORKFLOW_NODES:
            return False, [f"Workflow exceeds maximum node limit ({num_nodes} > {self.MAX_WORKFLOW_NODES})"], []

        if len(workflow.edges) > self.MAX_WORKFLOW_EDGES:
            return False, [f"Workflow exceeds maximum edge limit ({len(workflow.edges)} > {self.MAX_WORKFLOW_EDGES})"], []

        # 2. Verify all nodes reference valid registered skills
        for nid, node in workflow.nodes.items():
            cap = self.get_capability(node.skill_id)
            if not cap:
                errors.append(f"Node '{nid}' references unregistered skill: '{node.skill_id}'")

        # 3. Verify edges and input/output port compatibility
        for edge in workflow.edges:
            src = workflow.nodes.get(edge.source_node_id)
            dst = workflow.nodes.get(edge.target_node_id)

            if not src:
                errors.append(f"Edge references non-existent source node: '{edge.source_node_id}'")
                continue
            if not dst:
                errors.append(f"Edge references non-existent target node: '{edge.target_node_id}'")
                continue

            compat, msg = self.validate_type_compatibility(src.skill_id, dst.skill_id, edge.port_type)
            if not compat:
                errors.append(f"Edge {edge.source_node_id} -> {edge.target_node_id} incompatible: {msg}")

        # 4. Cycle Detection & Topological Ordering via Kahn's Algorithm
        in_degree: Dict[str, int] = {nid: 0 for nid in workflow.nodes}
        adj_list: Dict[str, List[str]] = {nid: [] for nid in workflow.nodes}

        # Build adjacency from explicit dependencies and edges
        for edge in workflow.edges:
            adj_list[edge.source_node_id].append(edge.target_node_id)
            in_degree[edge.target_node_id] = in_degree.get(edge.target_node_id, 0) + 1

        for nid, node in workflow.nodes.items():
            for dep in node.dependencies:
                if dep not in workflow.nodes:
                    errors.append(f"Node '{nid}' declares unknown dependency '{dep}'")
                elif dep not in adj_list or nid not in adj_list[dep]:
                    adj_list[dep].append(nid)
                    in_degree[nid] = in_degree.get(nid, 0) + 1

        queue = [nid for nid, deg in in_degree.items() if deg == 0]
        topological_order: List[MediaWorkflowNode] = []

        while queue:
            curr_id = queue.pop(0)
            topological_order.append(workflow.nodes[curr_id])

            for neighbor in adj_list.get(curr_id, []):
                in_degree[neighbor] -= 1
                if in_degree[neighbor] == 0:
                    queue.append(neighbor)

        if len(topological_order) < num_nodes:
            errors.append("CYCLE_DETECTED: Media workflow contains cyclic dependency loop")

        if errors:
            return False, errors, []

        return True, [], topological_order

    @staticmethod
    def extract_template_variables(text: str) -> List[Tuple[str, str]]:
        """Extract template variable references e.g. {{node_1.artifact_id}} -> [('node_1', 'artifact_id')]."""
        pattern = r"\{\{\s*([a-zA-Z0-9_-]+)\.([a-zA-Z0-9_-]+)\s*\}\}"
        matches = re.findall(pattern, text)
        return matches

    @staticmethod
    def resolve_bindings(
        node: MediaWorkflowNode,
        resolved_outputs: Dict[str, Dict[str, Any]]
    ) -> Tuple[Dict[str, Any], Optional[str]]:
        """Safely substitute input bindings from prior node results without executing code."""
        merged_params = dict(node.parameters)

        # Merge input_bindings into merged_params for resolution
        all_bindings = dict(merged_params)
        all_bindings.update(node.input_bindings)

        for param_name, binding_expr in all_bindings.items():
            if not isinstance(binding_expr, str):
                merged_params[param_name] = binding_expr
                continue

            vars_found = MediaCapabilityGraph.extract_template_variables(binding_expr)
            if not vars_found:
                merged_params[param_name] = binding_expr
                continue

            # Direct single variable binding e.g. "{{node_1.artifact_id}}"
            if len(vars_found) == 1 and binding_expr.strip() == f"{{{{{vars_found[0][0]}.{vars_found[0][1]}}}}}":
                src_node_id, src_key = vars_found[0]
                node_out = resolved_outputs.get(src_node_id)
                if not node_out:
                    return {}, f"Unresolved dependency: Node '{src_node_id}' output not found for binding '{param_name}'"
                if src_key not in node_out:
                    return {}, f"Missing output key: Node '{src_node_id}' has no key '{src_key}'"
                merged_params[param_name] = node_out[src_key]
            else:
                # String substitution template
                res_str = binding_expr
                for src_node_id, src_key in vars_found:
                    node_out = resolved_outputs.get(src_node_id, {})
                    val = str(node_out.get(src_key, ""))
                    res_str = res_str.replace(f"{{{{{src_node_id}.{src_key}}}}}", val)
                merged_params[param_name] = res_str

        return merged_params, None

    def validate_and_sort_dag(
        self,
        workflow: MediaWorkflow
    ) -> Tuple[bool, List[MediaWorkflowNode], List[str]]:
        """Validate DAG and return (is_valid, topological_order, errors)."""
        is_valid, errors, order = self.validate_workflow_dag(workflow)
        return is_valid, order, errors

    def is_port_compatible(
        self,
        source_port: WorkflowMediaPortType,
        target_port: WorkflowMediaPortType
    ) -> bool:
        """Check if source port type is compatible with target port type."""
        if source_port == WorkflowMediaPortType.ANY or target_port == WorkflowMediaPortType.ANY:
            return True
        return source_port == target_port

    def resolve_input_bindings(
        self,
        bindings: Dict[str, Any],
        context: Dict[str, Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Resolve dictionary of bindings using context and raise ValueError on unresolved."""
        dummy_node = MediaWorkflowNode(
            node_id="dummy",
            skill_id="media.image.generate",
            input_bindings=bindings
        )
        resolved, err = self.resolve_bindings(dummy_node, context)
        if err:
            raise ValueError(f"Unresolved template reference: {err}")
        return resolved


CapabilityRegistryEntry = MediaCapability
PortTypeCompatibility = Dict[str, Any]

# Global Singleton
media_capability_graph = MediaCapabilityGraph()

