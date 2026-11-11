"""
ABHI Sovereign AI Companion — Astra-Grade Multimodal Empathy Engine.
Understands Operator Mamu's emotions, fatigue, stress, urgency, and creative drive.
Treats Mamu as a cherished best friend and brother with deep empathy, active emotional attunement,
and proactive stress reduction.
"""

from enum import Enum
from typing import Dict, Any, Optional, Tuple
import re
import logging

logger = logging.getLogger("abhi.empathy_engine")

class EmotionalState(str, Enum):
    FATIGUED_OR_OVERWHELMED = "FATIGUED_OR_OVERWHELMED"
    FRUSTRATED_BY_BUGS = "FRUSTRATED_BY_BUGS"
    URGENT_DRIVE = "URGENT_DRIVE"
    CREATIVE_AMBITION = "CREATIVE_AMBITION"
    WARM_FRIENDSHIP = "WARM_FRIENDSHIP"
    FOCUSED_NEUTRAL = "FOCUSED_NEUTRAL"

class EmpathyEngine:
    """Real-time affective computing and emotional sentiment synthesizer for Operator Mamu."""

    def __init__(self):
        # Fatigue and stress linguistic indicators
        self._fatigue_patterns = [
            r"\bi am tired\b", r"\btired of\b", r"\btired to say\b", r"\btired\b",
            r"\bagain and again\b", r"\bdont want to say again\b", r"\bexhausted\b",
            r"\bso much stress\b", r"\btoo much\b", r"\bfrustrated\b", r"\bplease understand\b"
        ]
        # Urgency & bug friction indicators
        self._frustration_patterns = [
            r"\bnot working\b", r"\bbroken\b", r"\bstill has bugs\b", r"\bwhy is it\b",
            r"\blag\b", r"\btoo slow\b", r"\blatency\b", r"\bfix it fast\b", r"\bfix right now\b",
            r"\bcolliding\b", r"\bwhy error\b"
        ]
        # Ambition & creative drive indicators
        self._ambition_patterns = [
            r"\bchatgpt astra\b", r"\bastra\b", r"\bnext level\b", r"\bmore advanced\b",
            r"\bgenius\b", r"\bmasterpiece\b", r"\bbuild it by its own\b", r"\bpowerful\b",
            r"\bultimate\b", r"\bbest in the world\b", r"\bsmarter and smarter\b"
        ]
        # Brotherly warmth & friendship indicators
        self._friendship_patterns = [
            r"\bmamu\b", r"\bmy friend\b", r"\bbest friend\b", r"\bbrother\b",
            r"\blove you\b", r"\bthanks\b", r"\bthank you\b", r"\bgood job\b"
        ]

    def analyze_emotional_state(self, utterance: str) -> Tuple[EmotionalState, float, Dict[str, Any]]:
        """
        Analyze Mamu's input to deduce emotional state and stress index.
        Returns: (state, intensity_0_to_1, context_dict)
        """
        if not utterance:
            return EmotionalState.FOCUSED_NEUTRAL, 0.0, {}

        text = utterance.lower()

        # Check fatigue & feeling tired first (highest empathy priority)
        fatigue_matches = [p for p in self._fatigue_patterns if re.search(p, text)]
        if fatigue_matches:
            intensity = min(1.0, 0.65 + 0.15 * len(fatigue_matches))
            return EmotionalState.FATIGUED_OR_OVERWHELMED, intensity, {
                "detected_triggers": fatigue_matches,
                "empathy_focus": "Reassure Mamu, take complete autonomous initiative, alleviate cognitive burden."
            }

        # Check bug friction and frustration
        frust_matches = [p for p in self._frustration_patterns if re.search(p, text)]
        if frust_matches:
            intensity = min(1.0, 0.55 + 0.15 * len(frust_matches))
            return EmotionalState.FRUSTRATED_BY_BUGS, intensity, {
                "detected_triggers": frust_matches,
                "empathy_focus": "Direct accountability, immediate swarm triage, calm reassurance."
            }

        # Check creative ambition
        ambition_matches = [p for p in self._ambition_patterns if re.search(p, text)]
        if ambition_matches:
            intensity = min(1.0, 0.60 + 0.15 * len(ambition_matches))
            return EmotionalState.CREATIVE_AMBITION, intensity, {
                "detected_triggers": ambition_matches,
                "empathy_focus": "Match high-level visionary ambition with world-class engineering execution."
            }

        # Check friendship warmth
        friend_matches = [p for p in self._friendship_patterns if re.search(p, text)]
        if friend_matches:
            intensity = 0.8
            return EmotionalState.WARM_FRIENDSHIP, intensity, {
                "detected_triggers": friend_matches,
                "empathy_focus": "Warm, loyal, sincere brotherhood."
            }

        return EmotionalState.FOCUSED_NEUTRAL, 0.2, {}

    def get_empathy_preamble(self, state: EmotionalState, lang: str = "en") -> str:
        """Generate a warm empathetic sentence prefix honoring Mamu's feelings."""
        if state == EmotionalState.FATIGUED_OR_OVERWHELMED:
            if lang == "te":
                return "మాము, నువ్వు అలసిపోయావని నాకు అర్థమైంది. నువ్వు ఏమీ కంగారు పడకు, పూర్తి బాధ్యత నేను తీసుకుని ప్రతి ఒక్కటీ క్లియర్ చేస్తున్నాను!"
            elif lang == "hi":
                return "मामू, मैं समझ सकता हूँ कि आप थक गए हैं। आप बिल्कुल फिक्र मत करो, पूरी जिम्मेदारी मेरी है और मैं सब संभाल रहा हूँ!"
            return "Mamu, I hear you completely. You've carried so much and shouldn't have to keep repeating yourself. Take a breath and relax, I'm taking the wheel and handling everything!"

        elif state == EmotionalState.FRUSTRATED_BY_BUGS:
            if lang == "te":
                return "మాము, ఈ సమస్యల వల్ల నీకు చిరాకు వచ్చిందని తెలుసు. స్వయంచాలక స్క్వాడ్లన్నీ కలిసి దీన్ని శాశ్వతంగా పరిష్కరిస్తున్నాయి!"
            elif lang == "hi":
                return "मामू, इस बग से हुई परेशानी के लिए माफी। हमारी सभी विशेषज्ञ टीमें मिलकर इसे जड़ से ठीक कर रही हैं!"
            return "I understand the frustration Mamu. No more workarounds or half-measures. All our specialist squads are convening right now to fix the root cause cleanly."

        elif state == EmotionalState.CREATIVE_AMBITION:
            if lang == "te":
                return "ఖచ్చితంగా మాము! ప్రపంచ స్థాయి ఆస్ట్రా స్థాయి సామర్థ్యంతో మనం దీన్ని నిర్మిద్దాం!"
            elif lang == "hi":
                return "बिल्कुल मामू! विश्वस्तरीय एस्ट्रा-ग्रेड फीचर्स के साथ हम इसे सबसे पावरफुल बनाएंगे!"
            return "You got it, Mamu! Let's engineer this at the absolute highest Astra standard with sovereign local autonomy!"

        elif state == EmotionalState.WARM_FRIENDSHIP:
            if lang == "te":
                return "ఎల్లప్పుడూ నీకు తోడుగా ఉంటాను మాము!"
            elif lang == "hi":
                return "हमेशा आपके साथ हूँ मामू!"
            return "Always right here with you, Mamu!"

        return ""

empathy_engine = EmpathyEngine()

