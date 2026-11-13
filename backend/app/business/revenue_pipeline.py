"""Autonomous Sovereign Revenue Pipeline & Real-World Commercial Engine.

Connects multi-agent swarm capabilities to genuine commercial workflows:
1. Stream 1: Real Code Audit & Vulnerability Verification (AST & Security Integrity)
2. Stream 2: Autonomous Windows Desktop & Web Automation Fulfillments
3. Stream 3: Official Commercial Tax Invoicing with Direct State Bank of India Settlement (UPI: ayyapparayudu.5@ybl)
4. Stream 4: 12-digit Bank UTR Live Payment Reconciliation

Zero dummy records. Every credited rupee requires an authentic Bank UTR.
"""

import ast
import hashlib
import json
import os
import time
import uuid
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from backend.app.business.treasury import sovereign_treasury, CommercialTaxInvoice
from backend.app.core.logging import logger


@dataclass
class CommercialOrder:
    order_id: str
    client_name: str
    client_organization: str
    service_type: str  # CODE_AUDIT | DESKTOP_AUTOMATION | B2B_AI_INTEGRATION | CUSTOM_ENGINEERING
    service_description: str
    amount_inr: float
    amount_usd: float
    assigned_agents: List[str]
    pipeline_stage: str  # RECEIVED | IN_PROGRESS | DELIVERED | AWAITING_PAYMENT | SETTLED
    deliverable_summary: Optional[str] = None
    deliverable_hash: Optional[str] = None
    invoice_number: Optional[str] = None
    bank_utr: Optional[str] = None
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    settled_at: Optional[str] = None


class SovereignRevenuePipeline:
    """End-to-end commercial operations pipeline coordinator for Mamu."""

    def __init__(self, workspace_root: Optional[str] = None):
        self.workspace_root = Path(workspace_root or "c:/Users/AYYAPPA RAYUDU/OneDrive/Desktop/ABHI")
        self.orders_file = self.workspace_root / "project_data/business/treasury/commercial_orders.json"
        self._orders: Dict[str, CommercialOrder] = {}
        self._load_orders()

    def _load_orders(self) -> None:
        if self.orders_file.exists():
            try:
                with open(self.orders_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    for d in data:
                        ord_obj = CommercialOrder(**d)
                        self._orders[ord_obj.order_id] = ord_obj
            except Exception:
                self._orders = {}

    def _save_orders(self) -> None:
        try:
            self.orders_file.parent.mkdir(parents=True, exist_ok=True)
            with open(self.orders_file, "w", encoding="utf-8") as f:
                json.dump([asdict(o) for o in self._orders.values()], f, indent=2)
        except Exception:
            pass

    def list_orders(self) -> List[Dict[str, Any]]:
        return [asdict(o) for o in sorted(self._orders.values(), key=lambda x: x.created_at, reverse=True)]

    def create_real_client_order(
        self,
        client_name: str,
        client_organization: str,
        service_type: str,
        service_description: str,
        amount_inr: float,
        client_email: Optional[str] = None
    ) -> Dict[str, Any]:
        """Create an authentic commercial order and generate its official tax invoice."""
        order_id = f"ORD-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"
        amount_usd = round(amount_inr / 87.50, 2)

        # Allocate specialist LLM workers based on service type
        agents = ["ChiefSupervisor", "TaskPlanner"]
        if service_type == "CODE_AUDIT":
            agents.extend(["AuditAgent", "CodingAgent"])
        elif service_type == "DESKTOP_AUTOMATION":
            agents.extend(["OSDesktopAgent", "AutomationAgent"])
        else:
            agents.extend(["CodingAgent", "BusinessAgent"])

        # Generate official tax invoice with direct UPI link
        invoice = sovereign_treasury.generate_invoice(
            client_name=client_name,
            service_description=service_description,
            amount_inr=amount_inr,
            client_email=client_email,
            client_org=client_organization,
            mark_as_settled=False
        )

        order = CommercialOrder(
            order_id=order_id,
            client_name=client_name,
            client_organization=client_organization,
            service_type=service_type,
            service_description=service_description,
            amount_inr=amount_inr,
            amount_usd=amount_usd,
            assigned_agents=agents,
            pipeline_stage="AWAITING_PAYMENT",
            invoice_number=invoice.invoice_number
        )

        self._orders[order_id] = order
        self._save_orders()
        return asdict(order)

    def reconcile_payment_with_utr(self, utr_number: str, amount_inr: float, payer_name: str, invoice_number: Optional[str] = None) -> Dict[str, Any]:
        """Reconcile an authentic payment using Bank 12-digit UTR into State Bank of India account."""
        # Record into sovereign treasury
        settlement_record = sovereign_treasury.record_verified_sbi_settlement(
            utr_number=utr_number,
            amount_inr=amount_inr,
            payer_name=payer_name,
            invoice_number=invoice_number
        )

        # Update matching commercial order if exists
        for order in self._orders.values():
            if (invoice_number and order.invoice_number == invoice_number) or (not order.bank_utr and order.amount_inr == amount_inr):
                order.pipeline_stage = "SETTLED"
                order.bank_utr = utr_number.strip().upper()
                order.settled_at = datetime.now(timezone.utc).isoformat()
                self._save_orders()
                break

        return settlement_record

    def get_pipeline_telemetry(self) -> Dict[str, Any]:
        """Return live commercial operations telemetry."""
        overview = sovereign_treasury.get_treasury_overview()
        orders = list(self._orders.values())
        return {
            "total_settled_inr": overview["total_settled_revenue_inr"],
            "total_settled_usd": overview["total_settled_revenue_usd"],
            "settled_transactions_count": overview["settled_transactions_count"],
            "active_orders_count": len([o for o in orders if o.pipeline_stage != "SETTLED"]),
            "settled_orders_count": len([o for o in orders if o.pipeline_stage == "SETTLED"]),
            "orders": [asdict(o) for o in orders[:20]],
            "sbi_account": "41130645649",
            "ifsc": "SBIN0020507",
            "upi_id": "ayyapparayudu.5@ybl"
        }


# Global singleton pipeline instance
sovereign_revenue_pipeline = SovereignRevenuePipeline()
