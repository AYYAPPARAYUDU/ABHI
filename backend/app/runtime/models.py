"""Data models and enums for ABHI Runtime Lifecycle & Activation."""

from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class RuntimeMode(str, Enum):
    STOPPED = "STOPPED"
    STARTING = "STARTING"
    ARMED = "ARMED"
    LISTENING = "LISTENING"
    PROCESSING = "PROCESSING"
    ACTIVE = "ACTIVE"
    RESTING = "RESTING"
    LOCKED = "LOCKED"
    EMERGENCY_STOP = "EMERGENCY_STOP"


class IdentityLevel(str, Enum):
    LEVEL_0_ANONYMOUS = "LEVEL_0_ANONYMOUS"
    LEVEL_1_WAKE_WORD = "LEVEL_1_WAKE_WORD"
    LEVEL_2_LOCAL_PRESENCE = "LEVEL_2_LOCAL_PRESENCE"
    LEVEL_3_OPERATOR_CONSENT = "LEVEL_3_OPERATOR_CONSENT"
    LEVEL_4_WINDOWS_HELLO = "LEVEL_4_WINDOWS_HELLO"


class PowerPolicy(str, Enum):
    FULL = "FULL"
    LOW_POWER = "LOW_POWER"
    DORMANT = "DORMANT"
    OFF = "OFF"


class WakeWordEvent(BaseModel):
    keyword: str = "ABHI"
    detected: bool = True
    confidence: float = 0.95
    timestamp: float
    cooldown_remaining_sec: float = 0.0


class RuntimeStateSummary(BaseModel):
    current_mode: RuntimeMode = RuntimeMode.ARMED
    identity_level: IdentityLevel = IdentityLevel.LEVEL_1_WAKE_WORD
    is_locked: bool = False
    is_listening: bool = False
    is_resting: bool = False
    wake_word_active: bool = True
    camera_power_policy: PowerPolicy = PowerPolicy.LOW_POWER
    microphone_power_policy: PowerPolicy = PowerPolicy.LOW_POWER
    last_wake_timestamp: Optional[float] = None
    uptime_sec: float = 0.0
    active_user: str = "local_operator"
    lockout_remaining_sec: float = 0.0
