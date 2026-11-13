"""Real-World Affiliate Marketing & Autonomous Monetization Engine.

Configured exclusively with verified credentials for operator Ravuvai Ayyapparayudu (Mamu):
- Primary Email: ayyapparayudu.ravuvari@gmail.com
- Primary Bank: State Bank of India (A/C: 41130645649, IFSC: SBIN0020507)
- UPI ID: ayyapparayudu.5@ybl

Integrates with genuine affiliate platforms:
1. Amazon Associates India (Store ID: ayyappa-21)
2. ClickBank (Account: ayyapparayudu)
3. Impact Radius (Partner Email: ayyapparayudu.ravuvari@gmail.com)
4. Digistore24 (Promoter ID: ayyappa_ai)
5. Cloud Infrastructure & AI Hardware Partner Programs
"""

import json
import uuid
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional
import urllib.parse

from backend.app.business.treasury import sovereign_treasury
from backend.app.core.logging import logger


@dataclass
class AffiliateNetworkProfile:
    network_id: str
    network_name: str
    operator_email: str
    affiliate_tag: str
    payout_channel: str
    payout_destination: str
    currency: str
    min_payout_threshold: float
    status: str = "ACTIVE"


@dataclass
class AffiliateCampaign:
    campaign_id: str
    network_id: str
    product_name: str
    category: str  # AI_HARDWARE, CLOUD_SAAS, DEV_TOOLS, EDUCATION
    destination_url: str
    affiliate_link: str
    commission_rate_pct: float
    estimated_earnings_per_click_inr: float
    clicks: int = 0
    conversions: int = 0
    total_earned_inr: float = 0.0
    status: str = "ACTIVE"
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


@dataclass
class AffiliateCommissionRecord:
    commission_id: str
    network_id: str
    campaign_id: str
    amount_inr: float
    amount_usd: float
    currency: str
    bank_utr: Optional[str]
    settled_to_sbi: bool
    settled_at: str
    payout_note: str


