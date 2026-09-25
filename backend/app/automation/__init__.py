"""Phase 5 Automation Core Package."""

from backend.app.automation.models.actions import (
    GroundingLevel,
    ActionType,
    BoundingBoxCoord,
    ActionGrounding,
    ExecutionAction,
    ObservedState,
    ActionResult
)
from backend.app.automation.models.errors import AutomationError, AutomationErrorCode
from backend.app.automation.leases.lease_manager import AutomationLease, LeaseManager, lease_manager
from backend.app.automation.policy.safety_policy import SafetyPolicyEngine, safety_policy
from backend.app.automation.grounding.desktop_grounder import DesktopGrounder, desktop_grounder
from backend.app.automation.grounding.browser_grounder import BrowserGrounder, browser_grounder
from backend.app.automation.desktop.windows_worker import WindowsAutomationWorker, windows_worker
from backend.app.automation.browser.browser_worker import BrowserAutomationWorker, browser_worker
from backend.app.automation.verification.action_verifier import ActionVerifier, PhysicalVerificationResult, action_verifier
from backend.app.automation.pipeline.executor import ExecutionPipeline, PipelineExecutionResult, execution_pipeline

__all__ = [
    "GroundingLevel",
    "ActionType",
    "BoundingBoxCoord",
    "ActionGrounding",
    "ExecutionAction",
    "ObservedState",
    "ActionResult",
    "AutomationError",
    "AutomationErrorCode",
    "AutomationLease",
    "LeaseManager",
    "lease_manager",
    "SafetyPolicyEngine",
    "safety_policy",
    "DesktopGrounder",
    "desktop_grounder",
    "BrowserGrounder",
    "browser_grounder",
    "WindowsAutomationWorker",
    "windows_worker",
    "BrowserAutomationWorker",
    "browser_worker",
    "ActionVerifier",
    "PhysicalVerificationResult",
    "action_verifier",
    "ExecutionPipeline",
    "PipelineExecutionResult",
    "execution_pipeline"
]
