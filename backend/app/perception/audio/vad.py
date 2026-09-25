"""Voice Activity Detection (VAD) & Audio Chunk Buffer."""

import math
import struct
from typing import List, Optional, Tuple, Union
from pydantic import BaseModel, Field


class VADResult(BaseModel):
    is_speech: bool
    energy_level: float = 0.0
    energy_db: float = -60.0
    speech_confidence: float = 0.0
    speech_probability: float = 0.0
    chunk_ready: bool = False
    samples_count: int = 0


# Alias for backward compatibility
AudioVADState = VADResult


class VoiceActivityDetector:
    """Adaptive energy-based Voice Activity Detection and chunk segmentation."""

    def __init__(
        self,
        sample_rate: int = 16000,
        frame_duration_ms: int = 30,
        energy_threshold: float = -35.0,  # dB
        silence_timeout_ms: int = 600
    ):
        self.sample_rate = sample_rate
        self.frame_size = int(sample_rate * (frame_duration_ms / 1000.0))
        self.energy_threshold = energy_threshold
        self.silence_timeout_ms = silence_timeout_ms
        self.consecutive_silence_ms = 0
        self.is_currently_speaking = False
        self._audio_buffer: List[float] = []

    def compute_rms_energy(self, samples: List[float]) -> Tuple[float, float]:
        """Calculate Root Mean Square (RMS) energy and decibel (dB) level."""
        if not samples:
            return 0.0, -100.0
        sum_sq = sum(s * s for s in samples)
        rms = math.sqrt(sum_sq / len(samples))
        db = 20.0 * math.log10(max(rms, 1e-5))
        return rms, round(db, 2)

    def process_frame(self, frame_samples: List[float]) -> VADResult:
        """Process a 30ms audio frame and evaluate voice activity state."""
        rms, db = self.compute_rms_energy(frame_samples)
        frame_ms = (len(frame_samples) / self.sample_rate) * 1000.0

        is_voice_frame = db >= self.energy_threshold
        prob = min(1.0, max(0.0, (db + 60.0) / 40.0)) if is_voice_frame else 0.0
        chunk_ready = False

        if is_voice_frame:
            self.is_currently_speaking = True
            self.consecutive_silence_ms = 0
            self._audio_buffer.extend(frame_samples)
        elif self.is_currently_speaking:
            # Accumulating trailing silence
            self._audio_buffer.extend(frame_samples)
            self.consecutive_silence_ms += int(frame_ms)

            # Silence threshold exceeded -> finish utterance chunk
            if self.consecutive_silence_ms >= self.silence_timeout_ms:
                self.is_currently_speaking = False
                self.consecutive_silence_ms = 0
                chunk_ready = len(self._audio_buffer) >= (self.sample_rate * 0.3)  # At least 300ms

        return VADResult(
            is_speech=self.is_currently_speaking or is_voice_frame,
            energy_level=round(rms, 4),
            energy_db=db,
            speech_confidence=round(prob, 3),
            speech_probability=round(prob, 3),
            chunk_ready=chunk_ready,
            samples_count=len(self._audio_buffer)
        )

    def process_chunk(self, raw_bytes: bytes) -> VADResult:
        """Process raw 16-bit PCM byte buffer."""
        if len(raw_bytes) < 2:
            return VADResult(is_speech=False, energy_db=-100.0, speech_probability=0.0)
        
        # Convert 16-bit PCM bytes to normalized float [-1.0, 1.0]
        sample_count = len(raw_bytes) // 2
        fmt = f"<{sample_count}h"
        raw_samples = struct.unpack(fmt, raw_bytes[:sample_count * 2])
        float_samples = [s / 32768.0 for s in raw_samples]
        return self.process_frame(float_samples)

    def retrieve_buffered_chunk(self) -> List[float]:
        """Retrieve and flush the buffered speech utterance."""
        chunk = self._audio_buffer.copy()
        self._audio_buffer.clear()
        self.is_currently_speaking = False
        self.consecutive_silence_ms = 0
        return chunk


# Global VAD detector singleton
vad_detector = VoiceActivityDetector()
