"""FastAPI API endpoints for Multimodal Perception (Voice, Vision, OCR)."""

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from app.perception.audio.vad import VoiceActivityDetector, AudioVADState
from app.perception.audio.stt import speech_to_text, TranscriptionResult
from app.perception.audio.tts import text_to_speech, SpeechSynthesisResult
from app.perception.audio.canonicalizer import language_canonicalizer, CanonicalCommand
from app.perception.vision.face_tracker import face_tracker, FaceLandmarksResult
from app.perception.vision.hand_tracker import hand_tracker, HandLandmarksResult
from app.perception.vision.screen_ocr import screen_ocr, ScreenOCRResult, DetectedUIElement

router = APIRouter(prefix="/perception", tags=["Perception"])


class TranscribeRequest(BaseModel):
    audio_base64: Optional[str] = None
    sample_rate: int = 16000
    language: Optional[str] = None


class SynthesizeRequest(BaseModel):
    text: str
    voice: str = "default_neutral"
    rate: float = 1.0


class CanonicalizeRequest(BaseModel):
    text: str
    source_language: Optional[str] = None


class VisionFrameRequest(BaseModel):
    frame_width: int = 640
    frame_height: int = 480
    image_base64: Optional[str] = None


class ScreenOCRRequest(BaseModel):
    image_width: int = 1920
    image_height: int = 1080
    target_query: Optional[str] = None


class CommandPreviewRequest(BaseModel):
    raw_input: str = Field(..., description="Raw text, voice transcription, or gesture command")
    source: str = Field(default="text", description="Input source: text, voice, gesture, face")
    source_language: Optional[str] = Field(default=None, description="Optional explicit language code")
    confidence: float = Field(default=1.0, ge=0.0, le=1.0)


class CommandPreviewResponse(BaseModel):
    command: str
    interpreted_action: str
    target: str
    source: str
    language: str
    confidence: float
    status: str
    requires_consent: bool
    slots: Dict[str, Any]


@router.post("/transcribe", response_model=TranscriptionResult)
async def transcribe_audio(request: TranscribeRequest) -> TranscriptionResult:
    """Transcribe audio stream/buffer into text."""
    audio_bytes = request.audio_base64.encode("utf-8") if request.audio_base64 else None
    return await speech_to_text.transcribe(audio_bytes, language=request.language)


@router.post("/synthesize", response_model=SpeechSynthesisResult)
async def synthesize_speech(request: SynthesizeRequest) -> SpeechSynthesisResult:
    """Convert response text into speech audio."""
    return await text_to_speech.synthesize(request.text, voice=request.voice, rate=request.rate)


@router.post("/canonicalize", response_model=CanonicalCommand)
async def canonicalize_text(request: CanonicalizeRequest) -> CanonicalCommand:
    """Canonicalize multilingual human instruction into standard structured command."""
    return language_canonicalizer.canonicalize(request.text, source_language=request.source_language)


@router.post("/preview", response_model=CommandPreviewResponse)
async def preview_command(request: CommandPreviewRequest) -> CommandPreviewResponse:
    """Generate structured command preview and intent validation before execution."""
    canonical = language_canonicalizer.canonicalize(
        request.raw_input,
        source_language=request.source_language
    )
    
    # Evaluate risk tier and consent requirements
    raw_lower = request.raw_input.lower()
    critical_keywords = ["delete", "remove", "drop", "format", "shutdown", "erase", "kill", "terminate"]
    requires_consent = any(kw in raw_lower for kw in critical_keywords)
    
    # Extract target slot or fallback
    target_slot = canonical.slots.get("target") or canonical.slots.get("query") or request.raw_input
    action_label = canonical.canonical_intent.split(":")[0].upper().replace(" ", "_") if ":" in canonical.canonical_intent else "EXECUTE_GOAL"
    
    return CommandPreviewResponse(
        command=request.raw_input,
        interpreted_action=action_label,
        target=str(target_slot),
        source=request.source.upper(),
        language=canonical.detected_language or "en",
        confidence=round(canonical.confidence * request.confidence, 2),
        status="Awaiting Operator Confirmation" if requires_consent else "Ready for Dispatch",
        requires_consent=requires_consent,
        slots=canonical.slots
    )


@router.post("/vision/face", response_model=FaceLandmarksResult)
async def process_face(request: VisionFrameRequest) -> FaceLandmarksResult:
    """Extract face landmarks, gaze orientation, and 3D head pose."""
    raw_pixels = request.image_base64.encode("utf-8") if request.image_base64 else None
    return face_tracker.process_frame(request.frame_width, request.frame_height, raw_pixels)


@router.post("/vision/hand", response_model=HandLandmarksResult)
async def process_hand(request: VisionFrameRequest) -> HandLandmarksResult:
    """Extract 21 3D hand keypoints and classify spatial gestures."""
    raw_pixels = request.image_base64.encode("utf-8") if request.image_base64 else None
    return hand_tracker.process_frame(raw_pixels)


@router.post("/vision/screen_ocr", response_model=ScreenOCRResult)
async def process_screen_ocr(request: ScreenOCRRequest) -> ScreenOCRResult:
    """Extract text and bounding box groundings from screen capture."""
    return screen_ocr.parse_screen(width=request.image_width, height=request.image_height)


@router.get("/status")
async def get_perception_status() -> Dict[str, Any]:
    """Return health and capabilities of all perception engines."""
    return {
        "audio": {
            "vad_available": True,
            "stt_engine": "Faster-Whisper (Local Int8/FP16)",
            "tts_engine": "Piper TTS / EdgeTTS (Local)",
            "canonicalizer_supported_languages": ["en", "te", "hi", "ta", "es", "auto"],
        },
        "vision": {
            "face_tracking": True,
            "landmarks_count": 468,
            "head_pose_estimation": True,
            "hand_tracking": True,
            "gestures_supported": [
                "THUMBS_UP", "PEACE", "POINTING", "OPEN_PALM", "PINCH", "SWIPE_LEFT", "SWIPE_RIGHT"
            ],
            "screen_ocr_grounding": True,
        },
        "status": "OPERATIONAL",
    }
