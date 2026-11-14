"""Tests for ABHI Native Flow Engine & n8n Bridge."""

import pytest
from backend.app.automation.flow_engine import flow_engine, FlowNodeType, FlowNodeSubType


@pytest.mark.asyncio
async def test_flow_engine_seeds():
    flows = flow_engine.list_flows()
    assert len(flows) >= 2
    flow_ids = [f.id for f in flows]
    assert "flow-sbi-reconciliation" in flow_ids
    assert "flow-system-health-guardian" in flow_ids


@pytest.mark.asyncio
async def test_flow_engine_execution():
    record = await flow_engine.execute_flow("flow-sbi-reconciliation")
    assert record.status == "COMPLETED"
    assert record.physical_verification_passed is True
    assert "n2-query-ledger" in record.node_results
    assert record.node_results["n2-query-ledger"]["account_number"] == "SBI ****5649"


@pytest.mark.asyncio
async def test_n8n_import_and_export():
    sample_n8n_workflow = {
        "name": "Incoming Stripe Payment Webhook",
        "nodes": [
            {
                "name": "Stripe Webhook",
                "type": "n8n-nodes-base.webhook",
                "parameters": {"path": "stripe-inward"}
            },
            {
                "name": "Format JSON",
                "type": "n8n-nodes-base.code",
                "parameters": {"code": "return items;"}
            }
        ]
    }

    # Import
    imported = flow_engine.import_n8n_workflow(sample_n8n_workflow)
    assert imported.name == "Incoming Stripe Payment Webhook"
    assert len(imported.nodes) == 2
    assert imported.nodes[0].sub_type == FlowNodeSubType.WEBHOOK
    assert imported.nodes[1].sub_type == FlowNodeSubType.PYTHON_SCRIPT

    # Export
    exported = flow_engine.export_to_n8n(imported.id)
    assert exported["name"] == "Incoming Stripe Payment Webhook"
    assert len(exported["nodes"]) == 2
