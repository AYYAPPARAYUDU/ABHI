"""ABHI Runtime Lifecycle Coordinator & State Machine Engine.

Controls runtime operational modes (ARMED, LISTENING, ACTIVE, RESTING, LOCKED, EMERGENCY_STOP),
power policies for audio/camera perception, and secure activation transitions.
"""

import time
from typing import Any, Dict, Optional, Tuple
from backend.app.core.logging import logger
from backend.app.runtime.models import (
    IdentityLevel,
    PowerPolicy,
    RuntimeMode,
    RuntimeStateSummary
)
from backend.app.runtime.auth import local_auth_manager
from backend.app.runtime.wake_word import wake_word_detector


class RuntimeLifecycleCoordinator:
    """Authoritative coordinator for ABHI application lifecycle & activation."""

    def __init__(self):
        self.mode: RuntimeMode = RuntimeMode.ARMED
        self.identity_level: IdentityLevel = IdentityLevel.LEVEL_1_WAKE_WORD
        self.start_time: float = time.time()
        self.last_wake_time: Optional[float] = None
        self.active_user: str = "local_operator"

    def get_state_summary(self) -> RuntimeStateSummary:
        """Return comprehensive snapshot of runtime state and power policies."""
        is_locked, lockout_rem = local_auth_manager.is_locked_out()
        uptime = round(time.time() - self.start_time, 1)

        # Compute power policies based on runtime state
        cam_policy = PowerPolicy.FULL if self.mode == RuntimeMode.ACTIVE else (
            PowerPolicy.LOW_POWER if self.mode == RuntimeMode.ARMED else PowerPolicy.DORMANT
        )
        mic_policy = PowerPolicy.FULL if self.mode in [RuntimeMode.LISTENING, RuntimeMode.ACTIVE] else (
            PowerPolicy.LOW_POWER if self.mode in [RuntimeMode.ARMED, RuntimeMode.RESTING] else PowerPolicy.OFF
        )

        return RuntimeStateSummary(
            current_mode=self.mode,
            identity_level=self.identity_level,
            is_locked=self.mode == RuntimeMode.LOCKED,
            is_listening=self.mode == RuntimeMode.LISTENING,
            is_resting=self.mode == RuntimeMode.RESTING,
            wake_word_active=self.mode in [RuntimeMode.ARMED, RuntimeMode.RESTING],
            camera_power_policy=cam_policy,
            microphone_power_policy=mic_policy,
            last_wake_timestamp=self.last_wake_time,
            uptime_sec=uptime,
            active_user=self.active_user,
            lockout_remaining_sec=lockout_rem
        )

    def transition_to_wake(self, source: str = "wake_word") -> Tuple[bool, str]:
        """Transition from ARMED/RESTING to LISTENING/ACTIVE upon wake word or explicit intent."""
        if self.mode == RuntimeMode.LOCKED:
            return False, "Cannot wake: ABHI is locked. Enter PIN to unlock."
        if self.mode == RuntimeMode.EMERGENCY_STOP:
            return False, "Cannot wake: Emergency Stop is active. Clear emergency stop first."

        self.mode = RuntimeMode.LISTENING
        self.last_wake_time = time.time()
        self.identity_level = IdentityLevel.LEVEL_1_WAKE_WORD if source == "wake_word" else IdentityLevel.LEVEL_2_LOCAL_PRESENCE
        logger.info(f"ABHI awakened (source={source}). Current mode: LISTENING.")
        return True, "ABHI is awake and listening."

    def transition_to_rest(self, reason: str = "user_command") -> Tuple[bool, str]:
        """Transition from ACTIVE/ARMED to lightweight RESTING state."""
        if self.mode == RuntimeMode.EMERGENCY_STOP:
            return False, "Cannot rest: Emergency Stop is active."

        self.mode = RuntimeMode.RESTING
        logger.info(f"ABHI entered RESTING mode (reason={reason}). Heavy models and vision dormant.")
        return True, "ABHI is now resting. Say 'ABHI' to wake."

    def transition_to_armed(self) -> Tuple[bool, str]:
        """Transition to baseline ARMED state (lightweight wake-word active)."""
        if self.mode == RuntimeMode.LOCKED:
            return False, "Cannot arm: ABHI is locked."
        if self.mode == RuntimeMode.EMERGENCY_STOP:
            return False, "Cannot arm: Emergency Stop is active."

        self.mode = RuntimeMode.ARMED
        logger.info("ABHI transitioned to ARMED state.")
        return True, "ABHI is armed and ready for wake word."

    def lock_assistant(self) -> Tuple[bool, str]:
        """Lock ABHI application state requiring local PIN verification to resume."""
        self.mode = RuntimeMode.LOCKED
        self.identity_level = IdentityLevel.LEVEL_0_ANONYMOUS
        logger.warning("ABHI application locked.")
        return True, "ABHI locked successfully."

    def unlock_assistant(self, pin: str) -> Tuple[bool, str]:
        """Unlock ABHI application state using local PIN verification."""
        success, msg = local_auth_manager.verify_pin(pin)
        if not success:
            return False, msg

        self.mode = RuntimeMode.ARMED
        self.identity_level = IdentityLevel.LEVEL_2_LOCAL_PRESENCE
        logger.info("ABHI unlocked successfully via local PIN.")
        return True, "ABHI unlocked. Transitioned to ARMED."

    def trigger_emergency_stop(self) -> Tuple[bool, str]:
        """Put runtime into fail-closed EMERGENCY_STOP state."""
        self.mode = RuntimeMode.EMERGENCY_STOP
        logger.critical("ABHI Runtime entered EMERGENCY_STOP state.")
        return True, "Emergency Stop activated."

    def clear_emergency_stop(self) -> Tuple[bool, str]:
        """Clear Emergency Stop and restore ARMED state."""
        self.mode = RuntimeMode.ARMED
        logger.info("ABHI Emergency Stop cleared. Restored to ARMED.")
        return True, "Emergency stop cleared. ABHI restored to ARMED."


# Global singleton
runtime_coordinator = RuntimeLifecycleCoordinator()
