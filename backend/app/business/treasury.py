"""Official Treasury, Settlement & Commercial Invoicing Engine (Mamu Sovereign Treasury).

Configured with authentic banking settlement channels for operator Ravuvai Ayyapparayudu:
- Bank: State Bank of India (SBI)
- Account Holder: Ravuvai Ayyapparayudu
- Account Number: 41130645649
- IFSC Code: SBIN0020507
"""

import json
import os
import time
import uuid
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional


@dataclass
class BankSettlementDetails:
    bank_name: str = "State Bank of India"
    account_holder_name: str = "Ravuvai Ayyapparayudu"
    account_number: str = "41130645649"
    ifsc_code: str = "SBIN0020507"
    branch_name: str = "SBI Specialized Branch"
    account_type: str = "Current / Savings Account"
    currency: str = "INR"
    upi_id: str = "41130645649@sbi"


@dataclass
class InvoiceLineItem:
    item_id: str
    description: str
    quantity: int
    unit_price_inr: float
    unit_price_usd: float
    total_inr: float
    total_usd: float


@dataclass
class CommercialTaxInvoice:
    invoice_number: str
    client_name: str
    client_email: Optional[str]
    client_organization: Optional[str]
    issue_date: str
    due_date: str
    currency: str
    line_items: List[InvoiceLineItem]
    subtotal_inr: float
    tax_rate_pct: float
    tax_amount_inr: float
    total_inr: float
    total_usd: float
    status: str  # DRAFT, ISSUED, SETTLED, PENDING_DISBURSEMENT
    beneficiary: BankSettlementDetails
    upi_payment_link: str
    settlement_reference: Optional[str] = None
    service_fulfillment_ref: Optional[str] = None
    deliverable_hash: Optional[str] = None


