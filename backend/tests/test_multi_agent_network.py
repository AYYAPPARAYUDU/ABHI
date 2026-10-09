"""Tests for Multi-Agent Network Graph Projection & Capability Mapping (Phase 9 Stage 3)."""

import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)


def test_agent_network_graph():
    """Verify that /api/v1/agent/network returns all registered agents and dependency edges."""
    response = client.get("/api/v1/agent/network")
    assert response.status_code == 200
    data = response.json()
    assert "nodes" in data
    assert "edges" in data
    assert data["total_agents"] >= 8
    assert data["system_status"] == "OPERATIONAL"

    node_ids = [n["id"] for n in data["nodes"]]
    assert "supervisor" in node_ids
    assert "rag_agent" in node_ids
    assert "memory_agent" in node_ids
    assert "coding_agent" in node_ids
    assert "os_desktop_agent" in node_ids
    assert "browser_agent" in node_ids
    assert "media_studio_agent" in node_ids
    assert "perception_agent" in node_ids
    assert "evaluation_agent" in node_ids

    # Supervisor must be flagged as supervisor
    supervisor_node = next(n for n in data["nodes"] if n["id"] == "supervisor")
    assert supervisor_node["is_supervisor"] is True
    assert supervisor_node["position_3d"]["x"] == 0.0

    # Edges verification
    assert len(data["edges"]) >= 8
    source_nodes = set(e["source"] for e in data["edges"])
    assert "supervisor" in source_nodes


def test_training_capability_honesty():
    """Verify that /api/v1/evaluation/training/capability explicitly reports NOT_AVAILABLE for distributed backprop."""
    response = client.get("/api/v1/evaluation/training/capability")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "NOT_AVAILABLE"
    assert data["full_fine_tuning_supported"] is False
    assert data["adapter_experimentation_supported"] is True
    assert "NOT_AVAILABLE" in data["reason"]
