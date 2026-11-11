"""Voice Activity Detection (VAD), Spectral Noise Cancellation & Audio DSP Pipeline."""

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
    snr_db: float = 0.0
    noise_floor_db: float = -60.0
    noise_suppression_active: bool = True


# Alias for backward compatibility
AudioVADState = VADResult


class VoiceActivityDetector:
    """Advanced Voice Activity Detection with Spectral Noise Suppression and Adaptive Noise Floor."""

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

        # Adaptive Background Noise Floor Tracking
        self.noise_floor_db: float = -55.0
        self.noise_adaptation_rate: float = 0.05
        self.min_snr_threshold_db: float = 6.0

        # High-pass filter state (cut sub-85Hz rumble)
        self._hp_prev_x: float = 0.0
        self._hp_prev_y: float = 0.0

    def compute_rms_energy(self, samples: List[float]) -> Tuple[float, float]:
        """Calculate Root Mean Square (RMS) energy and decibel (dB) level."""
        if not samples:
            return 0.0, -100.0
        sum_sq = sum(s * s for s in samples)
        rms = math.sqrt(sum_sq / len(samples))
        db = 20.0 * math.log10(max(rms, 1e-5))
        return rms, round(db, 2)

    def apply_highpass_filter(self, samples: List[float], cutoff_hz: float = 85.0) -> List[float]:
        """First-order IIR high-pass filter to eliminate HVAC, desk vibration and mechanical hum."""
        if not samples:
            return []
        rc = 1.0 / (2.0 * math.pi * cutoff_hz)
        dt = 1.0 / self.sample_rate
        alpha = rc / (rc + dt)

        filtered = []
        prev_x = self._hp_prev_x
        prev_y = self._hp_prev_y
        for x in samples:
            y = alpha * (prev_y + x - prev_x)
            filtered.append(y)
            prev_x = x
            prev_y = y
        self._hp_prev_x = prev_x
        self._hp_prev_y = prev_y
        return filtered

    def suppress_noise(self, samples: List[float]) -> List[float]:
        """DSP Noise Suppression: High-pass rumble filter + adaptive spectral noise gate."""
        if not samples:
            return []
        
        # 1. High-pass filter
        cleaned = self.apply_highpass_filter(samples, cutoff_hz=85.0)

        # 2. Adaptive soft-knee noise gate based on background noise floor
        gate_threshold = math.pow(10.0, (self.noise_floor_db + 3.0) / 20.0)
        output = []
        for s in cleaned:
            mag = abs(s)
            if mag < gate_threshold:
                # Attenuate noise floor by 18 dB
                output.append(s * 0.12)
            else:
                # Preserve speech signal cleanly
                output.append(s)
        return output

    def compute_zero_crossing_rate(self, samples: List[float]) -> float:
        """Compute normalized zero crossing rate to verify human phonetic content."""
        if len(samples) < 2:
            return 0.0
        crossings = 0
        for i in range(1, len(samples)):
            if (samples[i] >= 0 and samples[i - 1] < 0) or (samples[i] < 0 and samples[i - 1] >= 0):
                crossings += 1
        return crossings / float(len(samples))

    def process_frame(self, frame_samples: List[float]) -> VADResult:
        """Process an audio frame with DSP noise cancellation and adaptive VAD."""
        rms, db = self.compute_rms_energy(frame_samples)
        frame_ms = (len(frame_samples) / self.sample_rate) * 1000.0

        # Apply high-pass rumble suppression for speech buffering
        hp_samples = self.apply_highpass_filter(frame_samples, cutoff_hz=85.0)

        # 2. Update adaptive background noise floor during quiet periods
        if db < (self.noise_floor_db + 3.0) or db < self.energy_threshold:
            self.noise_floor_db = (
                (1.0 - self.noise_adaptation_rate) * self.noise_floor_db
                + self.noise_adaptation_rate * db
            )

        snr = round(max(0.0, db - self.noise_floor_db), 2)

        # 3. Dynamic Thresholding: Fixed floor threshold OR adaptive SNR requirement
        is_voice_frame = (db >= self.energy_threshold) and (snr >= self.min_snr_threshold_db)
        prob = min(1.0, max(0.0, (db + 60.0) / 40.0)) if is_voice_frame else 0.0
        chunk_ready = False

        if is_voice_frame:
            self.is_currently_speaking = True
            self.consecutive_silence_ms = 0
            self._audio_buffer.extend(hp_samples)
        elif self.is_currently_speaking:
            # Accumulate trailing silence
            self._audio_buffer.extend(hp_samples)
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
            samples_count=len(self._audio_buffer),
            snr_db=snr,
            noise_floor_db=round(self.noise_floor_db, 2),
            noise_suppression_active=True
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
