"""Phase 8 Stage 8.4 — Media Workflow Models, Capability Graph, and Cycle Detection Tests."""

import pytest
from backend.app.media.workflow_models import (
    MediaWorkflow,
    MediaWorkflowNode,
    MediaWorkflowEdge,
    MediaWorkflowStatus,
    WorkflowNodeStatus,
    WorkflowMediaPortType,
    MediaWorkflowSimulationResult,
    MediaWorkflowManifest,
    MediaCompositionProfile,
    MediaCompositionRequest,
    calculate_workflow_hash,
)
from backend.app.media.capability_graph import (
    MediaCapabilityGraph,
    CapabilityRegistryEntry,
    PortTypeCompatibility,
    media_capability_graph,
)


def test_workflow_model_instantiation_and_hash():
    """Verify MediaWorkflow model creation and deterministic SHA-256 hash calculation."""
    node1 = MediaWorkflowNode(
        node_id="node_gen",
        skill_id="media.image.generate",
        skill_version="1.0.0",
        input_bindings={"prompt": "A futuristic city"},
        output_bindings={"artifact_id": "image_art_1"},
    )
    node2 = MediaWorkflowNode(
        node_id="node_vid",
        skill_id="media.video.generate",
        skill_version="1.0.0",
        input_bindings={"source_artifact_id": "{{node_gen.artifact_id}}"},
        output_bindings={"artifact_id": "video_art_1"},
    )
    edge = MediaWorkflowEdge(
        source_node_id="node_gen",
        source_port="artifact_id",
        target_node_id="node_vid",
        target_port="source_artifact_id",
        port_type=WorkflowMediaPortType.IMAGE,
    )
    wf = MediaWorkflow(
        workflow_id="wf_test_001",
        task_id="task_test_001",
        goal="Create an animated futuristic city",
        nodes=[node1, node2],
        edges=[edge],
    )

    assert wf.workflow_id == "wf_test_001"
    assert len(wf.nodes) == 2
    assert len(wf.edges) == 1
    assert wf.status == MediaWorkflowStatus.QUEUED

    h1 = calculate_workflow_hash(wf)
    h2 = calculate_workflow_hash(wf)
    assert h1 == h2
    assert len(h1) == 64


def test_capability_graph_valid_dag_topological_sort():
    """Verify that a valid DAG is correctly sorted in topological execution order."""
    cg = MediaCapabilityGraph()

    node1 = MediaWorkflowNode(node_id="n1", skill_id="media.image.generate", input_bindings={"prompt": "test"})
    node2 = MediaWorkflowNode(node_id="n2", skill_id="media.image.outpaint", input_bindings={"source_artifact_id": "{{n1.artifact_id}}"})
    node3 = MediaWorkflowNode(node_id="n3", skill_id="media.video.generate", input_bindings={"source_artifact_id": "{{n2.artifact_id}}"})

    edges = [
        MediaWorkflowEdge(source_node_id="n1", source_port="artifact_id", target_node_id="n2", target_port="source_artifact_id", port_type=WorkflowMediaPortType.IMAGE),
        MediaWorkflowEdge(source_node_id="n2", source_port="artifact_id", target_node_id="n3", target_port="source_artifact_id", port_type=WorkflowMediaPortType.IMAGE),
    ]

    wf = MediaWorkflow(
        workflow_id="wf_dag_sort",
        goal="Linear DAG",
        nodes=[node3, node1, node2],  # Out of order
        edges=edges,
    )

    is_valid, sorted_nodes, errors = cg.validate_and_sort_dag(wf)
    assert is_valid is True
    assert len(errors) == 0
    assert [n.node_id for n in sorted_nodes] == ["n1", "n2", "n3"]


