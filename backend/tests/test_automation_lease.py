"""Unit tests for AutomationLease, renewable lifetimes, and IPC policy enforcement."""

import time
import pytest
from backend.app.cognitive.actions.lease import (
    AutomationLease,
    LeaseManager,
    IPCErrorCode,
    IPCPolicyError
)


def test_lease_issuance_and_consumption():
    lm = LeaseManager()
    lease = lm.issue_lease(
        task_id="task_001",
        agent_id="os_desktop_agent",
        initial_ttl_seconds=10.0,
        max_actions=3
    )
    assert lease.is_valid is True
    assert lease.actions_consumed == 0

    # 1st action
    err1 = lm.validate_and_consume(lease.lease_id)
    assert err1 is None
    assert lease.actions_consumed == 1

    # 2nd action
    err2 = lm.validate_and_consume(lease.lease_id)
    assert err2 is None
    assert lease.actions_consumed == 2

    # 3rd action
    err3 = lm.validate_and_consume(lease.lease_id)
    assert err3 is None
    assert lease.actions_consumed == 3

    # 4th action exceeds quota
    err4 = lm.validate_and_consume(lease.lease_id)
    assert err4 is not None
    assert err4.error_code == IPCErrorCode.LEASE_EXHAUSTED


def test_lease_expiration():
    lm = LeaseManager()
    lease = lm.issue_lease(
        task_id="task_002",
        agent_id="browser_agent",
        initial_ttl_seconds=0.05
    )
    time.sleep(0.1)
    err = lm.validate_and_consume(lease.lease_id)
    assert err is not None
    assert err.error_code == IPCErrorCode.LEASE_EXPIRED


def test_lease_renewal():
    lm = LeaseManager()
    lease = lm.issue_lease(
        task_id="task_003",
        agent_id="os_desktop_agent",
        initial_ttl_seconds=2.0
    )
    initial_exp = lease.expires_at
    time.sleep(0.05)
    renewed = lease.renew(extension_seconds=10.0)
    assert renewed is True
    assert lease.expires_at > initial_exp
    assert lease.renewal_count == 1


def test_lease_revocation():
    lm = LeaseManager()
    lease = lm.issue_lease(
        task_id="task_004",
        agent_id="browser_agent"
    )
    assert lease.is_valid is True

    lm.revoke_all_for_task("task_004", reason="Emergency Open Palm gesture")
    err = lm.validate_and_consume(lease.lease_id)
    assert err is not None
    assert err.error_code == IPCErrorCode.LEASE_REVOKED
