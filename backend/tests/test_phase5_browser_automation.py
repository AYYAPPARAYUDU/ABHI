"""Unit and integration tests for Phase 5 Stage 5.1 Browser Automation."""

import pytest
from backend.app.automation.browser.browser_worker import BrowserAutomationWorker
from backend.app.automation.browser.mock_page import MockLocalBrowserPage
from backend.app.automation.grounding.browser_grounder import BrowserGrounder
from backend.app.automation.leases.lease_manager import LeaseManager
from backend.app.automation.models.actions import (
    ExecutionAction,
    ActionType,
    ActionGrounding,
    GroundingLevel
)
from backend.app.automation.models.errors import AutomationErrorCode
from backend.app.automation.pipeline.executor import ExecutionPipeline
from backend.app.automation.policy.safety_policy import SafetyPolicyEngine
from backend.app.automation.verification.action_verifier import ActionVerifier


@pytest.fixture
def browser_pipeline():
    page = MockLocalBrowserPage()
    leases = LeaseManager()
    policy = SafetyPolicyEngine()
    grounder = BrowserGrounder()
    worker = BrowserAutomationWorker(target_page=page)
    verifier = ActionVerifier()
    pipe = ExecutionPipeline(
        policy=policy,
        leases=leases,
        web_grounder=grounder,
        web_worker=worker,
        verifier=verifier
    )
    return pipe, page, leases, worker


def test_browser_dom_inspection_and_grounding(browser_pipeline):
    pipe, page, leases, worker = browser_pipeline
    dom, err = worker.inspect_dom()
    assert err is None
    assert len(dom) >= 4

    # Ground search button
    grounding, g_err = pipe.browser_grounder.ground_dom_element("Search", dom_snapshot=dom)
    assert g_err is None
    assert grounding is not None
    assert grounding.source == GroundingLevel.LEVEL_1_UIA
    assert grounding.target_identity == "btn_search"
    assert grounding.confidence >= 0.95


def test_browser_harmless_click_and_dom_verification(browser_pipeline):
    pipe, page, leases, worker = browser_pipeline
    dom, _ = worker.inspect_dom()
    grounding, _ = pipe.browser_grounder.ground_dom_element("Search", dom_snapshot=dom)

    lease = leases.acquire_lease(task_id="task_web_01", execution_id="exec_web_01", agent_id="browser_agent")

    action = ExecutionAction(
        action_id="act_web_search_01",
        task_id="task_web_01",
        execution_id="exec_web_01",
        lease_id=lease.lease_id,
        action_type=ActionType.BROWSER_CLICK,
        grounding=grounding,
        precondition="DOM search button is present and enabled",
        expected_postcondition="DOM status is SEARCH_COMPLETED"
    )

    res = pipe.run_browser_action(action)
    assert res.is_success is True
    assert res.stage_reached == "COMPLETED"
    assert res.verification.is_verified is True
    assert page.status_text == "SEARCH_COMPLETED"
    assert page.click_count == 1


def test_browser_ambiguity_detection(browser_pipeline):
    pipe, page, leases, worker = browser_pipeline
    ambiguous_dom = [
        {"role": "button", "text": "Submit Form", "test_id": "btn_1", "is_enabled": True},
        {"role": "button", "text": "Submit Form", "test_id": "btn_2", "is_enabled": True}
    ]

    grounding, err = pipe.browser_grounder.ground_dom_element("Submit Form", dom_snapshot=ambiguous_dom)
    assert grounding is None
    assert err is not None
    assert err.error_code == AutomationErrorCode.GROUNDING_AMBIGUOUS
