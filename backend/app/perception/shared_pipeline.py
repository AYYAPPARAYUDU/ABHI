"""ABHI Sovereign Shared Voice & Multimodal Perception Pipeline.

Unified input gateway:
Microphone / Text / Screen / Gesture
-> Shared Input Gateway
-> Perception Event Bus
-> Conversation Context
-> LLM Council & Model Negotiation
-> CentralSupervisor & Agent Swarm
-> Execution & Verification -> Response

Single input capture prevents redundant mic listeners and guarantees
synchronized state across all agents and models.
"""

import asyncio
import time
import uuid
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

from backend.app.core.logging import logger
from backend.app.core.event_bus import event_bus, ABHIEvent, EventCategory
from backend.app.perception.audio.canonicalizer import language_canonicalizer, CanonicalCommand
from backend.app.automation.desktop.dialogue_state_tracker import dialogue_state


class InputSourceType(str, Enum):
    VOICE = "VOICE"
    TEXT = "TEXT"
    SCREEN = "SCREEN"
    GESTURE = "GESTURE"


class PerceptionInputEnvelope(BaseModel):
    input_id: str = Field(default_factory=lambda: f"in_{uuid.uuid4().hex[:10]}")
    session_id: str
    source_type: InputSourceType
    raw_utterance: str
    normalized_command: str
    canonical_intent: str
    detected_language: str
    speaker_id: str = "Ayyappa Rayudu (Mamu)"
    resolved_entity: Optional[str] = None
    confidence: float = 1.0
    timestamp: float = Field(default_factory=time.time)
    metadata: Dict[str, Any] = Field(default_factory=dict)


class SharedPerceptionPipeline:
    """Authoritative singleton input gateway capturing voice, text, screen and gesture events."""

    def __init__(self):
        self._active_session_id: str = "default_mamu_session"
        self._input_history: List[PerceptionInputEnvelope] = []
        self._is_speaking: bool = False
        self._active_cancellation_hook = None
        # Capability-based subscription filters: maps capability to permitted agents/roles
        self._capability_filters: Dict[str, List[str]] = {
            "VOICE_INPUT": ["master_orchestrator", "speech_engine", "dialogue_tracker"],
            "TEXT_INPUT": ["master_orchestrator", "dialogue_tracker", "code_agent", "rag_agent"],
            "SCREEN_INPUT": ["aura_vision", "ocr_agent", "verifier_agent"],
            "GESTURE_INPUT": ["hand_tracker", "safety_killswitch"]
        }

    async def intake_input(
        self,
        raw_text: str,
        source_type: InputSourceType = InputSourceType.TEXT,
        speaker_id: str = "Ayyappa Rayudu (Mamu)",
        session_id: Optional[str] = None,
        language_hint: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> PerceptionInputEnvelope:
        """Process any incoming multimodal input once and broadcast to shared event bus."""
        sess_id = session_id or self._active_session_id
        self._active_session_id = sess_id
        cleaned_raw = (raw_text or "").strip()

        # 1. Multilingual Canonicalization (Telugu, Hindi, Tamil, English, Mixed)
        canonical: CanonicalCommand = language_canonicalizer.canonicalize(
            cleaned_raw,
            source_language=language_hint or "auto"
        )

        # Normalize canonical intent to base uppercase token (e.g. "open application: notepad" -> "OPEN_APPLICATION")
        raw_intent = canonical.canonical_intent
        base_intent = raw_intent.split(":")[0].strip().upper().replace(" ", "_")

        # 2. Pronoun & Follow-Up Contextual Resolution (e.g., 'play it', 'pause that')
        resolved_entity = dialogue_state.resolve_demonstrative_pronoun(cleaned_raw)
        if not resolved_entity and canonical.slots.get("target"):
            resolved_entity = canonical.slots["target"]

        merged_meta: Dict[str, Any] = {"slots": canonical.slots}
        if metadata:
            merged_meta.update(metadata)

        envelope = PerceptionInputEnvelope(
            session_id=sess_id,
            source_type=source_type,
            raw_utterance=cleaned_raw,
            normalized_command=canonical.normalized_command,
            canonical_intent=base_intent,
            detected_language=canonical.source_language,
            speaker_id=speaker_id,
            resolved_entity=resolved_entity,
            confidence=canonical.confidence,
            metadata=merged_meta,
        )

        self._input_history.append(envelope)
        if len(self._input_history) > 100:
            self._input_history.pop(0)

        # 3. Synchronize Dialogue State Tracker
        dialogue_state.record_action(
            action_type=canonical.canonical_intent,
            target_entity=resolved_entity or canonical.normalized_command
        )

        # 4. Broadcast to Shared Event Bus
        # A. Perception event
        perc_evt = ABHIEvent(
            category=EventCategory.PERCEPTION,
            event_type=f"input_{source_type.value.lower()}",
            source="SharedPerceptionPipeline",
            correlation_id=envelope.input_id,
            data=envelope.model_dump()
        )
        await event_bus.publish(perc_evt)

        # B. Conversation event
        conv_evt = ABHIEvent(
            category=EventCategory.CONVERSATION,
            event_type="user_utterance",
            source="SharedPerceptionPipeline",
            correlation_id=envelope.input_id,
            data={
                "input_id": envelope.input_id,
                "session_id": sess_id,
                "speaker_id": speaker_id,
                "raw_text": envelope.raw_utterance,
                "normalized": envelope.normalized_command,
                "intent": envelope.canonical_intent,
                "language": envelope.detected_language,
                "resolved_entity": envelope.resolved_entity
            }
        )
        await event_bus.publish(conv_evt)

        logger.info(
            f"SharedPerceptionPipeline intook {source_type.value}: '{raw_text}' "
            f"-> [{canonical.canonical_intent}] '{canonical.normalized_command}' "
            f"(Lang: {canonical.source_language})"
        )
        return envelope

    def get_latest_input(self) -> Optional[PerceptionInputEnvelope]:
        return self._input_history[-1] if self._input_history else None

    def clear(self) -> None:
        self._input_history.clear()


# Global singleton
shared_perception_pipeline = SharedPerceptionPipeline()
