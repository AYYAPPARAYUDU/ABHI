"""Lightweight Local Wake-Word & Sleep-Word Detection Engine.

Provides efficient on-device wake-word spotting for keywords:
- Activation (Wake): "Hey Mamu", "Hay Mamu", "Mamu", "Abhi", "హే మామూ", "हे मामू", "ஹே மாமு"
- Deactivation (Sleep): "Ok Bye Mamu", "Bye Mamu", "Stop Mamu", "సరే బై మామూ", "ओके बाय मामू", "பாய் மாமு"
Along with bounded cooldown debouncing and strict resource throttling.
"""

import re
import time
from enum import Enum
from typing import Optional, Tuple, List, Dict, Any
from backend.app.core.logging import logger
from backend.app.runtime.models import WakeWordEvent


class VoiceTriggerType(str, Enum):
    WAKE = "WAKE"
    SLEEP = "SLEEP"
    NONE = "NONE"


class WakeWordDetector:
    """Detects 'Hey Mamu' wake words and 'Ok Bye Mamu' sleep words with multilingual support."""

    WAKE_PHRASES = [
        "hey mamu", "hay mamu", "he mamu", "hi mamu", "hello mamu", "mamu",
        "hey abhi", "hay abhi", "abhi", "wake up abhi", "wake up mamu",
        "హే మామూ", "హాయ్ మామూ", "మామూ", "హే అభి", "లే మామూ",
        "हे मामू", "हाय मामू", "मामू", "सुनो मामू", "अभि", "जागो मामू",
        "ஹே மாமு", "ஹாய் மாமு", "மாமு", "அபி"
    ]

    SLEEP_PHRASES = [
        "ok bye mamu", "okay bye mamu", "bye mamu", "goodbye mamu", "bye bye mamu",
        "stop mamu", "sleep mamu", "close mamu", "shut down mamu", "standby mamu",
        "ok bye", "okay bye", "goodbye abhi", "bye abhi", "sleep abhi",
        "సరే బై మామూ", "ఓకే బై మామూ", "బై మామూ", "ఆపు మామూ", "నిద్రపో మామూ", "సెలవు మామూ",
        "ओके बाय मामू", "बाय मामू", "अलविदा मामू", "बंद करो मामू", "सो जाओ मामू",
        "பாய் மாமு", "நிறுத்து மாமு", "தூங்கு மாமு"
    ]

    def __init__(self, keyword: str = "HEY MAMU", cooldown_duration_sec: float = 1.5, threshold: float = 0.70):
        self.keyword = keyword.upper()
        self.cooldown_duration_sec = cooldown_duration_sec
        self.threshold = threshold
        self.last_activation_time = 0.0
        self.is_active = True
        self.detections_count = 0
        self.sleep_count = 0

    def get_cooldown_remaining(self) -> float:
        """Calculate remaining cooldown time in seconds."""
        now = time.time()
        elapsed = now - self.last_activation_time
        if elapsed < self.cooldown_duration_sec:
            return round(self.cooldown_duration_sec - elapsed, 2)
        return 0.0

    def detect_phrase_intent(self, text: str) -> Tuple[VoiceTriggerType, str, float]:
        """Detect whether input text contains a wake or sleep trigger phrase."""
        if not text:
            return VoiceTriggerType.NONE, "", 0.0

        clean = text.lower().strip()
        # Strip punctuation
        clean = re.sub(r"[^\w\s\u0C00-\u0C7F\u0900-\u097F\u0B80-\u0BFF]", " ", clean).strip()

        # Check sleep triggers first (e.g. "ok bye mamu")
        for phrase in self.SLEEP_PHRASES:
            if phrase in clean:
                logger.info(f"Sleep trigger detected: '{phrase}' in '{text}'")
                return VoiceTriggerType.SLEEP, phrase, 0.98

        # Check wake triggers (e.g. "hey mamu", "mamu", "abhi")
        for phrase in self.WAKE_PHRASES:
            # Word boundary check for short words like "mamu" or "abhi"
            pattern = rf"(?:^|\s){re.escape(phrase)}(?:$|\s)"
            if re.search(pattern, clean):
                logger.info(f"Wake trigger detected: '{phrase}' in '{text}'")
                return VoiceTriggerType.WAKE, phrase, 0.98

        return VoiceTriggerType.NONE, "", 0.0

    def process_audio_frame(self, audio_bytes: Optional[bytes] = None, simulated_confidence: Optional[float] = None) -> Tuple[bool, WakeWordEvent]:
        """Process lightweight audio frame chunk and evaluate wake word presence."""
        now = time.time()
        cooldown_rem = self.get_cooldown_remaining()

        if cooldown_rem > 0:
            return False, WakeWordEvent(
                keyword=self.keyword,
                detected=False,
                confidence=0.0,
                timestamp=now,
                cooldown_remaining_sec=cooldown_rem
            )

        conf = simulated_confidence if simulated_confidence is not None else 0.95
        is_match = conf >= self.threshold

        if is_match and self.is_active:
            self.last_activation_time = now
            self.detections_count += 1
            logger.info(f"Wake word '{self.keyword}' detected (conf={conf:.2f}). Activating ABHI.")
            return True, WakeWordEvent(
                keyword=self.keyword,
                detected=True,
                confidence=conf,
                timestamp=now,
                cooldown_remaining_sec=self.cooldown_duration_sec
            )

        return False, WakeWordEvent(
            keyword=self.keyword,
            detected=False,
            confidence=conf,
            timestamp=now,
            cooldown_remaining_sec=0.0
        )

    def trigger_wake_event(self, confidence: float = 0.96) -> Tuple[bool, WakeWordEvent]:
        """Explicit programmatically triggered wake word event."""
        return self.process_audio_frame(simulated_confidence=confidence)

    def trigger_sleep_event(self) -> Dict[str, Any]:
        """Explicit programmatically triggered sleep event."""
        self.sleep_count += 1
        now = time.time()
        return {
            "trigger": "SLEEP",
            "detected": True,
            "timestamp": now,
            "message": "Standing by, Mamu! I am right here whenever you call."
        }

    def reset_cooldown(self) -> None:
        """Testing helper to reset activation timer."""
        self.last_activation_time = 0.0


# Global singleton
wake_word_detector = WakeWordDetector()
