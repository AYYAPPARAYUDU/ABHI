"""Phase 8 Stage 8.4 — Media Workflow Templates, Contract Validation, and Edge Cases."""

import pytest
from backend.app.media.workflow_models import (
    MediaWorkflow,
    MediaWorkflowNode,
    MediaWorkflowEdge,
    WorkflowMediaPortType,
    MediaWorkflowSuccessContract,
    MediaWorkflowStatus,
    WorkflowNodeStatus,
    WorkflowRetentionPolicy,
    MediaWorkflowCheckpoint,
)
from backend.app.media.workflow_composer import MultimodalMediaWorkflowComposer
from backend.app.media.capability_graph import MediaCapabilityGraph


def test_template_instantiation_text_to_image():
    composer = MultimodalMediaWorkflowComposer()
    ok, wf, msg = composer.instantiate_template("creative.text_to_image@1.0.0")
    assert ok is True
    assert wf is not None
    assert len(wf.nodes) == 1
    assert "node_image_gen" in wf.nodes
    assert wf.status == MediaWorkflowStatus.QUEUED


def test_template_instantiation_image_outpaint():
    composer = MultimodalMediaWorkflowComposer()
    ok, wf, msg = composer.instantiate_template("creative.image_outpaint@1.0.0")
    assert ok is True
    assert wf is not None
    assert len(wf.nodes) == 2
    assert "node_image_gen" in wf.nodes
    assert "node_outpaint" in wf.nodes


def test_template_instantiation_image_to_video():
    composer = MultimodalMediaWorkflowComposer()
    ok, wf, msg = composer.instantiate_template("creative.image_to_video@1.0.0")
    assert ok is True
    assert wf is not None
    assert len(wf.nodes) == 2
    assert "node_image_gen" in wf.nodes
    assert "node_video_gen" in wf.nodes


def test_template_instantiation_narrated_clip():
    composer = MultimodalMediaWorkflowComposer()
    ok, wf, msg = composer.instantiate_template("creative.narrated_clip@1.0.0")
    assert ok is True
    assert wf is not None
    assert len(wf.nodes) == 4
    assert "node_image_gen" in wf.nodes
    assert "node_tts" in wf.nodes
    assert "node_video_gen" in wf.nodes
    assert "node_compose" in wf.nodes


def test_template_instantiation_invalid_id():
    composer = MultimodalMediaWorkflowComposer()
    ok, wf, msg = composer.instantiate_template("creative.non_existent@9.9.9")
    assert ok is False
    assert wf is None
    assert "not found" in msg.lower()


def test_success_contract_validation():
    contract = MediaWorkflowSuccessContract(
        required_output_keys=["primary_artifact_id"],
        required_media_types=[WorkflowMediaPortType.IMAGE, WorkflowMediaPortType.VIDEO],
        require_hash_verification=True,
        minimum_completed_nodes=2
    )
    assert contract.require_hash_verification is True
    assert len(contract.required_media_types) == 2
    assert contract.minimum_completed_nodes == 2


def test_workflow_checkpoint_serialization():
    ckpt = MediaWorkflowCheckpoint(
        workflow_id="wf_ckpt_01",
        node_id="n1",
        status=MediaWorkflowStatus.RUNNING,
        completed_node_ids=["n1"],
        artifact_ids=["art_01"],
        artifact_hashes={"art_01": "hash_01"},
        node_results={"n1": {"artifact_id": "art_01"}},
        workflow_hash="wf_hash_01",
    )
    assert ckpt.workflow_id == "wf_ckpt_01"
    assert ckpt.node_id == "n1"
    assert len(ckpt.completed_node_ids) == 1
    d = ckpt.model_dump()
    assert d["status"] == "RUNNING"


def test_retention_policy_enumeration():
    assert WorkflowRetentionPolicy.KEEP_ALL.value == "KEEP_ALL"
    assert WorkflowRetentionPolicy.KEEP_FINAL_AND_SOURCES.value == "KEEP_FINAL_AND_SOURCES"
    assert WorkflowRetentionPolicy.KEEP_FINAL_ONLY.value == "KEEP_FINAL_ONLY"


def test_capability_graph_duplicate_edges_handling():
    validator = MediaCapabilityGraph()
    n1 = MediaWorkflowNode(node_id="n1", skill_id="media.image.generate", parameters={})
    n2 = MediaWorkflowNode(node_id="n2", skill_id="media.image.outpaint", parameters={}, dependencies=["n1"])
    edge1 = MediaWorkflowEdge(source_node_id="n1", source_port="artifact_id", target_node_id="n2", target_port="source_artifact_id", port_type=WorkflowMediaPortType.IMAGE)
    edge2 = MediaWorkflowEdge(source_node_id="n1", source_port="artifact_id", target_node_id="n2", target_port="source_artifact_id", port_type=WorkflowMediaPortType.IMAGE)

    wf = MediaWorkflow(workflow_id="wf_dup", goal="test", nodes=[n1, n2], edges=[edge1, edge2])
    valid, errs, order = validator.validate_workflow_dag(wf)
    assert valid is True
    node_ids = [n.node_id for n in order]
    assert node_ids == ["n1", "n2"]


def test_capability_graph_unconnected_node_detection():
    validator = MediaCapabilityGraph()
    n1 = MediaWorkflowNode(node_id="n1", skill_id="media.image.generate", parameters={})
    n2 = MediaWorkflowNode(node_id="n2", skill_id="audio.tts", parameters={})
    wf = MediaWorkflow(workflow_id="wf_unconnected", goal="test", nodes=[n1, n2], edges=[])
    valid, errs, order = validator.validate_workflow_dag(wf)
    assert valid is True
    assert len(order) == 2