def test_capability_graph_cycle_detection():
    """Verify Kahn's algorithm detects cycles and rejects cyclic workflows."""
    cg = MediaCapabilityGraph()

    n1 = MediaWorkflowNode(node_id="n1", skill_id="media.image.generate", input_bindings={})
    n2 = MediaWorkflowNode(node_id="n2", skill_id="media.image.edit", input_bindings={})
    n3 = MediaWorkflowNode(node_id="n3", skill_id="media.image.inpaint", input_bindings={})

    # Cycle: n1 -> n2 -> n3 -> n1
    edges = [
        MediaWorkflowEdge(source_node_id="n1", source_port="artifact_id", target_node_id="n2", target_port="source_artifact_id", port_type=WorkflowMediaPortType.IMAGE),
        MediaWorkflowEdge(source_node_id="n2", source_port="artifact_id", target_node_id="n3", target_port="source_artifact_id", port_type=WorkflowMediaPortType.IMAGE),
        MediaWorkflowEdge(source_node_id="n3", source_port="artifact_id", target_node_id="n1", target_port="source_artifact_id", port_type=WorkflowMediaPortType.IMAGE),
    ]

    wf = MediaWorkflow(
        workflow_id="wf_cyclic",
        goal="Cyclic graph",
        nodes=[n1, n2, n3],
        edges=edges,
    )

    is_valid, sorted_nodes, errors = cg.validate_and_sort_dag(wf)
    assert is_valid is False
    assert any("cycle" in err.lower() for err in errors)


def test_capability_graph_max_nodes_limit():
    """Verify enforcement of maximum 20 nodes limit per workflow."""
    cg = MediaCapabilityGraph(max_nodes=5)

    nodes = [
        MediaWorkflowNode(node_id=f"n_{i}", skill_id="media.image.generate", input_bindings={"prompt": "test"})
        for i in range(6)
    ]
    wf = MediaWorkflow(
        workflow_id="wf_overflow",
        goal="Too many nodes",
        nodes=nodes,
        edges=[],
    )

    is_valid, sorted_nodes, errors = cg.validate_and_sort_dag(wf)
    assert is_valid is False
    assert any("exceeds maximum" in err for err in errors)


def test_port_type_compatibility():
    """Verify port type compatibility checks between producer and consumer."""
    cg = MediaCapabilityGraph()

    # Image -> Video generation: Compatible
    assert cg.is_port_compatible(WorkflowMediaPortType.IMAGE, WorkflowMediaPortType.IMAGE) is True
    # Text -> Prompt: Compatible
    assert cg.is_port_compatible(WorkflowMediaPortType.TEXT, WorkflowMediaPortType.TEXT) is True
    # Audio -> Video port: Incompatible directly without composer
    assert cg.is_port_compatible(WorkflowMediaPortType.AUDIO, WorkflowMediaPortType.IMAGE) is False
    # Any -> Passthrough
    assert cg.is_port_compatible(WorkflowMediaPortType.ANY, WorkflowMediaPortType.IMAGE) is True


def test_template_variable_resolution_and_validation():
    """Verify safe template variable resolution without code execution."""
    cg = MediaCapabilityGraph()

    context = {
        "node_img": {"artifact_id": "art_12345", "format": "PNG"},
        "node_audio": {"artifact_id": "art_audio_888", "duration": 4.5},
    }

    # Valid resolution
    res1 = cg.resolve_input_bindings(
        {"source_artifact_id": "{{node_img.artifact_id}}", "custom_param": 10},
        context,
    )
    assert res1["source_artifact_id"] == "art_12345"
    assert res1["custom_param"] == 10

    # Unresolved template variable returns error
    with pytest.raises(ValueError, match="Unresolved template reference"):
        cg.resolve_input_bindings(
            {"source_artifact_id": "{{node_missing.artifact_id}}"},
            context,
        )


def test_composition_profile_validation():
    """Verify MediaCompositionProfile and MediaCompositionRequest contracts."""
    req = MediaCompositionRequest(
        video_artifact_id="art_vid_123",
        audio_artifact_id="art_aud_456",
        profile=MediaCompositionProfile.VIDEO_PLUS_AUDIO,
        output_format="MP4",
        normalize_audio=True,
    )
    assert req.video_artifact_id == "art_vid_123"
    assert req.profile == MediaCompositionProfile.VIDEO_PLUS_AUDIO
    assert req.output_format == "MP4"
