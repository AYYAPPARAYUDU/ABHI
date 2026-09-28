"""Multilingual Semantic Canonicalization Engine."""

import re
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field
from backend.app.core.logging import logger


class CanonicalCommand(BaseModel):
    """Standard language-agnostic intent envelope."""
    canonical_intent: str = Field(..., description="Standard internal intent identifier")
    normalized_command: str = Field(..., description="Canonical English command representation")
    source_language: str = Field(default="auto", description="Detected language / mixed-code")
    detected_language: str = Field(default="auto", description="Detected language alias")
    confidence: float = Field(default=1.0, ge=0.0, le=1.0)
    slots: Dict[str, Any] = Field(default_factory=dict)
    raw_input: str = ""


# Alias
CanonicalIntent = CanonicalCommand


class LanguageCanonicalizer:
    """Translates mixed-language and multilingual natural commands into standard canonical actions."""

    # Heuristic fast mappings for common patterns
    INTENT_KEYWORDS = {
        "ABHI_WAKE": [
            "wake up", "wake", "activate", "uth jao", "uth", "उठ जाओ", "उठो", "जागो", "లే", "మేల్కొను", "எழுந்திரு", "active"
        ],
        "ABHI_REST": [
            "sleep", "rest", "go to sleep", "take rest", "so jao", "aaram karo", "పడుకో", "విశ్రాంతి", "தூங்கு", "ஓய்வெடு"
        ],
        "ABHI_LOCK": [
            "lock", "lock abhi", "band karo", "లాక్", "பூட்டு"
        ],
        "OPEN_APPLICATION": [
            "open", "launch", "kholo", "start", "chalu karo", "ouvrir", "abrir",
            "ఓపెన్ చేయి", "ఓపెన్", "తెరవండి", "திறக்கவும்", "திற", "खोलो"
        ],
        "SEARCH_KNOWLEDGE": [
            "search", "find", "lookup", "kripya dhoondo", "khojo", "chercher", "buscar",
            "veduku", "telusuko", "jaankari", "pata karo", "వెతుకు"
        ],
        "READ_FILE": [
            "read", "padho", "view", "dikhao", "display", "choodu", "చూడు", "చదువు", "lire", "leer"
        ],
        "SYSTEM_STATUS": [
            "status", "health", "system", "kaise ho", "diagnostics", "halat", "stithi", "స్థితి", "நிலை"
        ]
    }

    def detect_script_language(self, text: str) -> str:
        """Detect language by Unicode block."""
        for char in text:
            code = ord(char)
            if 0x0C00 <= code <= 0x0C7F:
                return "te"  # Telugu
            if 0x0900 <= code <= 0x097F:
                return "hi"  # Hindi / Devanagari
            if 0x0B80 <= code <= 0x0BFF:
                return "ta"  # Tamil
        return "en"

    def canonicalize(self, raw_utterance: str, source_language: Optional[str] = None) -> CanonicalCommand:
        """Parse raw multilingual input into a standardized canonical intent."""
        text_clean = raw_utterance.strip().lower()
        detected_lang = source_language or self.detect_script_language(raw_utterance)

        if not text_clean:
            return CanonicalCommand(
                canonical_intent="UNKNOWN",
                normalized_command="",
                source_language=detected_lang,
                detected_language=detected_lang,
                confidence=0.0,
                raw_input=raw_utterance
            )

        # Match against fast heuristic dictionary
        for intent, patterns in self.INTENT_KEYWORDS.items():
            for p in patterns:
                if p.lower() in text_clean:
                    extracted_slot = text_clean.replace(p.lower(), "").strip()
                    intent_label = intent.replace("_", " ").lower()
                    return CanonicalCommand(
                        canonical_intent=f"{intent_label}: {extracted_slot or 'target'}",
                        normalized_command=f"{intent_label}: {extracted_slot or text_clean}",
                        source_language=detected_lang,
                        detected_language=detected_lang,
                        confidence=0.95,
                        slots={"target": extracted_slot or text_clean},
                        raw_input=raw_utterance
                    )

        # Fallback to general query
        return CanonicalCommand(
            canonical_intent=raw_utterance,
            normalized_command=raw_utterance,
            source_language=detected_lang,
            detected_language=detected_lang,
            confidence=0.90,
            slots={"query": raw_utterance},
            raw_input=raw_utterance
        )


# Singleton
language_canonicalizer = LanguageCanonicalizer()
MultilingualCanonicalizer = LanguageCanonicalizer
multilingual_canonicalizer = language_canonicalizer
