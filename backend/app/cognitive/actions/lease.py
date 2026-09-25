"""Renewable Automation Execution Lease Model.

Guarantees that physical OS and browser automation sessions cannot run away,
survive supervisor crashes, or proceed with expired credentials.
"""

import time
import uuid
from enum import Enum
from typing import Any, Dict, Optional
from pydantic import BaseModel, Field


class LeaseStatus(str, Enum):
    ACTIVE = "ACTIVE"
    EXPIRED = "EXPIRED"
    REVOKED = "REVOKED"
    EXHAUSTED = "EXHAUSTED"


class IPCErrorCode(str, Enum):
    LEASE_EXPIRED = "LEASE_EXPIRED"
    LEASE_REVOKED = "LEASE_REVOKED"
    LEASE_EXHAUSTED = "LEASE_EXHAUSTED"
    INVALID_LEASE = "INVALID_LEASE"
    CONTENTION_INTERRUPT = "CONTENTION_INTERRUPT"
    EMERGENCY_STOP = "EMERGENCY_STOP"


class IPCPolicyError(BaseModel):
    """Canonical typed error envelope across subprocess IPC boundaries."""
    error_code: IPCErrorCode
    message: str
    lease_id: str
    task_id: str
    timestamp: float = Field(default_factory=time.time)


class AutomationLease(BaseModel):
    """Renewable time-bound execution authorization token."""
    lease_id: str = Field(default_factory=lambda: f"lease_{uuid.uuid4().hex[:12]}")
    task_id: str
    execution_id: str = Field(default_factory=lambda: f"exec_{uuid.uuid4().hex[:8]}")
    agent_id: str
    risk_tier: str = "Tier 1"
    issued_at: float = Field(default_factory=time.time)
    expires_at: float = Field(default_factory=lambda: time.time() + 15.0)  # Initial TTL: 15s
    initial_ttl_seconds: float = 15.0
    renewal_interval_seconds: float = 10.0
    max_absolute_lifetime_seconds: float = 120.0
    renewal_count: int = 0
    max_actions: int = 20
    actions_consumed: int = 0
    is_revoked: bool = False
    revocation_reason: Optional[str] = None

    @property
    def is_valid(self) -> bool:
        """Check if lease is currently valid for executing a physical action."""
        now = time.time()
        if self.is_revoked:
            return False
        if now > self.expires_at:
            return False
        if (now - self.issued_at) > self.max_absolute_lifetime_seconds:
            return False
        if self.actions_consumed >= self.max_actions:
            return False
        return True

    def consume_action(self) -> None:
        """Increment consumed action count."""
        self.actions_consumed += 1

    def renew(self, extension_seconds: float = 15.0) -> bool:
        """Attempt to renew the lease before expiration."""
        now = time.time()
        if self.is_revoked:
            return False
        if (now - self.issued_at + extension_seconds) > self.max_absolute_lifetime_seconds:
            # Cannot exceed maximum absolute lifetime
            remaining = self.max_absolute_lifetime_seconds - (now - self.issued_at)
            if remaining <= 0:
                return False
            self.expires_at = now + remaining
        else:
            self.expires_at = now + extension_seconds

        self.renewal_count += 1
        return True

    def revoke(self, reason: str = "Operator override or emergency stop") -> None:
        """Immediately revoke authorization."""
        self.is_revoked = True
        self.revocation_reason = reason


class LeaseManager:
    """Manages automation leases across supervisor and worker boundaries."""

    def __init__(self):
        self._leases: Dict[str, AutomationLease] = {}

    def issue_lease(
        self,
        task_id: str,
        agent_id: str,
        risk_tier: str = "Tier 1",
        initial_ttl_seconds: float = 15.0,
        max_actions: int = 20,
        max_absolute_lifetime_seconds: float = 120.0
    ) -> AutomationLease:
        """Issue a new renewable automation lease."""
        lease = AutomationLease(
            task_id=task_id,
            agent_id=agent_id,
            risk_tier=risk_tier,
            initial_ttl_seconds=initial_ttl_seconds,
            expires_at=time.time() + initial_ttl_seconds,
            max_actions=max_actions,
            max_absolute_lifetime_seconds=max_absolute_lifetime_seconds
        )
        self._leases[lease.lease_id] = lease
        return lease

    def get_lease(self, lease_id: str) -> Optional[AutomationLease]:
        return self._leases.get(lease_id)

    def validate_and_consume(self, lease_id: str) -> Optional[IPCPolicyError]:
        """Validate lease validity prior to physical action admission."""
        lease = self._leases.get(lease_id)
        if not lease:
            return IPCPolicyError(
                error_code=IPCErrorCode.INVALID_LEASE,
                message="Lease not found or expired from registry",
                lease_id=lease_id,
                task_id="unknown"
            )

        if lease.is_revoked:
            return IPCPolicyError(
                error_code=IPCErrorCode.LEASE_REVOKED,
                message=f"Lease revoked: {lease.revocation_reason}",
                lease_id=lease_id,
                task_id=lease.task_id
            )

        if time.time() > lease.expires_at:
            return IPCPolicyError(
                error_code=IPCErrorCode.LEASE_EXPIRED,
                message="Lease has expired. Renewal required.",
                lease_id=lease_id,
                task_id=lease.task_id
            )

        if lease.actions_consumed >= lease.max_actions:
            return IPCPolicyError(
                error_code=IPCErrorCode.LEASE_EXHAUSTED,
                message="Maximum actions quota reached for this lease.",
                lease_id=lease_id,
                task_id=lease.task_id
            )

        lease.consume_action()
        return None

    def revoke_all_for_task(self, task_id: str, reason: str = "Emergency stop"):
        """Revoke all leases for a task."""
        for lease in self._leases.values():
            if lease.task_id == task_id:
                lease.revoke(reason)


# Singleton
lease_manager = LeaseManager()
