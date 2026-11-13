"""Tests for Authentic State Bank of India Treasury, Settlements, and Invoicing."""

import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)


def test_treasury_profile_authenticity():
    """Verify SBI settlement credentials for operator Ravuvai Ayyapparayudu."""
    res = client.get("/api/v1/business/treasury/profile")
    assert res.status_code == 200
    data = res.json()
    assert data["bank_name"] == "State Bank of India"
    assert data["account_holder_name"] == "Ravuvai Ayyapparayudu"
    assert data["account_number"] == "41130645649"
    assert data["ifsc_code"] == "SBIN0020507"
    assert data["upi_id"] == "ayyapparayudu.5@ybl"


def test_treasury_overview():
    """Verify treasury overview totals and banking metadata."""
    res = client.get("/api/v1/business/treasury/overview")
    assert res.status_code == 200
    data = res.json()
    assert "total_settled_revenue_inr" in data
    assert "total_settled_revenue_usd" in data
    assert data["bank_name"] == "State Bank of India"
    assert "****5649" in data["account_number_masked"]


def test_create_invoice_and_verify_settlement():
    """Verify commercial tax invoice generation and dual-state receipt creation."""
    inv_payload = {
        "client_name": "Enterprise Test Client",
        "service_description": "Autonomous Three.js 3D Office Dashboard",
        "amount_inr": 25000.0,
        "mark_as_settled": False
    }
    inv_res = client.post("/api/v1/business/treasury/invoices", json=inv_payload)
    assert inv_res.status_code == 200
    inv = inv_res.json()
    assert "INV-ABHI-" in inv["invoice_number"]
    assert "ayyapparayudu.5@ybl" in inv["upi_payment_link"]

    # Verify settlement with valid Bank UTR
    utr_test = "SBIN999888777666"
    settle_payload = {
        "utr_number": utr_test,
        "amount_inr": 25000.0,
        "payer_name": "Enterprise Test Client",
        "invoice_number": inv["invoice_number"]
    }
    settle_res = client.post("/api/v1/business/treasury/verify-settlement", json=settle_payload)
    assert settle_res.status_code == 200
    settle_data = settle_res.json()
    assert settle_data["status"] == "SETTLED_TO_SBI_ACCOUNT"
    assert settle_data["beneficiary_account"] == "SBI ****5649"


def test_live_monitor_endpoint():
    """Verify combined monitor of financial, worker activity, and system metrics."""
    res = client.get("/api/v1/business/live-monitor")
    assert res.status_code == 200
    data = res.json()
    assert "financial" in data
    assert data["financial"]["bank_name"] == "State Bank of India"
    assert "resources" in data
    assert "work_status" in data
