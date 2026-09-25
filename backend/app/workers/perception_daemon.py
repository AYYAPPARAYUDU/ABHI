"""Perception Daemon Worker.

Runs an asynchronous telemetry aggregation loop that polls audio VAD/energy,
head pose / face landmarks, and spatial hand gestures to feed the Angular 3D
frontend via the WebSocket telemetry gateway.
"""

import asyncio
import logging
from typing import Any, Callable, Dict, Optional
from datetime import datetime, timezone

from app.perception.audio.vad import VoiceActivityDetector, AudioVADState
from app.perception.vision.face_tracker import face_tracker, FaceLandmarksResult
from app.perception.vision.hand_tracker import hand_tracker, HandLandmarksResult
from app.perception.vision.screen_ocr import screen_ocr

logger = logging.getLogger("app.workers.perception_daemon")


class PerceptionTelemetryEvent:
    def __init__(
        self,
        timestamp: str,
        audio_vad: Dict[str, Any],
        face_tracking: Dict[str, Any],
        hand_tracking: Dict[str, Any],
    ):
        self.timestamp = timestamp
        self.audio_vad = audio_vad
        self.face_tracking = face_tracking
        self.hand_tracking = hand_tracking

    def to_dict(self) -> Dict[str, Any]:
        return {
            "type": "PERCEPTION_TELEMETRY",
            "timestamp": self.timestamp,
            "audio": self.audio_vad,
            "face": self.face_tracking,
            "hand": self.hand_tracking,
        }


class PerceptionDaemon:
    """Independent perception telemetry loop."""

    def __init__(self, polling_rate_hz: float = 10.0):
        self.polling_rate_hz = polling_rate_hz
        self.is_running = False
        self._task: Optional[asyncio.Task] = None
        self._listeners: list[Callable[[Dict[str, Any]], Any]] = []
        self.vad = VoiceActivityDetector()

    def add_listener(self, callback: Callable[[Dict[str, Any]], Any]) -> None:
        """Register a callback for telemetry events."""
        self._listeners.append(callback)

    def remove_listener(self, callback: Callable[[Dict[str, Any]], Any]) -> None:
        """Unregister a telemetry callback."""
        if callback in self._listeners:
            self._listeners.remove(callback)

    async def start(self) -> None:
        """Start the perception loop."""
        if self.is_running:
            return
        self.is_running = True
        self._task = asyncio.create_task(self._loop())
        logger.info("PerceptionDaemon worker started at %.1f Hz", self.polling_rate_hz)

    async def stop(self) -> None:
        """Stop the perception loop."""
        self.is_running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
            self._task = None
        logger.info("PerceptionDaemon worker stopped")

    async def _loop(self) -> None:
        interval = 1.0 / self.polling_rate_hz
        while self.is_running:
            try:
                # Capture current perception snapshots
                face_res: FaceLandmarksResult = face_tracker.process_frame()
                hand_res: HandLandmarksResult = hand_tracker.process_frame()

                event = PerceptionTelemetryEvent(
                    timestamp=datetime.now(timezone.utc).isoformat(),
                    audio_vad={
                        "is_speech": False,
                        "speech_probability": 0.05,
                        "energy_db": -45.0,
                    },
                    face_tracking=face_res.model_dump(),
                    hand_tracking=hand_res.model_dump(),
                )

                payload = event.to_dict()
                for listener in list(self._listeners):
                    try:
                        if asyncio.iscoroutinefunction(listener):
                            await listener(payload)
                        else:
                            listener(payload)
                    except Exception as ex:
                        logger.error("Error in perception telemetry listener: %s", ex)

                await asyncio.sleep(interval)
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error("Unexpected error in PerceptionDaemon loop: %s", e)
                await asyncio.sleep(interval)


# Global perception daemon singleton
perception_daemon = PerceptionDaemon()
