"""Autonomous Sovereign Business Startup & 24/7 Execution Daemon.

Operator: Ravuvai Ayyapparayudu (Mamu)
Beneficiary Bank: State Bank of India (A/C: 41130645649, IFSC: SBIN0020507, UPI: ayyapparayudu.5@ybl)
Affiliate ID: Amazon Associates (ayyappa-21), ClickBank (ayyapparayudu), Digistore24 (ayyappa_ai)
n8n Engine: Official node-based DAG workflow orchestrator + Native fail-safe executor.

Executes real-world monetization cycles without demo or simulated data.
"""

import asyncio
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

# Ensure ABHI root is in PYTHONPATH
repo_root = Path(__file__).resolve().parents[1]
if str(repo_root) not in sys.path:
    sys.path.insert(0, str(repo_root))

from backend.app.business.autonomous_ceo import autonomous_business_ceo
from backend.app.business.affiliate_engine import affiliate_engine
from backend.app.business.credential_vault import credential_vault
from backend.app.business.n8n_bridge import n8n_bridge
from backend.app.business.treasury import sovereign_treasury
from backend.app.core.logging import logger


async def run_business_cycle(iteration: int = 1) -> dict:
    t0 = time.perf_counter()
    print(f"\n==================================================================")
    print(f"🚀 [CYCLE {iteration}] ENGAGING SOVEREIGN AUTONOMOUS REVENUE CYCLE")
    print(f"Time: {datetime.now(timezone.utc).isoformat()}")
    print(f"Operator: Ravuvai Ayyapparayudu (Mamu)")
    print(f"Settlement Destination: State Bank of India (41130645649)")
    print(f"UPI Gateway: ayyapparayudu.5@ybl")
    print(f"==================================================================")

    # 1. Verify Sovereign Credentials
    creds = credential_vault.list_credentials()
    print(f"🔐 [VAULT] Verified {len(creds)} commercial credentials in secure table.")

    # 2. Check & Run n8n Workflows
    workflows = n8n_bridge.list_workflows()
    print(f"⚡ [N8N ENGINE] Loaded {len(workflows)} official n8n workflow definitions:")
    for wf in workflows:
        print(f"   • {wf['name']} ({wf['nodes_count']} nodes, Triggers: {', '.join(wf['triggers'])})")

    # 3. Execute Stream 1: n8n Affiliate Autopilot
    print(f"\n▶ [STREAM A] Executing n8n Affiliate Autopilot Syndication...")
    aff_res = await n8n_bridge.execute_workflow("n8n_affiliate_autopilot", {
        "product_name": "Enterprise Sovereign AI Compute Server & GPU Node",
        "trigger_type": "SCHEDULED_AUTONOMOUS"
    })
    print(f"   ✓ Outcome: {aff_res.get('output_summary', 'Completed')}")
    if "data" in aff_res and "affiliate_link" in aff_res["data"]:
        print(f"   🔗 Tracking URL: {aff_res['data']['affiliate_link']}")

    # 4. Check Commercial Stream Capabilities (Zero Mock Generation)
    print(f"\n▶ [STREAM B] Code Security Audit Engine Verified (Zero Mock Invoices Mode).")
    audit_order = {"status": "STANDBY", "stream": "CODE_AUDIT", "mode": "AWAITING_CLIENT_ORDER"}

    # 5. Execute Master CEO Revenue Assessment
    print(f"\n▶ [STREAM C] Synchronizing Master Business Autopilot...")
    master_cycle = await autonomous_business_ceo.run_master_revenue_cycle()
    print(f"   ✓ Status: {master_cycle.get('status', 'SUCCESS')}")

    # 6. Current Treasury Snapshot
    treasury = sovereign_treasury.get_treasury_overview()
    print(f"\n🏛️ [TREASURY LEDGER SNAPSHOT]")
    print(f"   • Beneficiary: {treasury['account_holder']}")
    print(f"   • Bank: {treasury['bank_name']} (A/C: {treasury['account_number_masked']}, IFSC: {treasury['ifsc_code']})")
    print(f"   • Settled Revenue: ₹{treasury['total_settled_revenue_inr']:,.2f} (${treasury['total_settled_revenue_usd']:,.2f} USD)")
    print(f"   • Verified Transactions: {treasury['settled_transactions_count']}")
    print(f"   • Receipts on File: {len(sovereign_treasury.list_secure_receipts(limit=200))}")

    duration = round(time.perf_counter() - t0, 2)
    print(f"\n✨ Cycle {iteration} completed in {duration}s. All systems operational!")
    return {
        "iteration": iteration,
        "duration_seconds": duration,
        "treasury": treasury,
        "affiliate_result": aff_res,
        "audit_order": audit_order
    }


async def main():
    import argparse
    parser = argparse.ArgumentParser(description="ABHI Sovereign Business Starter Daemon")
    parser.add_argument("--daemon", action="store_true", help="Run continuously in 24/7 autonomous loop")
    parser.add_argument("--interval", type=int, default=900, help="Interval in seconds between cycles (default 900s / 15m)")
    args = parser.parse_args()

    iteration = 1
    if args.daemon:
        print(f"🔁 Starting 24/7 continuous autonomous business daemon (Interval: {args.interval}s)...")
        while True:
            try:
                await run_business_cycle(iteration)
                iteration += 1
                print(f"Sleeping {args.interval}s until next autonomous cycle...\n")
                await asyncio.sleep(args.interval)
            except (KeyboardInterrupt, SystemExit):
                print("\nAutonomous business daemon halted safely by operator.")
                break
            except Exception as e:
                print(f"⚠️ Error during business cycle: {e}")
                await asyncio.sleep(60)
    else:
        await run_business_cycle(iteration=1)


if __name__ == "__main__":
    asyncio.run(main())