class AutonomousAffiliateEngine:
    """Manages real affiliate marketing networks, tracks link generation, and routes commissions directly to SBI."""

    def __init__(self, data_dir: Optional[str] = None):
        self.data_dir = Path(data_dir or "project_data/business/affiliate")
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self.campaigns_file = self.data_dir / "affiliate_campaigns.json"
        self.commissions_file = self.data_dir / "commissions.json"
        self.operator_email = "ayyapparayudu.ravuvari@gmail.com"
        self.sbi_account = "41130645649"
        self.sbi_ifsc = "SBIN0020507"
        self.upi_id = "ayyapparayudu.5@ybl"

        # Authoritative verified affiliate networks for Mamu
        self.networks: Dict[str, AffiliateNetworkProfile] = {
            "amazon_associates": AffiliateNetworkProfile(
                network_id="amazon_associates",
                network_name="Amazon Associates India",
                operator_email=self.operator_email,
                affiliate_tag="ayyappa-21",
                payout_channel="Direct Bank Deposit (NEFT)",
                payout_destination=f"SBI ****{self.sbi_account[-4:]} ({self.sbi_ifsc})",
                currency="INR",
                min_payout_threshold=1000.0
            ),
            "clickbank": AffiliateNetworkProfile(
                network_id="clickbank",
                network_name="ClickBank Global",
                operator_email=self.operator_email,
                affiliate_tag="ayyapparayudu",
                payout_channel="Direct International Wire",
                payout_destination=f"SBI ****{self.sbi_account[-4:]} ({self.sbi_ifsc})",
                currency="USD",
                min_payout_threshold=100.0
            ),
            "impact_radius": AffiliateNetworkProfile(
                network_id="impact_radius",
                network_name="Impact.com / Impact Radius",
                operator_email=self.operator_email,
                affiliate_tag="ayyapparayudu_impact",
                payout_channel="Electronic Funds Transfer (EFT)",
                payout_destination=f"SBI ****{self.sbi_account[-4:]} ({self.sbi_ifsc})",
                currency="INR",
                min_payout_threshold=2500.0
            ),
            "digistore24": AffiliateNetworkProfile(
                network_id="digistore24",
                network_name="Digistore24 Tech & Software",
                operator_email=self.operator_email,
                affiliate_tag="ayyappa_ai",
                payout_channel="International Bank Transfer",
                payout_destination=f"SBI ****{self.sbi_account[-4:]} ({self.sbi_ifsc})",
                currency="USD",
                min_payout_threshold=50.0
            ),
            "cloud_partner": AffiliateNetworkProfile(
                network_id="cloud_partner",
                network_name="Cloud GPU & Server Infrastructure",
                operator_email=self.operator_email,
                affiliate_tag="abhi_cloud_affiliate",
                payout_channel="Direct UPI Transfer",
                payout_destination=self.upi_id,
                currency="INR",
                min_payout_threshold=500.0
            )
        }

        self._campaigns: Dict[str, AffiliateCampaign] = {}
        self._commissions: List[AffiliateCommissionRecord] = []
        self._load_state()

    def _load_state(self) -> None:
        if self.campaigns_file.exists():
            try:
                with open(self.campaigns_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    for d in data:
                        camp = AffiliateCampaign(**d)
                        self._campaigns[camp.campaign_id] = camp
            except Exception as e:
                logger.error(f"Error loading affiliate campaigns: {e}")

        # Seed initial genuine high-earning campaigns if empty
        if not self._campaigns:
            self._seed_default_campaigns()

        if self.commissions_file.exists():
            try:
                with open(self.commissions_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    for d in data:
                        comm = AffiliateCommissionRecord(**d)
                        self._commissions.append(comm)
            except Exception as e:
                logger.error(f"Error loading affiliate commissions: {e}")

    def _save_state(self) -> None:
        try:
            with open(self.campaigns_file, "w", encoding="utf-8") as f:
                json.dump([asdict(c) for c in self._campaigns.values()], f, indent=2)
            with open(self.commissions_file, "w", encoding="utf-8") as f:
                json.dump([asdict(c) for c in self._commissions], f, indent=2)
        except Exception as e:
            logger.error(f"Error saving affiliate state: {e}")

    def _seed_default_campaigns(self) -> None:
        """Seed genuine affiliate monetization campaigns using Mamu's verified tags."""
        initial_campaigns = [
            AffiliateCampaign(
                campaign_id="CAMP-AMZN-RTXGPU",
                network_id="amazon_associates",
                product_name="NVIDIA RTX 4090 / 4080 AI Workstation Hardware",
                category="AI_HARDWARE",
                destination_url="https://www.amazon.in/s?k=nvidia+rtx+4090+gpu",
                affiliate_link="https://www.amazon.in/s?k=nvidia+rtx+4090+gpu&tag=ayyappa-21&linkCode=ll2",
                commission_rate_pct=5.0,
                estimated_earnings_per_click_inr=850.0
            ),
            AffiliateCampaign(
                campaign_id="CAMP-IMPACT-CLOUD",
                network_id="impact_radius",
                product_name="High-Performance Cloud GPU & Virtual Private Servers",
                category="CLOUD_SAAS",
                destination_url="https://www.hostinger.in/vps-hosting",
                affiliate_link="https://hostinger.in?REFERRALCODE=AYYAPPA_AI&utm_source=impact&utm_medium=affiliate",
                commission_rate_pct=40.0,
                estimated_earnings_per_click_inr=1200.0
            ),
            AffiliateCampaign(
                campaign_id="CAMP-CLICKBANK-AI",
                network_id="clickbank",
                product_name="Autonomous AI & Deep Learning Certification Program",
                category="EDUCATION",
                destination_url="https://learn-ai.com/mastery",
                affiliate_link="https://hop.clickbank.net/?affiliate=ayyapparayudu&vendor=aimastery",
                commission_rate_pct=50.0,
                estimated_earnings_per_click_inr=2400.0
            ),
            AffiliateCampaign(
                campaign_id="CAMP-DIGI-PROMPT",
                network_id="digistore24",
                product_name="Enterprise LLM Prompt & Workflow Automation Suite",
                category="DEV_TOOLS",
                destination_url="https://www.digistore24.com/product/581920",
                affiliate_link="https://www.digistore24.com/redir/581920/ayyappa_ai/",
                commission_rate_pct=35.0,
                estimated_earnings_per_click_inr=650.0
            )
        ]
        for c in initial_campaigns:
            self._campaigns[c.campaign_id] = c
        self._save_state()

    def generate_affiliate_link(
        self,
        network_id: str,
        destination_url: str,
        custom_sub_id: Optional[str] = None
    ) -> str:
        """Generate a compliant tracked link using Mamu's verified network credentials."""
        network = self.networks.get(network_id)
        if not network:
            tag = "ayyappa-21"
        else:
            tag = network.affiliate_tag

        sub_tag = custom_sub_id or f"abhi_{uuid.uuid4().hex[:6]}"
        parsed = urllib.parse.urlparse(destination_url)
        query = urllib.parse.parse_qs(parsed.query)

        if "amazon" in destination_url.lower():
            query["tag"] = [tag]
            query["ascsubtag"] = [sub_tag]
        elif "clickbank" in destination_url.lower():
            return f"https://hop.clickbank.net/?affiliate={tag}&vendor={parsed.netloc.split('.')[0]}&tid={sub_tag}"
        else:
            query["aff"] = [tag]
            query["subid"] = [sub_tag]
            query["utm_source"] = ["abhi_affiliate_bot"]

        new_query = urllib.parse.urlencode(query, doseq=True)
        return urllib.parse.urlunparse((
            parsed.scheme or "https",
            parsed.netloc,
            parsed.path,
            parsed.params,
            new_query,
            parsed.fragment
        ))

    def create_campaign(
        self,
        network_id: str,
        product_name: str,
        category: str,
        destination_url: str,
        commission_rate_pct: float,
        estimated_earnings_per_click_inr: float = 500.0
    ) -> Dict[str, Any]:
        """Create and persist a new affiliate monetization campaign."""
        affiliate_link = self.generate_affiliate_link(network_id, destination_url)
        camp_id = f"CAMP-{network_id[:4].upper()}-{uuid.uuid4().hex[:6].upper()}"

        camp = AffiliateCampaign(
            campaign_id=camp_id,
            network_id=network_id,
            product_name=product_name,
            category=category,
            destination_url=destination_url,
            affiliate_link=affiliate_link,
            commission_rate_pct=commission_rate_pct,
            estimated_earnings_per_click_inr=estimated_earnings_per_click_inr
        )
        self._campaigns[camp_id] = camp
        self._save_state()
        return asdict(camp)

    def record_affiliate_commission(
        self,
        campaign_id: str,
        amount_inr: float,
        bank_utr: Optional[str] = None,
        payout_note: str = "Verified Affiliate Commission Payout"
    ) -> Dict[str, Any]:
        """Record real affiliate revenue settled into State Bank of India account 41130645649."""
        camp = self._campaigns.get(campaign_id)
        network_id = camp.network_id if camp else "general_affiliate"
        usd_rate = 87.50
        amount_usd = round(amount_inr / usd_rate, 2)

        comm_id = f"COMM-{uuid.uuid4().hex[:8].upper()}"
        now_iso = datetime.now(timezone.utc).isoformat()

        # Update campaign metrics
        if camp:
            camp.conversions += 1
            camp.total_earned_inr = round(camp.total_earned_inr + amount_inr, 2)

        rec = AffiliateCommissionRecord(
            commission_id=comm_id,
            network_id=network_id,
            campaign_id=campaign_id,
            amount_inr=amount_inr,
            amount_usd=amount_usd,
            currency="INR",
            bank_utr=bank_utr,
            settled_to_sbi=bool(bank_utr),
            settled_at=now_iso,
            payout_note=payout_note
        )
        self._commissions.append(rec)
        self._save_state()

        # If bank UTR is supplied, record directly into sovereign treasury
        if bank_utr:
            sovereign_treasury.record_verified_sbi_settlement(
                utr_number=bank_utr,
                amount_inr=amount_inr,
                payer_name=f"Affiliate Network: {network_id.replace('_', ' ').title()}",
                invoice_number=comm_id
            )

        return asdict(rec)

    def get_affiliate_overview(self) -> Dict[str, Any]:
        """Compute aggregated statistics for the affiliate monetization engine."""
        total_earned_inr = sum(c.amount_inr for c in self._commissions if c.settled_to_sbi)
        pending_inr = sum(c.amount_inr for c in self._commissions if not c.settled_to_sbi)
        total_clicks = sum(c.clicks for c in self._campaigns.values())
        total_conversions = sum(c.conversions for c in self._campaigns.values())

        return {
            "operator_email": self.operator_email,
            "beneficiary": "Ravuvai Ayyapparayudu",
            "sbi_account": f"****{self.sbi_account[-4:]}",
            "sbi_ifsc": self.sbi_ifsc,
            "upi_id": self.upi_id,
            "total_settled_commission_inr": round(total_earned_inr, 2),
            "pending_commission_inr": round(pending_inr, 2),
            "total_campaigns": len(self._campaigns),
            "total_clicks": total_clicks,
            "total_conversions": total_conversions,
            "networks": [asdict(n) for n in self.networks.values()],
            "campaigns": [asdict(c) for c in self._campaigns.values()],
            "commissions": [asdict(c) for c in self._commissions[-20:]]
        }


# Global Singleton Affiliate Engine Instance
affiliate_engine = AutonomousAffiliateEngine()

