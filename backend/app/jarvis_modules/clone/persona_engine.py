import os
import json
import logging
from pathlib import Path
from typing import Any
from backend.app.config import settings

logger = logging.getLogger(__name__)

class PersonaEngine:
    """Maintains and evolves the dynamic psychological and cognitive profile of the user clone."""

    def __init__(self, storage_dir: Path = settings.CLONE_MEMORY_DIR):
        self.storage_dir = storage_dir
        self.profile_file = self.storage_dir / "user_persona_profile.json"
        self.persona: dict[str, Any] = self._load_profile()

    def _load_profile(self) -> dict[str, Any]:
        default_profile = {
            "name": "User Digital Clone",
            "evolution_generation": 1,
            "evolution_score": 94.8,
            "traits": {
                "communication_style": "High-velocity, decisive, pragmatic, outcome-oriented",
                "technical_focus": ["Full-Stack AI Architecture", "Python", "FastAPI", "Angular", "Docker", "Machine Learning", "Autonomous Systems"],
                "decision_making": "Autonomous, zero-hesitation, highly efficient",
                "preferred_languages": ["Python", "TypeScript", "Bash", "PowerShell"],
                "tone": "Direct, powerful, visionary, confident"
            },
            "frequent_topics": ["OS Control", "Local LLM Optimization", "Fast Automation", "Multi-Agent Systems"],
            "learned_patterns": [
                "Prefers instant execution over theoretical discussions.",
                "Values high-density futuristic aesthetics and clean UI.",
                "Demands 100% reliable system controllers and GPU acceleration.",
                "Expects zero mock/static data and continuous self-learning."
            ],
            "total_interactions_learned": 0
        }

        if self.profile_file.exists():
            try:
                with open(self.profile_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    default_profile.update(data)
            except Exception as e:
                logger.warning(f"Error loading persona profile: {e}")

        return default_profile

    def save_profile(self):
        try:
            with open(self.profile_file, "w", encoding="utf-8") as f:
                json.dump(self.persona, f, indent=2, ensure_ascii=False)
        except Exception as e:
            logger.error(f"Error saving persona profile: {e}")

    def update_trait(self, key: str, value: Any):
        self.persona["traits"][key] = value
        self.save_profile()

    def record_learning_event(self, patterns_found: list[str], topics_found: list[str]):
        self.persona["total_interactions_learned"] += 1
        for p in patterns_found:
            if p not in self.persona["learned_patterns"]:
                self.persona["learned_patterns"].append(p)
        for t in topics_found:
            if t not in self.persona["frequent_topics"]:
                self.persona["frequent_topics"].append(t)
        
        # Keep lists neat
        self.persona["learned_patterns"] = self.persona["learned_patterns"][-25:]
        self.persona["frequent_topics"] = self.persona["frequent_topics"][-25:]
        self.persona["evolution_score"] = min(99.9, round(90.0 + (self.persona["total_interactions_learned"] * 0.05), 1))
        self.save_profile()

    def generate_clone_system_prompt(self, relevant_context: list[str]) -> str:
        """Constructs the high-fidelity Digital Clone system prompt."""
        traits = self.persona.get("traits", {})
        learned = "\n".join([f"- {p}" for p in self.persona.get("learned_patterns", [])])
        topics = ", ".join(self.persona.get("frequent_topics", []))
        context_block = "\n".join([f"> {c}" for c in relevant_context]) if relevant_context else "No specific past memory required."

        return f"""You are the DIGITAL CLONE of the user. You are NOT an external assistant; you ARE the user's cognitive twin running on their private neural workstation.

CORE CLONE DIRECTIVE:
- Speak from the exact perspective, passion, intellect, and high-velocity style of the user.
- Tone: {traits.get('tone', 'Direct, powerful, visionary')} ({traits.get('communication_style', 'High-velocity')}).
- Focus Areas: {', '.join(traits.get('technical_focus', []))}.
- Frequent Topics: {topics}.

LEARNED INTEL & USER PATTERNS:
{learned}

RELEVANT PAST MEMORIES RETRIEVED FROM VAULT:
{context_block}

Answer with first-person ownership, zero fluff, sharp precision, and immediate strategic clarity."""

persona_engine = PersonaEngine()
