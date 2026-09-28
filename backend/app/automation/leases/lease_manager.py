"""Automation Execution Lease Manager.

Provides cryptographic/token-based time-bound authorization leases that govern
physical execution across Windows desktop and browser automation boundaries.
"""

import time
import uuid
from typing import Dict, Optional, Tuple
from pydantic import BaseModel, Field

from backend.app.automation.models.errors import AutomationError, AutomationErrorCode


class AutomationLease(BaseModel):
    """Renewable time-bound execution authorization token."""
    lease_id: str = Field(default_factory=lambda: f"lease_{uuid.uuid4().hex[:12]}")
    task_id: str
    execution_id: str
    agent_id: str
    risk_tier: str = "Tier 1"
    issued_at: float = Field(default_factory=time.time)
    expires_at: float = Field(default_factory=lambda: time.time() + 15.0)  # Initial TTL: 15s
    initial_ttl_seconds: float = 15.0
    renewal_interval_seconds: float = 10.0
    max_absolute_lifetime_seconds: float = 120.0
    absolute_expiry: float = Field(default_factory=lambda: time.time() + 120.0)
    renewal_count: int = 0
    renewable: bool = True
    max_actions: int = 20
    actions_used: int = 0
    revoked: bool = False
    revocation_reason: Optional[str] = None
    current_action_id: Optional[str] = None

    @property
    def is_valid(self) -> bool:
        """Check if lease is currently valid for executing a physical action."""
        now = time.time()
        if self.revoked:
            return False
        if now > self.expires_at:
            return False
        if now > self.absolute_expiry:
            return False
        if self.actions_used >= self.max_actions:
            return False
        return True

    def consume_action(self, action_id: str) -> None:
        """Increment consumed action count atomically."""
        self.actions_used += 1
        self.current_action_id = action_id

    def renew(self, extension_seconds: float = 15.0) -> bool:
        """Attempt to renew the lease before expiration."""
        if not self.renewable or self.revoked:
            return False
        now = time.time()
        if now > self.absolute_expiry:
            return False

        new_expires_at = now + extension_seconds
        if new_expires_at > self.absolute_expiry:
            new_expires_at = self.absolute_expiry

        if new_expires_at <= now:
            return False

        self.expires_at = new_expires_at
        self.renewal_count += 1
        return True

    def revoke(self, reason: str = "Emergency stop or user override") -> None:
        """Immediately revoke authorization."""
        self.revoked = True
        self.revocation_reason = reason


class LeaseManager:
    """Manages automation leases with fail-closed semantics."""

    def __init__(self):
        self._leases: Dict[str, AutomationLease] = {}

    def acquire_lease(
        self,
        task_id: str,
        execution_id: str,
        agent_id: str,
        risk_tier: str = "Tier 1",
        initial_ttl_seconds: float = 15.0,
        max_actions: int = 20,
        max_absolute_lifetime_seconds: float = 120.0,
        renewable: bool = True
    ) -> AutomationLease:
        """Issue a new renewable automation lease."""
        now = time.time()
        lease = AutomationLease(
            task_id=task_id,
            execution_id=execution_id,
            agent_id=agent_id,
            risk_tier=risk_tier,
            issued_at=now,
            initial_ttl_seconds=initial_ttl_seconds,
            expires_at=now + initial_ttl_seconds,
            max_absolute_lifetime_seconds=max_absolute_lifetime_seconds,
            absolute_expiry=now + max_absolute_lifetime_seconds,
            max_actions=max_actions,
            renewable=renewable
        )
        self._leases[lease.lease_id] = lease
        return lease

    def get_lease(self, lease_id: str) -> Optional[AutomationLease]:
        return self._leases.get(lease_id)

    def validate_lease(
        self,
        lease_id: str,
        task_id: Optional[str] = None,
        execution_id: Optional[str] = None
    ) -> Tuple[bool, Optional[AutomationError]]:
        """Validate lease validity prior to physical action admission (Fail-Closed)."""
        lease = self._leases.get(lease_id)
        if not lease:
            return False, AutomationError(
                error_code=AutomationErrorCode.LEASE_MISSING,
                message="Lease not found in active registry (Worker must fail closed).",
                lease_id=lease_id,
                task_id=task_id
            )

        if task_id and lease.task_id != task_id:
            return False, AutomationError(
                error_code=AutomationErrorCode.LEASE_REVOKED,
                message=f"Lease {lease_id} does not belong to task {task_id}.",
                lease_id=lease_id,
                task_id=task_id
            )

        if execution_id and lease.execution_id != execution_id:
            return False, AutomationError(
                error_code=AutomationErrorCode.LEASE_REVOKED,
                message=f"Lease {lease_id} does not belong to execution {execution_id}.",
                lease_id=lease_id,
                task_id=task_id
            )

        if lease.revoked:
            return False, AutomationError(
                error_code=AutomationErrorCode.LEASE_REVOKED,
                message=f"Lease has been revoked: {lease.revocation_reason}",
                lease_id=lease_id,
                task_id=lease.task_id
            )

        now = time.time()
        if now > lease.expires_at or now > lease.absolute_expiry:
            return False, AutomationError(
                error_code=AutomationErrorCode.LEASE_EXPIRED,
                message="Lease has expired. Renewal required before physical execution.",
                lease_id=lease_id,
                task_id=lease.task_id
            )

        if lease.actions_used >= lease.max_actions:
            return False, AutomationError(
                error_code=AutomationErrorCode.LEASE_LIMIT_EXCEEDED,
                message=f"Lease actions limit exceeded ({lease.actions_used}/{lease.max_actions}).",
                lease_id=lease_id,
                task_id=lease.task_id
            )

        return True, None

    def consume_action(self, lease_id: str, action_id: str) -> Tuple[bool, Optional[AutomationError]]:
        """Validate and atomically increment action consumption count."""
        is_valid, err = self.validate_lease(lease_id)
        if not is_valid or err:
            return False, err

        lease = self._leases[lease_id]
        lease.consume_action(action_id)
        return True, None

    def renew_lease(self, lease_id: str, extension_seconds: float = 15.0) -> Tuple[bool, Optional[AutomationError]]:
        """Renew an existing lease."""
        lease = self._leases.get(lease_id)
        if not lease:
            return False, AutomationError(
                error_code=AutomationErrorCode.LEASE_MISSING,
                message="Cannot renew non-existent lease.",
                lease_id=lease_id
            )

        ok = lease.renew(extension_seconds)
        if not ok:
            return False, AutomationError(
                error_code=AutomationErrorCode.LEASE_EXPIRED,
                message="Lease renewal failed: absolute lifetime exceeded or lease revoked.",
                lease_id=lease_id,
                task_id=lease.task_id
            )
        return True, None

    def revoke_lease(self, lease_id: str, reason: str = "User cancellation") -> None:
        """Revoke a single lease."""
        lease = self._leases.get(lease_id)
        if lease:
            lease.revoke(reason)

    def revoke_all_for_task(self, task_id: str, reason: str = "Emergency stop") -> int:
        """Revoke all active leases for a given task ID."""
        count = 0
        for lease in self._leases.values():
            if lease.task_id == task_id and not lease.revoked:
                lease.revoke(reason)
                count += 1
        return count

    def release_lease(self, lease_id: str, task_id: Optional[str] = None) -> None:
        """Cleanly release and deactivate an execution lease."""
        lease = self._leases.get(lease_id)
        if lease:
            lease.revoke(reason="Execution completed / lease released")


# Singleton
lease_manager = LeaseManager()