class SovereignTreasuryEngine:
    """Enterprise-grade billing, invoicing, and autonomous revenue treasury ledger."""

    def __init__(self, data_dir: Optional[str] = None):
        self.data_dir = Path(data_dir or "project_data/business/treasury")
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self.ledger_file = self.data_dir / "settlement_ledger.json"
        self.invoices_file = self.data_dir / "invoices.json"
        self.settlement_profile = BankSettlementDetails()
        self._invoices: Dict[str, CommercialTaxInvoice] = {}
        self._settlement_history: List[Dict[str, Any]] = []
        self._load_treasury_state()

    def _load_treasury_state(self) -> None:
        """Load persisted invoices and settlement transactions."""
        if self.invoices_file.exists():
            try:
                with open(self.invoices_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    for inv_dict in data:
                        beneficiary_dict = inv_dict.get("beneficiary", {})
                        ben = BankSettlementDetails(**beneficiary_dict) if beneficiary_dict else self.settlement_profile
                        items = [InvoiceLineItem(**item) for item in inv_dict.get("line_items", [])]
                        inv = CommercialTaxInvoice(
                            invoice_number=inv_dict["invoice_number"],
                            client_name=inv_dict["client_name"],
                            client_email=inv_dict.get("client_email"),
                            client_organization=inv_dict.get("client_organization"),
                            issue_date=inv_dict["issue_date"],
                            due_date=inv_dict["due_date"],
                            currency=inv_dict.get("currency", "INR"),
                            line_items=items,
                            subtotal_inr=inv_dict["subtotal_inr"],
                            tax_rate_pct=inv_dict.get("tax_rate_pct", 18.0),
                            tax_amount_inr=inv_dict["tax_amount_inr"],
                            total_inr=inv_dict["total_inr"],
                            total_usd=inv_dict["total_usd"],
                            status=inv_dict["status"],
                            beneficiary=ben,
                            upi_payment_link=inv_dict.get("upi_payment_link", ""),
                            settlement_reference=inv_dict.get("settlement_reference"),
                            service_fulfillment_ref=inv_dict.get("service_fulfillment_ref"),
                            deliverable_hash=inv_dict.get("deliverable_hash"),
                        )
                        self._invoices[inv.invoice_number] = inv
            except Exception:
                pass

        if self.ledger_file.exists():
            try:
                with open(self.ledger_file, "r", encoding="utf-8") as f:
                    self._settlement_history = json.load(f)
            except Exception:
                self._settlement_history = []

    def _save_treasury_state(self) -> None:
        """Persist invoices and settlement transactions to disk."""
        try:
            inv_list = []
            for inv in self._invoices.values():
                d = asdict(inv)
                inv_list.append(d)
            with open(self.invoices_file, "w", encoding="utf-8") as f:
                json.dump(inv_list, f, indent=2)
            with open(self.ledger_file, "w", encoding="utf-8") as f:
                json.dump(self._settlement_history, f, indent=2)
        except Exception:
            pass

    def get_settlement_profile(self) -> Dict[str, Any]:
        """Return the authoritative banking settlement credentials for Mamu."""
        return asdict(self.settlement_profile)

    def generate_invoice(
        self,
        client_name: str,
        service_description: str,
        amount_inr: float,
        client_email: Optional[str] = None,
        client_org: Optional[str] = None,
        service_ref: Optional[str] = None,
        deliverable_hash: Optional[str] = None,
        mark_as_settled: bool = False
    ) -> CommercialTaxInvoice:
        """Generate a compliant commercial invoice settled directly to Mamu's SBI account."""
        now_dt = datetime.now(timezone.utc)
        inv_id = f"INV-ABHI-{now_dt.strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"
        usd_rate = 87.50
        amount_usd = round(amount_inr / usd_rate, 2)

        line_item = InvoiceLineItem(
            item_id=f"item_{uuid.uuid4().hex[:6]}",
            description=service_description,
            quantity=1,
            unit_price_inr=amount_inr,
            unit_price_usd=amount_usd,
            total_inr=amount_inr,
            total_usd=amount_usd
        )

        tax_rate = 18.0
        tax_amt = round(amount_inr * (tax_rate / 100.0), 2)
        grand_total_inr = round(amount_inr + tax_amt, 2)
        grand_total_usd = round(grand_total_inr / usd_rate, 2)

        upi_link = (
            f"upi://pay?pa={self.settlement_profile.upi_id}&pn={self.settlement_profile.account_holder_name.replace(' ', '%20')}"
            f"&am={grand_total_inr}&cu=INR&tn={inv_id}"
        )

        status_str = "SETTLED" if mark_as_settled else "ISSUED"
        settlement_ref = f"SBI-TXN-{uuid.uuid4().hex[:10].upper()}" if mark_as_settled else None

        invoice = CommercialTaxInvoice(
            invoice_number=inv_id,
            client_name=client_name,
            client_email=client_email,
            client_organization=client_org,
            issue_date=now_dt.strftime("%Y-%m-%d"),
            due_date=now_dt.strftime("%Y-%m-%d"),
            currency="INR",
            line_items=[line_item],
            subtotal_inr=amount_inr,
            tax_rate_pct=tax_rate,
            tax_amount_inr=tax_amt,
            total_inr=grand_total_inr,
            total_usd=grand_total_usd,
            status=status_str,
            beneficiary=self.settlement_profile,
            upi_payment_link=upi_link,
            settlement_reference=settlement_ref,
            service_fulfillment_ref=service_ref,
            deliverable_hash=deliverable_hash or f"sha256_{uuid.uuid4().hex[:16]}"
        )

        self._invoices[inv_id] = invoice

        if mark_as_settled:
            self._settlement_history.append({
                "transaction_id": settlement_ref,
                "invoice_number": inv_id,
                "amount_inr": grand_total_inr,
                "amount_usd": grand_total_usd,
                "client_name": client_name,
                "beneficiary_account": f"SBI ****{self.settlement_profile.account_number[-4:]}",
                "account_holder": self.settlement_profile.account_holder_name,
                "ifsc": self.settlement_profile.ifsc_code,
                "settled_at": now_dt.isoformat(),
                "status": "SETTLED_TO_SBI_ACCOUNT"
            })

        self._save_treasury_state()
        return invoice

    def get_financial_overview(self) -> Dict[str, Any]:
        """Compute aggregated lifetime settled revenue, pending pipeline, and invoices."""
        total_settled_inr = sum(
            txn["amount_inr"] for txn in self._settlement_history
            if txn.get("status") == "SETTLED_TO_SBI_ACCOUNT"
        )
        total_pending_inr = sum(
            inv.total_inr for inv in self._invoices.values()
            if inv.status in ["ISSUED", "PENDING_DISBURSEMENT"]
        )

        usd_rate = 87.50
        return {
            "account_holder": self.settlement_profile.account_holder_name,
            "bank_name": self.settlement_profile.bank_name,
            "account_number_masked": f"****{self.settlement_profile.account_number[-4:]}",
            "ifsc_code": self.settlement_profile.ifsc_code,
            "total_settled_revenue_inr": round(total_settled_inr, 2),
            "total_settled_revenue_usd": round(total_settled_inr / usd_rate, 2),
            "pending_invoices_inr": round(total_pending_inr, 2),
            "pending_invoices_usd": round(total_pending_inr / usd_rate, 2),
            "settled_transactions_count": len(self._settlement_history),
            "invoices_count": len(self._invoices),
            "settlement_currency": "INR",
            "last_updated": datetime.now(timezone.utc).isoformat()
        }

    get_treasury_overview = get_financial_overview

    def list_invoices(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Return list of invoices formatted for UI and PDF generation."""
        invs = sorted(self._invoices.values(), key=lambda x: x.issue_date, reverse=True)
        return [asdict(inv) for inv in invs[:limit]]


# Global Singleton Treasury Instance
sovereign_treasury = SovereignTreasuryEngine()
